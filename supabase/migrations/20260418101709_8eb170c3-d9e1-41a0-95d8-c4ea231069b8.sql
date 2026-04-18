-- Ingredient categories table
CREATE TABLE public.ingredient_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ingredient_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active ingredient categories viewable by everyone"
ON public.ingredient_categories FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert ingredient categories"
ON public.ingredient_categories FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update ingredient categories"
ON public.ingredient_categories FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete ingredient categories"
ON public.ingredient_categories FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_ingredient_categories_updated_at
BEFORE UPDATE ON public.ingredient_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recipe cuisines table
CREATE TABLE public.recipe_cuisines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recipe_cuisines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active recipe cuisines viewable by everyone"
ON public.recipe_cuisines FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert recipe cuisines"
ON public.recipe_cuisines FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update recipe cuisines"
ON public.recipe_cuisines FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete recipe cuisines"
ON public.recipe_cuisines FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_recipe_cuisines_updated_at
BEFORE UPDATE ON public.recipe_cuisines
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed from existing data
INSERT INTO public.ingredient_categories (slug, name_ar, name_en, sort_order)
SELECT DISTINCT
  lower(trim(category)) AS slug,
  category AS name_ar,
  category AS name_en,
  0
FROM public.ingredients_catalog
WHERE category IS NOT NULL AND trim(category) <> ''
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.recipe_cuisines (slug, name_ar, name_en, sort_order)
SELECT DISTINCT
  lower(trim(cuisine)) AS slug,
  cuisine AS name_ar,
  cuisine AS name_en,
  0
FROM public.recipes
WHERE cuisine IS NOT NULL AND trim(cuisine) <> ''
ON CONFLICT (slug) DO NOTHING;