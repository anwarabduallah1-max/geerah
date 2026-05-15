
DROP POLICY IF EXISTS "Jeera box images are public" ON storage.objects;

CREATE POLICY "Donors can list their own jeera box images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'jeera-box-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
