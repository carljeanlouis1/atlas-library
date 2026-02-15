interface Env {
  DB: D1Database;
  ATLAS_API_KEY: string;
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

  // Get story pages if content type is 'story'
  let pages = null;
  if (content.type === 'story') {
    const { results: pageResults } = await context.env.DB.prepare(
      'SELECT * FROM story_pages WHERE content_id = ? ORDER BY page_number ASC'
    ).bind(id).all();
    
    pages = pageResults.map((page: Record<string, unknown>) => ({
      ...page,
      narration_segments: page.narration_segments ? JSON.parse(page.narration_segments as string) : null,
    }));
  }

  return new Response(JSON.stringify({
    success: true,
    content: {
      ...content,
      metadata: content.metadata ? JSON.parse(content.metadata as string) : null,
      tags: tags.map((t: { name: string }) => t.name),
      chat: messages,
      pages,
    },
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

// DELETE /api/content/:id - Delete content item
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  // Verify API key
  const authHeader = context.request.headers.get('Authorization');
  const apiKey = authHeader?.replace('Bearer ', '');

  if (apiKey !== context.env.ATLAS_API_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = context.params.id as string;

  // Check if content exists
  const content = await context.env.DB.prepare(
    'SELECT id, type FROM content WHERE id = ?'
  ).bind(id).first();

  if (!content) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Delete related records first (foreign key order)
  await context.env.DB.prepare('DELETE FROM chat_messages WHERE content_id = ?').bind(id).run();
  await context.env.DB.prepare('DELETE FROM content_tags WHERE content_id = ?').bind(id).run();
  if (content.type === 'story') {
    await context.env.DB.prepare('DELETE FROM story_pages WHERE content_id = ?').bind(id).run();
  }
  // Delete the content itself
  await context.env.DB.prepare('DELETE FROM content WHERE id = ?').bind(id).run();

  return new Response(JSON.stringify({ success: true, deleted: id }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
