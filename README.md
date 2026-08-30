# Atlas Library

A personal archive of briefs, essays, recordings and songs — read in a proper
reading room, listened to from anywhere in the app, and downloadable to the
device.

## What's here

- **Library** — the whole archive as a dated index, grouped by month, with a
  scrubbable dial across every day the archive covers
- **Sort** — newest, oldest, title A–Z or Z–A, longest, shortest, recently
  played, or still unfinished. Date orders group by month, title orders group
  by letter, the rest run flat. Library and Audio each remember their own.
- **Audio** — every recording, with a "half-listened" shelf that picks up where
  you stopped
- **Music** — songs with artwork and lyrics
- **Log** — everything day by day, in the order it arrived
- **Reader** — long-form reading with narration, artwork, and a chat about the piece
- **Download** — save any item's audio to the device, named
  `2026-08-28 Morning Brief.mp3`
- **Global player** — playback follows you across pages, with a queue, playback
  speed, saved positions, and lock-screen controls (Media Session)
- **Search** — `/` or `cmd K` anywhere

## Design

Two themes off one set of CSS variables in `src/index.css`: **Night** (warm
espresso ground, amber dial glow) and **Daylight** (paper). Type is Archivo for
station lettering and UI, Newsreader for anything you read at length, and Space
Mono for timecodes and dates.

Tailwind colours map to those variables (`--ground`, `--panel`, `--hairline`,
`--ink`, `--amber`, ...), so both themes come from one token set. The older
names (`surface`, `border`, `text-primary`, `atlas-*`) are kept as aliases so
existing components still resolve.

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS
- Cloudflare Pages + Functions + D1 + R2

## API

### List content
```
GET /api/content?type=brief&limit=20&offset=0&search=...
GET /api/content?list=1&limit=500        # slim projection for the archive views
```
`list=1` returns `id, type, title, audio_url, image_url, metadata, created_at,
updated_at`, plus a 220-character `excerpt` and `content_length` — enough to
render the index and estimate listen/read times without shipping every essay in
full. Without it the response shape is unchanged.

### Single item
```
GET /api/content/:id
PATCH /api/content/:id      # Bearer ATLAS_API_KEY
DELETE /api/content/:id     # Bearer ATLAS_API_KEY
```

### Download audio
```
GET /api/download/:id
```
Streams the item's audio with `Content-Disposition: attachment` and a readable,
date-prefixed filename. Audio held in our own R2 bucket is served straight from
the bucket; anything hosted elsewhere is streamed through. Returns 404 when the
item has no audio and 502 when an external host no longer has the file.

### Push content
```
POST /api/content           # Bearer ATLAS_API_KEY
{ "type": "text" | "audio" | "debate" | "brief" | "story" | "song",
  "title": "...", "content": "...", "audioUrl": "...", "tags": ["..."] }
```

### Other
```
POST /api/tts               # generate narration (chunks and stitches long text)
POST /api/chat/:contentId   # discuss a piece
POST /api/content/:id/artwork
GET  /api/audio/*  GET /api/images/*
```

## Development

```bash
npm install
npm run dev
```

`npm run dev` proxies `/api` to the live deployment (see `vite.config.ts`),
because there is no local D1 or R2 to read from.

## Deployment

Pushing to `main` deploys to Cloudflare Pages via GitHub Actions. To deploy by
hand:

```bash
npm run build && npx wrangler pages deploy dist --project-name=atlas-library --branch=main
```

---

Built by Atlas
