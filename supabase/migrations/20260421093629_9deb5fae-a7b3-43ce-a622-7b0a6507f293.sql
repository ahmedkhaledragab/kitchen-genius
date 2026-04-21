-- Replace the catch-all ALL policy with explicit per-action policies
DROP POLICY IF EXISTS "Admins manage ingredient kitchens" ON public.ingredient_kitchens;

CREATE POLICY "Admins insert ingredient kitchens"
  ON public.ingredient_kitchens FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update ingredient kitchens"
  ON public.ingredient_kitchens FOR UPDATE
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete ingredient kitchens"
  ON public.ingredient_kitchens FOR DELETE
  USING (has_role(auth.uid(), 'admin'));