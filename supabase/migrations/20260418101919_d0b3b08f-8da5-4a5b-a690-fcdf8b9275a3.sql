ALTER TABLE public.ingredient_categories ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE public.recipe_cuisines ADD COLUMN IF NOT EXISTS icon TEXT;