
INSERT INTO storage.buckets (id, name, public) VALUES ('jeera-box-images', 'jeera-box-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Jeera box images are public" ON storage.objects
FOR SELECT USING (bucket_id = 'jeera-box-images');

CREATE POLICY "Users can upload jeera box images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'jeera-box-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their jeera box images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'jeera-box-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their jeera box images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'jeera-box-images' AND auth.uid()::text = (storage.foldername(name))[1]);
