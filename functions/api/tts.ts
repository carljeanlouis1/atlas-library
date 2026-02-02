interface Env {
  DB: D1Database;
  IMAGES: R2Bucket;
  OPENAI_API_KEY?: string;
  ECHO_STUDIO_API_KEY?: string;
}

interface TTSRequest {
  text: string;
  contentId?: string;
  voice?: string;
}

// Character limit per chunk (OpenAI TTS limit is ~4096 chars, we use 3500 for safety)
const CHUNK_CHAR_LIMIT = 3500;
// If text is longer than this, we chunk it
const LONG_TEXT_THRESHOLD = 4000;

/**
 * Split text into chunks at natural breakpoints (paragraphs, sentences)
 */
function chunkText(text: string, maxChars: number): string[] {
  // If short enough, return as-is
  if (text.length <= maxChars) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      chunks.push(remaining.trim());
      break;
    }

    // Find a good break point within the limit
    let breakPoint = maxChars;
    
    // Try to break at paragraph (double newline)
    const paragraphBreak = remaining.lastIndexOf('\n\n', maxChars);
    if (paragraphBreak > maxChars * 0.5) {
      breakPoint = paragraphBreak + 2;
    } else {
      // Try to break at single newline
      const newlineBreak = remaining.lastIndexOf('\n', maxChars);
      if (newlineBreak > maxChars * 0.5) {
        breakPoint = newlineBreak + 1;
      } else {
        // Try to break at sentence end
        const sentenceBreaks = ['. ', '! ', '? ', '." ', '!" ', '?" '];
        let bestBreak = -1;
        for (const sb of sentenceBreaks) {
          const idx = remaining.lastIndexOf(sb, maxChars);
          if (idx > bestBreak) {
            bestBreak = idx + sb.length;
          }
        }
        if (bestBreak > maxChars * 0.3) {
          breakPoint = bestBreak;
        } else {
          // Last resort: break at space
          const spaceBreak = remaining.lastIndexOf(' ', maxChars);
          if (spaceBreak > maxChars * 0.3) {
            breakPoint = spaceBreak + 1;
          }
          // Otherwise just hard break at maxChars
        }
      }
    }

    const chunk = remaining.slice(0, breakPoint).trim();
    if (chunk) {
      chunks.push(chunk);
    }
    remaining = remaining.slice(breakPoint).trim();
  }

  return chunks;
}

/**
 * Fetch audio from a URL and return as ArrayBuffer
 */
async function fetchAudio(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio: ${response.status}`);
  }
  return response.arrayBuffer();
}

/**
 * Concatenate MP3 buffers (simple concat works for same-format MP3s)
 */
function concatenateAudio(buffers: ArrayBuffer[]): ArrayBuffer {
  const totalLength = buffers.reduce((acc, buf) => acc + buf.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of buffers) {
    result.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }
  return result.buffer;
}

// POST /api/tts - Generate TTS for text (with automatic chunking for long content)
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await context.request.json() as TTSRequest;
  
  if (!body.text) {
    return new Response(JSON.stringify({ error: 'No text provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const echoStudioUrl = 'https://echo-studio.pages.dev/api/atlas/generate';
  const echoApiKey = context.env.ECHO_STUDIO_API_KEY;
  
  if (!echoApiKey) {
    return new Response(JSON.stringify({ error: 'Echo Studio API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const text = body.text;
  const isLongContent = text.length > LONG_TEXT_THRESHOLD;

  try {
    if (!isLongContent) {
      // Short content: single API call
      const response = await fetch(echoStudioUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Atlas-API-Key': echoApiKey,
        },
        body: JSON.stringify({
          title: 'Library TTS',
          text: text,
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
      const fullAudioUrl = data.audioUrl ? `https://echo-studio.pages.dev${data.audioUrl}` : null;

      if (body.contentId && fullAudioUrl) {
        await context.env.DB.prepare(
          'UPDATE content SET audio_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).bind(fullAudioUrl, body.contentId).run();
      }

      return new Response(JSON.stringify({ 
        success: true, 
        audioUrl: fullAudioUrl,
        chunked: false,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Long content: chunk, generate, and combine
    const chunks = chunkText(text, CHUNK_CHAR_LIMIT);
    console.log(`Long content detected: ${text.length} chars, split into ${chunks.length} chunks`);

    // Generate audio for each chunk
    const audioUrls: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Generating chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
      
      const response = await fetch(echoStudioUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Atlas-API-Key': echoApiKey,
        },
        body: JSON.stringify({
          title: `Library TTS - Part ${i + 1}`,
          text: chunk,
          voice: body.voice || 'nova',
          metadata: {
            source: 'atlas-library',
            contentId: body.contentId,
            chunk: i + 1,
            totalChunks: chunks.length,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Echo Studio error on chunk ${i + 1}: ${response.status}`);
      }

      const data = await response.json() as { audioUrl?: string };
      if (data.audioUrl) {
        audioUrls.push(`https://echo-studio.pages.dev${data.audioUrl}`);
      }
    }

    // Fetch and concatenate all audio chunks
    console.log(`Fetching and combining ${audioUrls.length} audio chunks...`);
    const audioBuffers: ArrayBuffer[] = [];
    for (const url of audioUrls) {
      const buffer = await fetchAudio(url);
      audioBuffers.push(buffer);
    }

    const combinedAudio = concatenateAudio(audioBuffers);
    
    // Upload combined audio to R2
    const timestamp = Date.now();
    const audioKey = `audio/tts-combined-${body.contentId || timestamp}.mp3`;
    
    await context.env.IMAGES.put(audioKey, combinedAudio, {
      httpMetadata: {
        contentType: 'audio/mpeg',
      },
    });

    const finalAudioUrl = `https://atlas-library.pages.dev/api/images/${audioKey}`;
    console.log(`Combined audio uploaded: ${finalAudioUrl}`);

    // Update content with final audio URL
    if (body.contentId) {
      await context.env.DB.prepare(
        'UPDATE content SET audio_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).bind(finalAudioUrl, body.contentId).run();
    }

    return new Response(JSON.stringify({ 
      success: true, 
      audioUrl: finalAudioUrl,
      chunked: true,
      chunks: chunks.length,
      totalChars: text.length,
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
