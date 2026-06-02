ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS pdf_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('pdfs', 'pdfs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "pdfs: user owns folder" ON storage.objects
  FOR ALL
  USING  (bucket_id = 'pdfs' AND auth.uid()::text = (string_to_array(name, '/'))[1])
  WITH CHECK (bucket_id = 'pdfs' AND auth.uid()::text = (string_to_array(name, '/'))[1]);
