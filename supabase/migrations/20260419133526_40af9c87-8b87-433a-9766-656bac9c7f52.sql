DROP FUNCTION IF EXISTS public.admin_list_users();

CREATE OR REPLACE FUNCTION public.admin_list_users()
 RETURNS TABLE(id uuid, email text, display_name text, avatar_url text, phone text, is_active boolean, is_admin boolean, created_at timestamp with time zone, recipes_today integer, recipes_limit integer, fridge_today integer, fridge_limit integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    p.phone,
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
$function$;