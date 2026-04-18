-- Create pages_content table for editable site pages (about/features/contact)
CREATE TABLE public.pages_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_key TEXT NOT NULL UNIQUE,
  content_ar JSONB NOT NULL DEFAULT '{}'::jsonb,
  content_en JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.pages_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads pages_content"
  ON public.pages_content FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "admins insert pages_content"
  ON public.pages_content FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update pages_content"
  ON public.pages_content FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete pages_content"
  ON public.pages_content FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER pages_content_set_updated_at
  BEFORE UPDATE ON public.pages_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default rows for the three pages so the editor has something to load
INSERT INTO public.pages_content (page_key, content_ar, content_en) VALUES
('about', '{}'::jsonb, '{}'::jsonb),
('features', '{}'::jsonb, '{}'::jsonb),
('contact', '{}'::jsonb, '{}'::jsonb);