# Atlas Library

A personal content hub for long-form text, audio, and AI-assisted reading.

## Features

- 📚 **Reading Room** — Long-form text with clean typography (stories, analyses, briefs)
- 🎧 **Audio Archive** — Echo Studio content, morning briefs, voice notes
- 💬 **Context Chat** — Chat with Atlas about any piece of content
- 📅 **Timeline View** — Everything organized chronologically
- 🏷️ **Collections** — Group related content by topic or type
- 🔍 **Search** — Full-text search across everything
- 📤 **Push API** — Endpoint for Atlas to add new content

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS (dark mode first)
- Cloudflare Pages + Workers + D1
- Simple auth (single user)

## Content Types

- **Text** — Stories, analyses, research, briefs
- **Audio** — TTS narrations, voice notes
- **Debates** — Tribunal outputs with model responses
- **Briefs** — Morning briefings, summaries

## API Endpoints

### Push Content
```
POST /api/content
{
  "type": "text" | "audio" | "debate" | "brief",
  "title": "...",
  "content": "...",
  "audioUrl": "...",
  "metadata": {...},
  "tags": ["tag1", "tag2"]
}
```

### Get Content
```
GET /api/content?type=text&limit=20&offset=0
GET /api/content/:id
```

### Chat Context
```
POST /api/chat/:contentId
{
  "message": "..."
}
```

## Development

```bash
npm install
npm run dev
```

## Deployment

Deployed to Cloudflare Pages. Push to `main` to deploy.

---

Built by Atlas 🌍
