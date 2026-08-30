interface Env {
  DB: D1Database;
  IMAGES: R2Bucket;
}

interface ContentRow {
  id: string;
  title: string;
  type: string;
  audio_url: string | null;
  created_at: string;
}

const EXT_TO_MIME: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.mp4': 'audio/mp4',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
};

function extensionFor(pathname: string): string {
  const match = pathname.toLowerCase().match(/\.(mp3|m4a|mp4|wav|ogg|opus|flac|aac)$/);
  return match ? `.${match[1]}` : '.mp3';
}

// Dashes, curly quotes and other typographic characters that files should not carry.
const FANCY_DASHES = /[‐-―−]/g;
const FANCY_SINGLE_QUOTES = /[‘’‛]/g;
const FANCY_DOUBLE_QUOTES = /[“”‟]/g;
const NON_ASCII = /[^ -~]/g;
const PATH_UNSAFE = /[\\/:*?"<>|]/g;

/** ASCII-only fallback name for the plain filename= parameter. */
function asciiFilename(name: string): string {
  return name
    .replace(FANCY_DASHES, '-')
    .replace(FANCY_SINGLE_QUOTES, "'")
    .replace(FANCY_DOUBLE_QUOTES, '"')
    .normalize('NFKD')
    .replace(NON_ASCII, '')
    .replace(PATH_UNSAFE, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90)
    .replace(/[ .-]+$/, '');
}

/** Unicode-preserving name for filename*, minus anything a filesystem rejects. */
function utf8Filename(name: string): string {
  return name
    .replace(PATH_UNSAFE, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
    .replace(/[ .-]+$/, '');
}

/**
 * Map one of our own audio URLs back to its R2 key so we can stream straight
 * from the bucket instead of making a loopback HTTP request.
 *   /api/audio/foo.mp3          -> audio/foo.mp3
 *   /api/images/audio/x/foo.mp3 -> audio/x/foo.mp3
 */
function r2KeyFor(audioUrl: URL, requestHost: string): string | null {
  const sameOrigin =
    audioUrl.hostname === requestHost || audioUrl.hostname === 'atlas-library.pages.dev';
  if (!sameOrigin) return null;

  const path = decodeURIComponent(audioUrl.pathname);
  if (path.startsWith('/api/audio/')) return `audio/${path.slice('/api/audio/'.length)}`;
  if (path.startsWith('/api/images/')) return path.slice('/api/images/'.length);
  if (path.startsWith('/api/img/')) return path.slice('/api/img/'.length);
  return null;
}

/**
 * A download is opened by navigating, so a failure lands on a real page.
 * Browsers get something readable; anything else gets JSON.
 */
function problem(status: number, message: string, request: Request): Response {
  const wantsHtml = (request.headers.get('Accept') || '').includes('text/html');
  if (!wantsHtml) {
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const escaped = message.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Download unavailable</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#171310;color:#f4eee4;
       font-family:ui-sans-serif,system-ui,sans-serif;padding:2rem;text-align:center}
  p{max-width:32rem;line-height:1.6;color:#b0a395}
  h1{font-family:Georgia,serif;font-weight:600;font-size:1.6rem;margin:0 0 .75rem}
  a{color:#f0a342}
</style></head><body><div>
<h1>That audio could not be fetched</h1>
<p>${escaped}</p>
<p><a href="/">Back to the library</a></p>
</div></body></html>`;

  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// GET /api/download/:id - the item's audio, as a file save with a readable name.
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string;
  const requestUrl = new URL(context.request.url);

  const row = await context.env.DB.prepare(
    'SELECT id, title, type, audio_url, created_at FROM content WHERE id = ?'
  )
    .bind(id)
    .first<ContentRow>();

  if (!row) {
    return problem(404, 'That item is not in the archive.', context.request);
  }

  if (!row.audio_url) {
    return problem(
      404,
      'This item has no audio yet. Open it in the library and generate narration first.',
      context.request
    );
  }

  let audioUrl: URL;
  try {
    audioUrl = new URL(row.audio_url, requestUrl.origin);
  } catch {
    return problem(502, 'The audio location stored for this item is not a valid URL.', context.request);
  }

  const ext = extensionFor(audioUrl.pathname);
  const datePrefix = (row.created_at || '').slice(0, 10);
  const baseName = datePrefix ? `${datePrefix} ${row.title}` : row.title;
  const ascii = `${asciiFilename(baseName) || 'atlas-audio'}${ext}`;
  const unicode = encodeURIComponent(`${utf8Filename(baseName) || 'atlas-audio'}${ext}`);

  const headers = new Headers();
  headers.set('Content-Type', EXT_TO_MIME[ext] || 'audio/mpeg');
  headers.set('Content-Disposition', `attachment; filename="${ascii}"; filename*=UTF-8''${unicode}`);
  headers.set('Cache-Control', 'private, max-age=3600');
  headers.set('X-Content-Type-Options', 'nosniff');

  // Fast path: it lives in our own R2 bucket.
  const key = r2KeyFor(audioUrl, requestUrl.hostname);
  if (key) {
    const object = await context.env.IMAGES.get(key);
    if (object) {
      headers.set('Content-Length', object.size.toString());
      headers.set('ETag', object.etag);
      return new Response(object.body, { headers });
    }
    // Fall through - the row may point at an object served from somewhere else.
  }

  // Slow path: an external host (Echo Studio, Treblo, ...). Stream it through.
  const upstream = await fetch(audioUrl.toString(), {
    headers: { Accept: 'audio/*,*/*' },
  });

  if (!upstream.ok || !upstream.body) {
    return problem(
      502,
      `The file is hosted outside the library and the host answered ${upstream.status}. The original link has probably expired.`,
      context.request
    );
  }

  const upstreamLength = upstream.headers.get('Content-Length');
  if (upstreamLength) headers.set('Content-Length', upstreamLength);

  return new Response(upstream.body, { headers });
};
