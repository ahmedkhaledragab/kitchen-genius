
-- 1) profiles: ban/unban
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 2) usage limits per user per day
CREATE TABLE IF NOT EXISTS public.usage_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  feature text NOT NULL CHECK (feature IN ('generate_recipes','detect_ingredients')),
  used_count integer NOT NULL DEFAULT 0,
  daily_limit integer NOT NULL DEFAULT 10,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature, day)
);

CREATE INDEX IF NOT EXISTS idx_usage_counters_user_day ON public.usage_counters(user_id, day);

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own usage" ON public.usage_counters;
CREATE POLICY "Users can view own usage"
  ON public.usage_counters FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage usage" ON public.usage_counters;
CREATE POLICY "Admins manage usage"
  ON public.usage_counters FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) atomic check+increment usage helper (used by edge functions)
CREATE OR REPLACE FUNCTION public.check_and_increment_usage(
  _user_id uuid,
  _feature text,
  _default_limit integer DEFAULT 10
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today date := (now() AT TIME ZONE 'UTC')::date;
  _is_active boolean;
  _row public.usage_counters%ROWTYPE;
BEGIN
  -- check active
  SELECT is_active INTO _is_active FROM public.profiles WHERE id = _user_id;
  IF _is_active IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_profile');
  END IF;
  IF _is_active = false THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'banned');
  END IF;

  -- admins bypass limits
  IF public.has_role(_user_id, 'admin') THEN
    INSERT INTO public.usage_counters(user_id, feature, day, used_count, daily_limit)
    VALUES (_user_id, _feature, _today, 1, _default_limit)
    ON CONFLICT (user_id, feature, day) DO UPDATE
      SET used_count = public.usage_counters.used_count + 1,
          updated_at = now()
    RETURNING * INTO _row;
    RETURN jsonb_build_object('allowed', true, 'used', _row.used_count, 'limit', _row.daily_limit, 'admin', true);
  END IF;

  -- ensure row exists
  INSERT INTO public.usage_counters(user_id, feature, day, used_count, daily_limit)
  VALUES (_user_id, _feature, _today, 0, _default_limit)
  ON CONFLICT (user_id, feature, day) DO NOTHING;

  SELECT * INTO _row FROM public.usage_counters
    WHERE user_id = _user_id AND feature = _feature AND day = _today
    FOR UPDATE;

  IF _row.used_count >= _row.daily_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'limit_reached', 'used', _row.used_count, 'limit', _row.daily_limit);
  END IF;

  UPDATE public.usage_counters
    SET used_count = used_count + 1, updated_at = now()
    WHERE id = _row.id
    RETURNING * INTO _row;

  RETURN jsonb_build_object('allowed', true, 'used', _row.used_count, 'limit', _row.daily_limit);
END;
$$;

-- 4) admin list view function
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id uuid,
  email text,
  display_name text,
  avatar_url text,
  is_active boolean,
  is_admin boolean,
  created_at timestamptz,
  recipes_today integer,
  recipes_limit integer,
  fridge_today integer,
  fridge_limit integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.display_name,
    p.avatar_url,
    p.is_active,
    EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin') AS is_admin,
    p.created_at,
    COALESCE((SELECT used_count FROM public.usage_counters
              WHERE user_id = p.id AND feature = 'generate_recipes'
                AND day = (now() AT TIME ZONE 'UTC')::date), 0) AS recipes_today,
    COALESCE((SELECT daily_limit FROM public.usage_counters
              WHERE user_id = p.id AND feature = 'generate_recipes'
                AND day = (now() AT TIME ZONE 'UTC')::date),
             10) AS recipes_limit,
    COALESCE((SELECT used_count FROM public.usage_counters
              WHERE user_id = p.id AND feature = 'detect_ingredients'
                AND day = (now() AT TIME ZONE 'UTC')::date), 0) AS fridge_today,
    COALESCE((SELECT daily_limit FROM public.usage_counters
              WHERE user_id = p.id AND feature = 'detect_ingredients'
                AND day = (now() AT TIME ZONE 'UTC')::date),
             5) AS fridge_limit
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- 5) admin actions: set status, set role, set limit
CREATE OR REPLACE FUNCTION public.admin_set_user_status(_user_id uuid, _is_active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles SET is_active = _is_active, updated_at = now() WHERE id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_role(_user_id uuid, _make_admin boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _make_admin THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (_user_id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_limit(
  _user_id uuid, _feature text, _new_limit integer
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _today date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _feature NOT IN ('generate_recipes','detect_ingredients') THEN
    RAISE EXCEPTION 'invalid_feature';
  END IF;
  INSERT INTO public.usage_counters(user_id, feature, day, used_count, daily_limit)
  VALUES (_user_id, _feature, _today, 0, _new_limit)
  ON CONFLICT (user_id, feature, day) DO UPDATE
    SET daily_limit = _new_limit, updated_at = now();
END;
$$;
