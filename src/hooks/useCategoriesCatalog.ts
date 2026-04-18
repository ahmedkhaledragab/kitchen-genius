import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CategoryOption {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

export function useCategoriesCatalog(
  table: "ingredient_categories" | "recipe_cuisines",
) {
  const [items, setItems] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from(table)
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name_ar", { ascending: true });
      if (cancelled) return;
      setItems((data ?? []) as CategoryOption[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [table]);

  return { items, loading };
}
