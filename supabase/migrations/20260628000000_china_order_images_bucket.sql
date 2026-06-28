INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'china-order-images',
  'china-order-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow anon uploads to china-order-images"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'china-order-images');

CREATE POLICY "Allow public read of china-order-images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'china-order-images');
