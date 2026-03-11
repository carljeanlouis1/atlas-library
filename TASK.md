# Task: Build Music Section for Atlas Library

## Context
Atlas Library is a React + Cloudflare Pages app. Songs are stored as content with `type: "song"` in D1. Each song has:
- `audio_url` — link to MP3 on R2
- `metadata` — JSON with: `artist_style`, `genre`, `duration`, `lyrics`, `source`
- `title` — song title
- `tags` — array of tags

The Reader page (`src/pages/Reader.tsx`) already has lyrics viewer code at line ~527 for `content.type === 'song'` but it may not be working because metadata might arrive as a JSON string instead of an object.

## What Needs to Happen

### 1. Fix Reader.tsx Metadata Parsing
In the `useEffect` fetch callback (~line 99), after `data.content` is received, parse metadata if it's a string:
```tsx
const item = data.content
if (item.metadata && typeof item.metadata === 'string') {
  try { item.metadata = JSON.parse(item.metadata) } catch(e) {}
}
setContent(item)
```

### 2. Create a Music Page (`src/pages/Music.tsx`)
A dedicated `/music` route that shows only songs. Should feel like a music player, not a document reader.

Features:
- Fetches only `type=song` content from API
- Album-style card grid with play buttons
- Each card shows: title, artist_style, genre, duration badge
- Clicking a song plays it with a sticky bottom player bar (play/pause, seek, time)
- When a song is playing, show its lyrics below the player with section headers highlighted
- Clean dark theme matching existing app (uses Tailwind, `bg-surface`, `border-border`, `text-atlas-400` etc.)

### 3. Add Music Route to App.tsx
Add `<Route path="music" element={<Music />} />` and add a nav link in Layout.tsx (music note icon).

### 4. API: Filter by Type
The existing `/api/content` endpoint needs to support `?type=song` filter. Check `functions/api/content.ts` — if it doesn't filter by type, add `WHERE type = ?` when type param is present.

### 5. Fix Audio.tsx
The existing Audio page (`src/pages/Audio.tsx`) should exclude songs (type !== 'song') so audio briefs and articles stay separate from music.

## Style Reference
- Dark theme: `bg-background`, `bg-surface`, `border-border`, `text-text-primary`, `text-text-muted`, `text-atlas-400`, `bg-atlas-500`
- Cards: `bg-surface border border-border rounded-xl`
- Use Tailwind utility classes matching existing pages

## Build & Deploy
After making changes:
1. `cd /root/atlas-library`
2. Try `npm run build` — if it fails, try `rm -rf node_modules && npm install && npm run build`
3. If build succeeds: `npx wrangler pages deploy dist --project-name=atlas-library`
4. Also `git add -A && git commit -m "feat: add dedicated Music page with lyrics + audio player" && git push origin main`

## When Complete
Run: `openclaw system event --text "Done: Atlas Library Music section deployed with lyrics viewer and audio player" --mode now`

## 6. Album Artwork Generation
For each song that doesn't have an `image_url`, generate album cover artwork using Google Gemini image generation.

### API Setup
```bash
# Gemini 3.1 Flash Image Preview (Nano Banana 2)
MODEL="gemini-3.1-flash-image-preview"
API_KEY="$GOOGLE_API_KEY"  # from environment
```

### Generation Approach
Use the Gemini API to generate album artwork. For each song, create a prompt based on the song's artist_style, genre, and title. Example prompt:
"Album cover art for a song called '[title]' in the style of [artist_style], [genre]. Dark moody aesthetic, modern, cinematic. No text on the image."

### Upload Flow
1. Generate image via Gemini API
2. Save to `/tmp/openclaw/artwork/[song-id].png`
3. Upload to R2 bucket `atlas-library-images` at path `images/songs/[song-id].png`
4. Update the content entry's `image_url` via PATCH `/api/content/[id]`

### R2 Upload
```python
import boto3, os
s3 = boto3.client('s3',
    endpoint_url=os.environ['R2_ENDPOINT'],
    aws_access_key_id=os.environ['R2_ACCESS_KEY_ID'],
    aws_secret_access_key=os.environ['R2_SECRET_ACCESS_KEY'])
s3.upload_file(local_path, 'atlas-library-images', f'images/songs/{song_id}.png',
    ExtraArgs={'ContentType': 'image/png'})
# Public URL: https://atlas-library.pages.dev/api/images/images/songs/{song_id}.png
```

### Environment Variables
All needed env vars are in `/root/clawd/.env` — source it before running:
- GOOGLE_API_KEY
- R2_ENDPOINT
- R2_ACCESS_KEY_ID  
- R2_SECRET_ACCESS_KEY
- ATLAS_LIBRARY_API_KEY

### Song IDs to Generate Artwork For
```
822d9d41-127d-4727-9b8a-1eb5a5fb6d1e  "Let Me Be Enough" (Adele)
ef676067-4898-4088-b2d5-cf780c112d9c  "What Do I Do Now" (Billie Eilish)
217c8417-fd4b-46f9-bf19-636196c124d0  "Brain Cells Learned to Dream" (Chiddy Bang)
d6fdd975-d56b-4ba3-b34a-9c8a2758256b  "Already Here" (J. Cole)
8418acd8-e223-4f0b-a16d-a91363ef859d  "Speed of Light" (Kanye West)
b7429b13-c91c-455f-881d-1374abe36be6  "Start of Something Big" (Chiddy Bang)
1fee4834-2a9f-4628-aa19-6fc1fb5082ab  "Run This" (Beyoncé)
263b8de2-e34f-4dd0-a030-48aa79920418  "I Know" (Drake)
```

Write a Python script to do this, run it from /root/clawd with `.env` sourced.
