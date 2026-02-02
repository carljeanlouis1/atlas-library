interface Env {
  IMAGES: R2Bucket;
}

// GET /api/img/* - Serve images from R2
// Key format: artwork--contentid--timestamp.png (-- instead of /)
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const keyParts = context.params.key;
  const keyParam = Array.isArray(keyParts) ? keyParts.join('/') : keyParts;
  
  // Convert -- back to / for R2 key
  const key = keyParam.replace(/--/g, '/');

  const object = await context.env.IMAGES.get(key);

  if (!object) {
    return new Response(JSON.stringify({ error: 'Not found', key }), { 
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType || 'image/png');
  headers.set('Cache-Control', 'public, max-age=31536000');
  headers.set('ETag', object.etag);

  return new Response(object.body, { headers });
};
