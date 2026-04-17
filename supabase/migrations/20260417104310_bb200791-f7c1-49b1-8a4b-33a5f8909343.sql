-- Catalog of ingredients managed by admins. Used to power suggestions on the
-- home page beyond the hardcoded list.
CREATE TABLE public.ingredients_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text NOT NULL,
  category text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ingredients_catalog_unique_ar UNIQUE (name_ar),
  CONSTRAINT ingredients_catalog_unique_en UNIQUE (name_en)
);

CREATE INDEX idx_ingredients_active ON public.ingredients_catalog (is_active, sort_order);

ALTER TABLE public.ingredients_catalog ENABLE ROW LEVEL SECURITY;

-- Public can read active ingredients (used by home page suggestions)
CREATE POLICY "Active ingredients viewable by everyone"
  ON public.ingredients_catalog FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert ingredients"
  ON public.ingredients_catalog FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update ingredients"
  ON public.ingredients_catalog FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete ingredients"
  ON public.ingredients_catalog FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_ingredients_catalog_updated_at
  BEFORE UPDATE ON public.ingredients_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();