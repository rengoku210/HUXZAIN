-- Add gallery_urls and tags to listings table
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS gallery_urls jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb;
