interface Env {
  DB: D1Database;
  OPENAI_API_KEY?: string;
}

interface TTSRequest {
  text: string;
  contentId?: string;
  voice?: string;
}

// POST /api/tts - Generate TTS for text
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await context.request.json() as TTSRequest;
  
  if (!body.text) {
    return new Response(JSON.stringify({ error: 'No text provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // For now, use Echo Studio API for TTS
  // This proxies to the existing Echo Studio service
  const echoStudioUrl = 'https://echo-studio.pages.dev/api/atlas/generate';
  const echoApiKey = '200063379dee4139c9207e8494d094b5c85b99c49fda9124da62173ac81a6a11';

  try {
    const response = await fetch(echoStudioUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Atlas-API-Key': echoApiKey,
      },
      body: JSON.stringify({
        title: 'Library TTS',
        text: body.text.slice(0, 50000), // Limit text length
        voice: body.voice || 'nova',
        metadata: {
          source: 'atlas-library',
          contentId: body.contentId,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Echo Studio error: ${response.status}`);
    }

    const data = await response.json() as { audioUrl?: string };

    // If we have a contentId, update the content with the audio URL
    if (body.contentId && data.audioUrl) {
      const fullAudioUrl = `https://echo-studio.pages.dev${data.audioUrl}`;
      await context.env.DB.prepare(
        'UPDATE content SET audio_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).bind(fullAudioUrl, body.contentId).run();

      return new Response(JSON.stringify({ 
        success: true, 
        audioUrl: fullAudioUrl 
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      audioUrl: data.audioUrl ? `https://echo-studio.pages.dev${data.audioUrl}` : null 
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('TTS error:', error);
    return new Response(JSON.stringify({ 
      error: 'TTS generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
