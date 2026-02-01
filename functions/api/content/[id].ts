interface Env {
  DB: D1Database;
}

// GET /api/content/:id - Get single content item
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string;

  const content = await context.env.DB.prepare(
    'SELECT * FROM content WHERE id = ?'
  ).bind(id).first();

  if (!content) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get tags
  const { results: tags } = await context.env.DB.prepare(
    `SELECT t.name FROM tags t 
     JOIN content_tags ct ON t.id = ct.tag_id 
     WHERE ct.content_id = ?`
  ).bind(id).all();

  // Get chat messages
  const { results: messages } = await context.env.DB.prepare(
    'SELECT * FROM chat_messages WHERE content_id = ? ORDER BY created_at ASC'
  ).bind(id).all();

  return new Response(JSON.stringify({
    success: true,
    content: {
      ...content,
      metadata: content.metadata ? JSON.parse(content.metadata as string) : null,
      tags: tags.map((t: { name: string }) => t.name),
      chat: messages,
    },
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
