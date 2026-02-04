interface Env {
  IMAGES: R2Bucket;
}

// GET /api/images/* - Serve images and audio from R2 with range request support
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const path = context.params.path;
  const key = Array.isArray(path) ? path.join('/') : path;
  const request = context.request;

  // Check for Range header (needed for audio/video seeking)
  const rangeHeader = request.headers.get('Range');

  if (rangeHeader) {
    // Handle range request for seeking support
    const rangeMatch = rangeHeader.match(/bytes=(\d*)-(\d*)/);
    if (rangeMatch) {
      // First get the object metadata to know the total size
      const head = await context.env.IMAGES.head(key);
      if (!head) {
        return new Response('Not found', { status: 404 });
      }

      const totalSize = head.size;
      const start = rangeMatch[1] ? parseInt(rangeMatch[1], 10) : 0;
      const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : totalSize - 1;
      
      // Clamp end to file size
      const actualEnd = Math.min(end, totalSize - 1);
      const contentLength = actualEnd - start + 1;

      // Fetch the specific range from R2
      const object = await context.env.IMAGES.get(key, {
        range: { offset: start, length: contentLength }
      });

      if (!object) {
        return new Response('Not found', { status: 404 });
      }

      // Determine content type
      let contentType = object.httpMetadata?.contentType || 'application/octet-stream';
      if (key.endsWith('.mp3')) contentType = 'audio/mpeg';
      else if (key.endsWith('.wav')) contentType = 'audio/wav';
      else if (key.endsWith('.ogg')) contentType = 'audio/ogg';
      else if (key.endsWith('.m4a')) contentType = 'audio/mp4';
      else if (key.endsWith('.png')) contentType = 'image/png';
      else if (key.endsWith('.jpg') || key.endsWith('.jpeg')) contentType = 'image/jpeg';
      else if (key.endsWith('.webp')) contentType = 'image/webp';
      else if (key.endsWith('.gif')) contentType = 'image/gif';

      const headers = new Headers();
      headers.set('Content-Type', contentType);
      headers.set('Content-Length', contentLength.toString());
      headers.set('Content-Range', `bytes ${start}-${actualEnd}/${totalSize}`);
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
    return new Response('Not found', { status: 404 });
  }

  // Determine content type
  let contentType = object.httpMetadata?.contentType || 'application/octet-stream';
  if (key.endsWith('.mp3')) contentType = 'audio/mpeg';
  else if (key.endsWith('.wav')) contentType = 'audio/wav';
  else if (key.endsWith('.ogg')) contentType = 'audio/ogg';
  else if (key.endsWith('.m4a')) contentType = 'audio/mp4';
  else if (key.endsWith('.png')) contentType = 'image/png';
  else if (key.endsWith('.jpg') || key.endsWith('.jpeg')) contentType = 'image/jpeg';
  else if (key.endsWith('.webp')) contentType = 'image/webp';
  else if (key.endsWith('.gif')) contentType = 'image/gif';

  const headers = new Headers();
  headers.set('Content-Type', contentType);
  headers.set('Content-Length', object.size.toString());
  headers.set('Cache-Control', 'public, max-age=31536000');
  headers.set('ETag', object.etag);
  headers.set('Accept-Ranges', 'bytes');

  return new Response(object.body, { headers });
};
