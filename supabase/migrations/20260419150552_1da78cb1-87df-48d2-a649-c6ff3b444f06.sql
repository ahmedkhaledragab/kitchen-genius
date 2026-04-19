ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS pwa_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pwa_short_name_ar text,
  ADD COLUMN IF NOT EXISTS pwa_short_name_en text,
  ADD COLUMN IF NOT EXISTS pwa_theme_color text DEFAULT '#16a34a',
  ADD COLUMN IF NOT EXISTS pwa_background_color text DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS pwa_icon_192_url text,
  ADD COLUMN IF NOT EXISTS pwa_icon_512_url text,
  ADD COLUMN IF NOT EXISTS pwa_apple_touch_icon_url text,
  ADD COLUMN IF NOT EXISTS pwa_display text NOT NULL DEFAULT 'standalone';