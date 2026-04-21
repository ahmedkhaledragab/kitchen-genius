-- Device-bound usage counters: same daily limit applies across all accounts on same device/IP
CREATE TABLE public.device_usage_counters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  ip_address TEXT,
  feature TEXT NOT NULL,
  day DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'UTC')::date),
  used_count INTEGER NOT NULL DEFAULT 0,
  daily_limit INTEGER NOT NULL DEFAULT 4,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- One row per device+feature+day. IP is informational, not part of the key.
CREATE UNIQUE INDEX device_usage_counters_unique
  ON public.device_usage_counters (device_id, feature, day);

CREATE INDEX device_usage_counters_ip_idx
  ON public.device_usage_counters (ip_address, feature, day);

ALTER TABLE public.device_usage_counters ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write directly. The edge function uses service role.
CREATE POLICY "Admins manage device usage"
  ON public.device_usage_counters
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Atomic check-and-increment for device-level limits.
-- Treats device_id as primary identity; falls back to IP if device_id missing.
-- Admins bypass the limit (consistent with check_and_increment_usage).
CREATE OR REPLACE FUNCTION public.check_and_increment_device_usage(
  _user_id UUID,
  _device_id TEXT,
  _ip TEXT,
  _feature TEXT,
  _default_limit INTEGER DEFAULT 4
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today DATE := (now() AT TIME ZONE 'UTC')::date;
  _row public.device_usage_counters%ROWTYPE;
  _key TEXT;
BEGIN
  -- Admins bypass device limits.
  IF _user_id IS NOT NULL AND public.has_role(_user_id, 'admin') THEN
    RETURN jsonb_build_object('allowed', true, 'admin', true);
  END IF;

  -- Use device_id as identity, fall back to IP if device_id missing.
  _key := COALESCE(NULLIF(trim(_device_id), ''), 'ip:' || COALESCE(_ip, 'unknown'));

  -- Ensure row exists.
  INSERT INTO public.device_usage_counters(device_id, ip_address, feature, day, used_count, daily_limit)
  VALUES (_key, _ip, _feature, _today, 0, _default_limit)
  ON CONFLICT (device_id, feature, day) DO NOTHING;

  SELECT * INTO _row
  FROM public.device_usage_counters
  WHERE device_id = _key AND feature = _feature AND day = _today
  FOR UPDATE;

  -- Keep limit in sync with current admin setting (so admin changes apply same day).
  IF _row.daily_limit <> _default_limit THEN
    UPDATE public.device_usage_counters
    SET daily_limit = _default_limit, updated_at = now()
    WHERE id = _row.id
    RETURNING * INTO _row;
  END IF;

  IF _row.used_count >= _row.daily_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'device_limit_reached',
      'used', _row.used_count,
      'limit', _row.daily_limit
    );
  END IF;

  UPDATE public.device_usage_counters
  SET used_count = used_count + 1,
      ip_address = COALESCE(_ip, ip_address),
      updated_at = now()
  WHERE id = _row.id
  RETURNING * INTO _row;

  RETURN jsonb_build_object(
    'allowed', true,
    'used', _row.used_count,
    'limit', _row.daily_limit
  );
END;
$$;