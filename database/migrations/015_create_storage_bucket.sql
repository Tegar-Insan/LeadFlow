-- Migration 015: Create Supabase Storage bucket for LeadFlow media
-- This creates the 'leadflow-media' bucket used for profile photos and content assets.
-- Run AFTER 014 migration.

-- Create the bucket (public = true so photo URLs are readable without auth)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'leadflow-media',
  'leadflow-media',
  true,
  52428800,  -- 50 MB in bytes
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/quicktime'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS policies
-- Authenticated users can upload to their own profile-photos subfolder
CREATE POLICY "leadflow_media_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'leadflow-media'
    AND (storage.foldername(name))[1] = 'profile-photos'
  );

-- Authenticated users can update/delete only their own files
CREATE POLICY "leadflow_media_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'leadflow-media'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "leadflow_media_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'leadflow-media'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Public read on the bucket (bucket is already public=true, but explicit policy for clarity)
CREATE POLICY "leadflow_media_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'leadflow-media');
