-- Migration: Add 'story' content type and story_pages table
-- For storing ForgeStory visual stories with multiple pages

-- SQLite doesn't support ALTER CHECK constraints, so we need to recreate
-- For now, we'll handle this in application logic and update schema for new deployments

-- Create story_pages table for multi-page visual stories
CREATE TABLE IF NOT EXISTS story_pages (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  image_url TEXT,
  image_base64 TEXT,
  narration_text TEXT,
  narration_segments TEXT, -- JSON array of narration segments
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_story_pages_content ON story_pages(content_id);
CREATE INDEX IF NOT EXISTS idx_story_pages_order ON story_pages(content_id, page_number);
