
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS recipes_target_count integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS recipes_daily_limit integer NOT NULL DEFAULT 4;

-- Backfill the singleton row with the new defaults (no-op if already set)
UPDATE public.site_settings
SET recipes_target_count = COALESCE(recipes_target_count, 3),
    recipes_daily_limit = COALESCE(recipes_daily_limit, 4)
WHERE singleton = true;
