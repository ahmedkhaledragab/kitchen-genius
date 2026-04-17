
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

-- Public can read individual avatar files (must be inside a user folder)
CREATE POLICY "Avatar files are publicly readable"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND position('/' in name) > 0
  );
