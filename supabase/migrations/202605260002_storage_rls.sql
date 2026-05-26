-- Migration: Configure Storage RLS for listing-images Bucket
-- This migration ensures the bucket exists and authenticated sellers can upload/manage their own files while the public can view them.

-- 1. Ensure the listing-images bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-images',
  'listing-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];

-- 2. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Allow public read access to listing-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to insert listing-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update own listing-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete own listing-images" ON storage.objects;

-- 3. Create SELECT policy (Allow public read access to all images in listing-images bucket)
CREATE POLICY "Allow public read access to listing-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'listing-images');

-- 4. Create INSERT policy (Allow authenticated sellers to upload files to their own user directory)
CREATE POLICY "Allow authenticated users to insert listing-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'listing-images' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

-- 5. Create UPDATE policy (Allow authenticated sellers to update files in their own user directory)
CREATE POLICY "Allow authenticated users to update own listing-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'listing-images' AND
  (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'listing-images' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

-- 6. Create DELETE policy (Allow authenticated sellers to delete files in their own user directory)
CREATE POLICY "Allow authenticated users to delete own listing-images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'listing-images' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);
