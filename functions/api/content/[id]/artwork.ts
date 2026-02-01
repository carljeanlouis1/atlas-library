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

// POST /api/content/[id]/artwork - Generate artwork for content using Gemini
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

  // Build prompt from content
  const contentPreview = content.content?.slice(0, 2000) || '';
  const prompt = buildArtworkPrompt(content.type, content.title, contentPreview);

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

    // Update content with image URL
    const imageUrl = `https://images.atlas-library.pages.dev/${key}`;
    
    await context.env.DB.prepare(
      'UPDATE content SET image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(imageUrl, contentId).run();

    return new Response(JSON.stringify({ 
      success: true, 
      imageUrl,
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

function buildArtworkPrompt(type: string, title: string, content: string): string {
  // Extract key themes from content
  const themes = extractThemes(content);
  
  const styleGuide = {
    brief: 'Abstract digital art with flowing data streams, warm sunrise colors (gold, orange, deep blue), interconnected nodes, sleek futuristic aesthetic, editorial illustration style',
    text: 'Artistic illustration capturing the narrative essence, rich colors, atmospheric lighting, editorial quality',
    audio: 'Sound wave visualization merging with abstract imagery, dynamic flowing forms, musical energy',
    debate: 'Two contrasting perspectives visualized abstractly, balanced composition, intellectual atmosphere, debate/discourse imagery',
  };

  const style = styleGuide[type as keyof typeof styleGuide] || styleGuide.text;

  return `Create a visually striking artwork for: "${title}"

Key themes: ${themes}

Style requirements: ${style}

The image should be suitable as a header/hero image for a digital article. High quality, professional editorial illustration. No text in the image.`;
}

function extractThemes(content: string): string {
  // Simple theme extraction - take key sentences
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const keyPhrases = sentences.slice(0, 5).map(s => s.trim().slice(0, 100));
  return keyPhrases.join(', ') || 'general knowledge and insights';
}

async function generateWithGemini(apiKey: string, prompt: string): Promise<ArrayBuffer> {
  // Use Gemini 2.0 Flash experimental image generation model
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}`,
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
