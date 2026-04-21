import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface KitchenOption {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  icon: string | null;
  description_ar: string | null;
  description_en: string | null;
  sort_order: number;
  is_active: boolean;
}

// `kitchens` is a new table that may not yet appear in the auto-generated
// supabase types. Cast through `any` to keep typecheck calm without blocking.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

/**
 * Fetches active kitchens once. Used by both the home page (kitchen picker)
 * and admin pages that need to associate ingredients with kitchens.
 */
export function useKitchens() {
  const [items, setItems] = useState<KitchenOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await sb
        .from("kitchens")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name_ar", { ascending: true });
      if (cancelled) return;
      setItems((data ?? []) as KitchenOption[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const bySlug = useMemo(() => {
    const map = new Map<string, KitchenOption>();
    for (const it of items) map.set(it.slug, it);
    return map;
  }, [items]);

  const byId = useMemo(() => {
    const map = new Map<string, KitchenOption>();
    for (const it of items) map.set(it.id, it);
    return map;
  }, [items]);

  return { items, loading, bySlug, byId };
}
