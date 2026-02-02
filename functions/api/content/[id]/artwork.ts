interface Env {
  DB: D1Database;
  IMAGES: R2Bucket;
  ATLAS_API_KEY: string;
  GEMINI_API_KEY: string;
}

interface ContentRow {
  id: string;
  type: string;
  title: string;
  content: string | null;
  image_url: string | null;
}

interface ArtworkRequest {
  style?: 'infographic' | 'comic' | 'editorial' | 'abstract' | 'minimal';
}

// POST /api/content/[id]/artwork - Generate artwork for content using Gemini
// Optional body: { "style": "infographic" | "comic" | "editorial" | "abstract" | "minimal" }
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

  const contentId = context.params.id as string;
  
  // Parse optional style from request body
  let style: ArtworkRequest['style'] = 'infographic'; // Default to infographic
  try {
    const body = await context.request.json() as ArtworkRequest;
    if (body.style) {
      style = body.style;
    }
  } catch {
    // No body or invalid JSON - use default
  }
  
  // Fetch content
  const content = await context.env.DB.prepare(
    'SELECT id, type, title, content, image_url FROM content WHERE id = ?'
  ).bind(contentId).first<ContentRow>();

  if (!content) {
    return new Response(JSON.stringify({ error: 'Content not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Build prompt from content with style
  const contentPreview = content.content?.slice(0, 2000) || '';
  const prompt = buildArtworkPrompt(content.type, content.title, contentPreview, style);

  try {
    // Generate image with Gemini
    const imageData = await generateWithGemini(context.env.GEMINI_API_KEY, prompt);
    
    // Upload to R2
    const filename = `artwork-${contentId}-${Date.now()}.png`;
    const key = `artwork/${filename}`;
    
    await context.env.IMAGES.put(key, imageData, {
      httpMetadata: {
        contentType: 'image/png',
      },
    });

    // Update content with image URL - use simple key format with -- separator
    const urlKey = key.replace(/\//g, '--');
    const imageUrl = `https://atlas-library.pages.dev/api/img/${urlKey}`;
    
    await context.env.DB.prepare(
      'UPDATE content SET image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(imageUrl, contentId).run();

    return new Response(JSON.stringify({ 
      success: true, 
      imageUrl,
      style,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Artwork generation failed:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to generate artwork',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

function buildArtworkPrompt(type: string, title: string, content: string, style: ArtworkRequest['style']): string {
  // Extract key themes from content
  const themes = extractThemes(content);
  
  // Style-specific instructions
  const styleGuides: Record<string, string> = {
    infographic: 'Clean modern infographic style with icons, data visualization elements, organized layout with visual hierarchy, professional business aesthetic, flat design with subtle gradients, information-focused composition',
    comic: 'Bold comic book style with dynamic panels, vibrant colors, strong outlines, action-oriented composition, graphic novel aesthetic',
    editorial: 'Sophisticated editorial illustration style, artistic and conceptual, rich colors, atmospheric lighting, magazine cover quality',
    abstract: 'Abstract digital art with flowing shapes, geometric patterns, vibrant color gradients, modern artistic composition',
    minimal: 'Minimalist design with clean lines, limited color palette, negative space, simple iconic elements, elegant simplicity',
  };
  
  const styleInstruction = styleGuides[style || 'infographic'];
  
  // Text guidance varies by style
  const textGuidance = style === 'infographic' 
    ? 'Include clear, readable text labels, headers, and data callouts where appropriate. Text should be crisp and well-integrated into the design.'
    : style === 'minimal'
    ? 'Text is optional - use sparingly if at all, only for essential labels.'
    : 'Include the title text prominently in the design.';

  return `Create a visually striking ${style} artwork for: "${title}"

Key themes and concepts: ${themes}

Style requirements: ${styleInstruction}

${textGuidance}

The image should be suitable as a header/hero image for a digital article. High quality, professional.`;
}

function extractThemes(content: string): string {
  // Simple theme extraction - take key sentences
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const keyPhrases = sentences.slice(0, 5).map(s => s.trim().slice(0, 100));
  return keyPhrases.join(', ') || 'general knowledge and insights';
}

async function generateWithGemini(apiKey: string, prompt: string): Promise<ArrayBuffer> {
  // Use Gemini 3 Pro Image Preview (nano banana pro)
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        }
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const data = await response.json();
  
  // Extract image from response - check all parts
  let imageData: string | null = null;
  const parts = data.candidates?.[0]?.content?.parts || [];
  
  for (const part of parts) {
    if (part.inlineData?.data) {
      imageData = part.inlineData.data;
      break;
    }
  }

  if (!imageData) {
    // Log what we got for debugging
    const textParts = parts.filter((p: { text?: string }) => p.text).map((p: { text: string }) => p.text);
    throw new Error(`No image generated. Model response: ${textParts.join(' ') || 'empty'}`);
  }

  // Decode base64 to ArrayBuffer
  const binaryString = atob(imageData);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes.buffer;
}
