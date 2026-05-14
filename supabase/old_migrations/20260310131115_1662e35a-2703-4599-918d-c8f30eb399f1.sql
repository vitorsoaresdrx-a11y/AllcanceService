
-- Create storage bucket for product images (public for display)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-images', 'product-images', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- RLS policies for product-images bucket
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can update product images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can delete product images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'product-images');

-- Add image columns (array of URLs, max 2)
ALTER TABLE public.parts ADD COLUMN images text[] DEFAULT '{}';
ALTER TABLE public.bike_models ADD COLUMN images text[] DEFAULT '{}';
