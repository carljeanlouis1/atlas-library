interface Env {
  OPENAI_API_KEY?: string;
  ECHO_STUDIO_API_KEY?: string;
}

interface PreviewRequest {
  voice: string;
  text: string;
}

// POST /api/voice-preview - Generate a short voice preview
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await context.request.json() as PreviewRequest;
  
  // Use Echo Studio for preview generation
  const echoStudioUrl = 'https://echo-studio.pages.dev/api/atlas/generate';
  const echoApiKey = context.env.ECHO_STUDIO_API_KEY;
  
  if (!echoApiKey) {
    return new Response(JSON.stringify({ error: 'Echo Studio API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const response = await fetch(echoStudioUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Atlas-API-Key': echoApiKey,
      },
      body: JSON.stringify({
        title: 'Voice Preview',
        text: body.text || 'Hello! This is how I sound.',
        voice: body.voice || 'nova',
        metadata: {
          source: 'atlas-library-preview',
          isPreview: true,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Echo Studio error: ${response.status}`);
    }

    const data = await response.json() as { audioUrl?: string };

    return new Response(JSON.stringify({ 
      success: true, 
      audioUrl: data.audioUrl ? `https://echo-studio.pages.dev${data.audioUrl}` : null 
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Voice preview error:', error);
    return new Response(JSON.stringify({ 
      error: 'Preview generation failed'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
