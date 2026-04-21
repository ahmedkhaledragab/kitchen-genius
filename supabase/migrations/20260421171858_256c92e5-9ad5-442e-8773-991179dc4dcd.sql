CREATE OR REPLACE FUNCTION public.check_and_increment_device_usage(
  _user_id uuid,
  _device_id text,
  _ip text,
  _feature text,
  _default_limit integer DEFAULT 4
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _today DATE := (now() AT TIME ZONE 'UTC')::date;
  _device_row public.device_usage_counters%ROWTYPE;
  _ip_row public.device_usage_counters%ROWTYPE;
  _device_key TEXT;
  _ip_key TEXT;
  _clean_ip TEXT;
  _used INT := 0;
  _limit INT := _default_limit;
BEGIN
  -- Admins bypass device limits.
  IF _user_id IS NOT NULL AND public.has_role(_user_id, 'admin') THEN
    RETURN jsonb_build_object('allowed', true, 'admin', true);
  END IF;

  _clean_ip := NULLIF(trim(_ip), '');
  _device_key := NULLIF(trim(_device_id), '');
  _ip_key := CASE WHEN _clean_ip IS NOT NULL THEN 'ip:' || _clean_ip ELSE NULL END;

  -- Fall back: if neither identity present, use 'unknown' so we still cap.
  IF _device_key IS NULL AND _ip_key IS NULL THEN
    _device_key := 'unknown';
  END IF;

  -- ===== Device fingerprint check (if available) =====
  IF _device_key IS NOT NULL THEN
    INSERT INTO public.device_usage_counters(device_id, ip_address, feature, day, used_count, daily_limit)
    VALUES (_device_key, _clean_ip, _feature, _today, 0, _default_limit)
    ON CONFLICT (device_id, feature, day) DO NOTHING;

    SELECT * INTO _device_row
    FROM public.device_usage_counters
    WHERE device_id = _device_key AND feature = _feature AND day = _today
    FOR UPDATE;

    IF _device_row.daily_limit <> _default_limit THEN
      UPDATE public.device_usage_counters
      SET daily_limit = _default_limit, updated_at = now()
      WHERE id = _device_row.id
      RETURNING * INTO _device_row;
    END IF;

    IF _device_row.used_count >= _device_row.daily_limit THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'device_limit_reached',
        'used', _device_row.used_count,
        'limit', _device_row.daily_limit,
        'scope_detail', 'device'
      );
    END IF;

    _used := GREATEST(_used, _device_row.used_count);
    _limit := _device_row.daily_limit;
  END IF;

  -- ===== IP / router check (shared across all browsers behind same router) =====
  IF _ip_key IS NOT NULL THEN
    INSERT INTO public.device_usage_counters(device_id, ip_address, feature, day, used_count, daily_limit)
    VALUES (_ip_key, _clean_ip, _feature, _today, 0, _default_limit)
    ON CONFLICT (device_id, feature, day) DO NOTHING;

    SELECT * INTO _ip_row
    FROM public.device_usage_counters
    WHERE device_id = _ip_key AND feature = _feature AND day = _today
    FOR UPDATE;

    IF _ip_row.daily_limit <> _default_limit THEN
      UPDATE public.device_usage_counters
      SET daily_limit = _default_limit, updated_at = now()
      WHERE id = _ip_row.id
      RETURNING * INTO _ip_row;
    END IF;

    IF _ip_row.used_count >= _ip_row.daily_limit THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'device_limit_reached',
        'used', _ip_row.used_count,
        'limit', _ip_row.daily_limit,
        'scope_detail', 'ip'
      );
    END IF;

    _used := GREATEST(_used, _ip_row.used_count);
    _limit := _ip_row.daily_limit;
  END IF;

  -- ===== Both checks passed → increment both counters =====
  IF _device_key IS NOT NULL THEN
    UPDATE public.device_usage_counters
    SET used_count = used_count + 1,
        ip_address = COALESCE(_clean_ip, ip_address),
        updated_at = now()
    WHERE id = _device_row.id
    RETURNING * INTO _device_row;
    _used := GREATEST(_used, _device_row.used_count);
    _limit := _device_row.daily_limit;
  END IF;

  IF _ip_key IS NOT NULL THEN
    UPDATE public.device_usage_counters
    SET used_count = used_count + 1,
        ip_address = COALESCE(_clean_ip, ip_address),
        updated_at = now()
    WHERE id = _ip_row.id
    RETURNING * INTO _ip_row;
    _used := GREATEST(_used, _ip_row.used_count);
    _limit := _ip_row.daily_limit;
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'used', _used,
    'limit', _limit
  );
END;
$function$;