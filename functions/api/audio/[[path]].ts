interface Env {
  IMAGES: R2Bucket;
}

// GET /api/audio/* - Serve audio from R2
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const path = context.params.path;
  const key = 'audio/' + (Array.isArray(path) ? path.join('/') : path);

  const object = await context.env.IMAGES.get(key);

  if (!object) {
    return new Response('Not found: ' + key, { status: 404 });
  }

  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType || 'audio/mpeg');
  headers.set('Cache-Control', 'public, max-age=31536000');
  headers.set('ETag', object.etag);
  headers.set('Accept-Ranges', 'bytes');

  return new Response(object.body, { headers });
};
