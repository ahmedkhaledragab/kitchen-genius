ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_theme text NOT NULL DEFAULT 'light'
CHECK (preferred_theme IN ('light', 'dark'));