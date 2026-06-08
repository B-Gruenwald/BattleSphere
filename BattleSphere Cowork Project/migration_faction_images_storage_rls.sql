-- Storage RLS policies for faction-images bucket

-- Public read
CREATE POLICY "faction-images: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'faction-images');

-- Authenticated users can upload
CREATE POLICY "faction-images: authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'faction-images');

-- Authenticated users can replace (upsert uses UPDATE)
CREATE POLICY "faction-images: authenticated update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'faction-images');

-- Authenticated users can delete
CREATE POLICY "faction-images: authenticated delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'faction-images');
