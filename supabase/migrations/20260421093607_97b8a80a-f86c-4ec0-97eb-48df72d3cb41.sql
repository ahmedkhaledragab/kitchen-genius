-- Kitchens table: distinct from recipe_cuisines (which tags recipes).
-- This catalog drives the home-page "pick your kitchen first" flow.
CREATE TABLE public.kitchens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  icon text,
  description_ar text,
  description_en text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kitchens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active kitchens viewable by everyone"
  ON public.kitchens FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert kitchens"
  ON public.kitchens FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update kitchens"
  ON public.kitchens FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete kitchens"
  ON public.kitchens FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_kitchens_updated_at
  BEFORE UPDATE ON public.kitchens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Many-to-many: an ingredient can belong to multiple kitchens
CREATE TABLE public.ingredient_kitchens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid NOT NULL REFERENCES public.ingredients_catalog(id) ON DELETE CASCADE,
  kitchen_id uuid NOT NULL REFERENCES public.kitchens(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ingredient_id, kitchen_id)
);

CREATE INDEX idx_ingredient_kitchens_ingredient ON public.ingredient_kitchens(ingredient_id);
CREATE INDEX idx_ingredient_kitchens_kitchen ON public.ingredient_kitchens(kitchen_id);

ALTER TABLE public.ingredient_kitchens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ingredient kitchens"
  ON public.ingredient_kitchens FOR SELECT
  USING (true);

CREATE POLICY "Admins manage ingredient kitchens"
  ON public.ingredient_kitchens FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Seed a few starter kitchens
INSERT INTO public.kitchens (slug, name_ar, name_en, icon, sort_order) VALUES
  ('egyptian', 'مصري', 'Egyptian', '🇪🇬', 10),
  ('levantine', 'شامي', 'Levantine', '🥙', 20),
  ('italian', 'إيطالي', 'Italian', '🍝', 30),
  ('asian', 'آسيوي', 'Asian', '🍜', 40),
  ('indian', 'هندي', 'Indian', '🍛', 50),
  ('mexican', 'مكسيكي', 'Mexican', '🌮', 60),
  ('general', 'عام', 'General', '🍳', 1);