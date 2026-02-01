interface Env {
  IMAGES: R2Bucket;
}

// GET /api/images/* - Serve images from R2
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const path = context.params.path;
  const key = Array.isArray(path) ? path.join('/') : path;

  const object = await context.env.IMAGES.get(key);

  if (!object) {
    return new Response('Not found', { status: 404 });
  }

  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType || 'image/png');
  headers.set('Cache-Control', 'public, max-age=31536000'); // 1 year cache
  headers.set('ETag', object.etag);

  return new Response(object.body, { headers });
};
