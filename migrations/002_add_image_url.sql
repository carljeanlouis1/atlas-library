-- Migration: Add image_url column to content table
-- For displaying artwork/thumbnails with briefs and other content

ALTER TABLE content ADD COLUMN image_url TEXT;
