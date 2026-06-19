-- =============================================================================
-- LEADFLOW — 020_add_generated_image_url_to_content_ideas.sql
-- Adds GPT Image 2.0 output storage. Image generation is chained onto
-- Claude (Anthropic) idea generation in contentIdeaService.ts — right
-- after an idea is inserted, the backend calls ai-analyzer's
-- POST /image/generate, uploads the result to Supabase Storage, and
-- stores the public URL here.
-- Additive only — existing rows default to NULL (no image yet).
-- SRS Refs: UC005 Generate Content Idea
-- =============================================================================

ALTER TABLE content_ideas
    ADD COLUMN IF NOT EXISTS generated_image_url TEXT;

COMMENT ON COLUMN content_ideas.generated_image_url IS
    'Supabase Storage public URL for the GPT Image 2.0 poster generated for this idea. NULL until image generation succeeds.';
