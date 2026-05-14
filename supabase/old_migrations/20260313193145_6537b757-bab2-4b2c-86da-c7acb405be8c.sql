
-- Add audio columns to internal_calls
ALTER TABLE public.internal_calls
  ADD COLUMN audio_url text,
  ADD COLUMN audio_duration integer;

-- Create storage bucket for call audio
INSERT INTO storage.buckets (id, name, public)
VALUES ('internal-calls', 'internal-calls', true);

-- Storage policies: authenticated users can upload
CREATE POLICY "Authenticated users can upload call audio"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'internal-calls');

-- Authenticated users can read
CREATE POLICY "Authenticated users can read call audio"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'internal-calls');

-- Authenticated users can delete own uploads
CREATE POLICY "Authenticated users can delete call audio"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'internal-calls');
