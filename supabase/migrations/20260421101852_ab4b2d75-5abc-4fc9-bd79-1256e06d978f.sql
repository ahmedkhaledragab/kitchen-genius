-- Rename junction from "links" semantics to "excludes" semantics.
-- Default: all ingredients show in all kitchens. Admin can exclude specific ones.
ALTER TABLE public.ingredient_kitchens RENAME TO ingredient_kitchen_excludes;