interface Env {
  DB: D1Database;
  ANTHROPIC_API_KEY: string;
}

interface ChatRequest {
  message: string;
}

// POST /api/chat/:contentId - Chat about content
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const contentId = context.params.contentId as string;
  const body = await context.request.json() as ChatRequest;

  // Get the content for context
  const content = await context.env.DB.prepare(
    'SELECT * FROM content WHERE id = ?'
  ).bind(contentId).first();

  if (!content) {
    return new Response(JSON.stringify({ error: 'Content not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get previous chat messages
  const { results: previousMessages } = await context.env.DB.prepare(
    'SELECT role, message FROM chat_messages WHERE content_id = ? ORDER BY created_at ASC LIMIT 20'
  ).bind(contentId).all();

  // Build messages for Claude
  const messages = previousMessages.map((m: { role: string; message: string }) => ({
    role: m.role,
    content: m.message,
  }));

  messages.push({ role: 'user', content: body.message });

  // Call Claude
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': context.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      system: `You are Atlas, Carl's AI assistant. You're discussing the following content with him:

Title: ${content.title}
Type: ${content.type}

Content:
${content.content?.slice(0, 8000) || 'Audio content - no transcript available'}

Be conversational, insightful, and reference specific parts of the content when relevant.`,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return new Response(JSON.stringify({ error: 'AI request failed', details: error }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const aiResponse = await response.json() as {
    content: Array<{ type: string; text?: string }>;
  };

  const assistantMessage = aiResponse.content.find(c => c.type === 'text')?.text || '';

  // Save both messages to database
  const userMsgId = crypto.randomUUID();
  const assistantMsgId = crypto.randomUUID();

  await context.env.DB.batch([
    context.env.DB.prepare(
      'INSERT INTO chat_messages (id, content_id, role, message) VALUES (?, ?, ?, ?)'
    ).bind(userMsgId, contentId, 'user', body.message),
    context.env.DB.prepare(
      'INSERT INTO chat_messages (id, content_id, role, message) VALUES (?, ?, ?, ?)'
    ).bind(assistantMsgId, contentId, 'assistant', assistantMessage),
  ]);

  return new Response(JSON.stringify({
    success: true,
    message: assistantMessage,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
