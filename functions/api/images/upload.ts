interface Env {
  DB: D1Database;
  IMAGES: R2Bucket;
  ATLAS_API_KEY: string;
}

// POST /api/images/upload - Upload an image to R2
// Body: multipart/form-data with 'image' file, or JSON with base64 'data'
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

  const contentType = context.request.headers.get('Content-Type') || '';
  let imageData: ArrayBuffer;
  let filename: string;
  let mimeType: string;

  if (contentType.includes('multipart/form-data')) {
    // Handle form upload
    const formData = await context.request.formData();
    const file = formData.get('image') as File;
    if (!file) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    imageData = await file.arrayBuffer();
    filename = formData.get('filename') as string || file.name || `${Date.now()}.png`;
    mimeType = file.type || 'image/png';
  } else {
    // Handle JSON with base64
    const body = await context.request.json() as { data: string; filename?: string; mimeType?: string };
    if (!body.data) {
      return new Response(JSON.stringify({ error: 'No image data provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // Remove data URL prefix if present
    const base64Data = body.data.replace(/^data:image\/\w+;base64,/, '');
    imageData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
    filename = body.filename || `${Date.now()}.png`;
    mimeType = body.mimeType || 'image/png';
  }

  // Generate unique key
  const key = `images/${Date.now()}-${filename}`;

  // Upload to R2
  await context.env.IMAGES.put(key, imageData, {
    httpMetadata: {
      contentType: mimeType,
    },
  });

  // Return public URL (assuming public bucket or custom domain)
  const publicUrl = `https://images.atlas-library.pages.dev/${key}`;
  
  return new Response(JSON.stringify({ 
    success: true, 
    key,
    url: publicUrl,
  }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
