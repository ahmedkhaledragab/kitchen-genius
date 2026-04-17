import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Recipe, FavoriteRow } from "@/lib/recipe";

function recipeKey(r: Recipe) {
  return `${r.id ?? ""}::${r.title}`;
}

export function useFavorites() {
  const { user } = useAuth();
  const [items, setItems] = useState<FavoriteRow[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("favorites")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) {
      setItems(data as unknown as FavoriteRow[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isFavorite = useCallback(
    (r: Recipe) => {
      const key = recipeKey(r);
      return items.some((it) => {
        if (it.recipe_id && r.id && it.recipe_id === r.id) return true;
        const snap = it.recipe_snapshot;
        if (snap && recipeKey(snap) === key) return true;
        return false;
      });
    },
    [items],
  );

  const toggle = useCallback(
    async (r: Recipe) => {
      if (!user) return;
      const existing = items.find((it) => {
        if (it.recipe_id && r.id && it.recipe_id === r.id) return true;
        const snap = it.recipe_snapshot;
        if (snap && recipeKey(snap) === recipeKey(r)) return true;
        return false;
      });
      if (existing) {
        await supabase.from("favorites").delete().eq("id", existing.id);
      } else {
        await supabase.from("favorites").insert({
          user_id: user.id,
          recipe_id: r.id ?? null,
          recipe_snapshot: r.id ? null : (r as unknown as never),
        });
      }
      refresh();
    },
    [items, user, refresh],
  );

  return { items, loading, isFavorite, toggle, refresh };
}
