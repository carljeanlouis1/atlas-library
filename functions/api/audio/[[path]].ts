interface Env {
  IMAGES: R2Bucket;
}

// GET /api/audio/* - Serve audio from R2 with proper range request support
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const path = context.params.path;
  const key = 'audio/' + (Array.isArray(path) ? path.join('/') : path);
  const request = context.request;

  // Check for Range header
  const rangeHeader = request.headers.get('Range');

  if (rangeHeader) {
    // Handle range request for seeking support
    const rangeMatch = rangeHeader.match(/bytes=(\d*)-(\d*)/);
    if (rangeMatch) {
      const start = rangeMatch[1] ? parseInt(rangeMatch[1], 10) : undefined;
      const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : undefined;

      // Use R2's native range support
      const object = await context.env.IMAGES.get(key, {
        range: { offset: start, length: end && start !== undefined ? end - start + 1 : undefined }
      });

      if (!object) {
        return new Response('Not found: ' + key, { status: 404 });
      }

      // Get full object size for Content-Range header
      const head = await context.env.IMAGES.head(key);
      const totalSize = head?.size || 0;
      
      // Calculate actual range values
      const rangeStart = start || 0;
      const rangeEnd = end || (totalSize - 1);
      const contentLength = rangeEnd - rangeStart + 1;

      const headers = new Headers();
      headers.set('Content-Type', object.httpMetadata?.contentType || 'audio/mpeg');
      headers.set('Content-Length', contentLength.toString());
      headers.set('Content-Range', `bytes ${rangeStart}-${rangeEnd}/${totalSize}`);
      headers.set('Accept-Ranges', 'bytes');
      headers.set('Cache-Control', 'public, max-age=31536000');
      headers.set('ETag', object.etag);

      return new Response(object.body, { 
        status: 206, // Partial Content
        headers 
      });
    }
  }

  // No range header - return full file
  const object = await context.env.IMAGES.get(key);

  if (!object) {
    return new Response('Not found: ' + key, { status: 404 });
  }

  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType || 'audio/mpeg');
  headers.set('Content-Length', object.size.toString());
  headers.set('Cache-Control', 'public, max-age=31536000');
  headers.set('ETag', object.etag);
  headers.set('Accept-Ranges', 'bytes');

  return new Response(object.body, { headers });
};
