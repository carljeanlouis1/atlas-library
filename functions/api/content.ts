interface Env {
  DB: D1Database;
  ATLAS_API_KEY: string;
}

interface ContentRequest {
  type: 'text' | 'audio' | 'debate' | 'brief';
  title: string;
  content?: string;
  audioUrl?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

// GET /api/content - List content
// POST /api/content - Create content
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const type = url.searchParams.get('type');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  let query = 'SELECT * FROM content';
  const params: unknown[] = [];

  if (type) {
    query += ' WHERE type = ?';
    params.push(type);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const { results } = await context.env.DB.prepare(query).bind(...params).all();

  return new Response(JSON.stringify({ success: true, content: results }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  // Verify API key
  const authHeader = context.request.headers.get('Authorization');
  const apiKey = authHeader?.replace('Bearer ', '');
  
  if (apiKey !== context.env.ATLAS_API_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await context.request.json() as ContentRequest;
  const id = crypto.randomUUID();

  // Insert content
  await context.env.DB.prepare(
    'INSERT INTO content (id, type, title, content, audio_url, image_url, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    id,
    body.type,
    body.title,
    body.content || null,
    body.audioUrl || null,
    body.imageUrl || null,
    body.metadata ? JSON.stringify(body.metadata) : null
  ).run();

  // Handle tags
  if (body.tags && body.tags.length > 0) {
    for (const tagName of body.tags) {
      // Insert tag if not exists
      await context.env.DB.prepare(
        'INSERT OR IGNORE INTO tags (name) VALUES (?)'
      ).bind(tagName).run();

      // Get tag id
      const tag = await context.env.DB.prepare(
        'SELECT id FROM tags WHERE name = ?'
      ).bind(tagName).first();

      if (tag) {
        // Link content to tag
        await context.env.DB.prepare(
          'INSERT INTO content_tags (content_id, tag_id) VALUES (?, ?)'
        ).bind(id, tag.id).run();
      }
    }
  }

  return new Response(JSON.stringify({ success: true, id }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
