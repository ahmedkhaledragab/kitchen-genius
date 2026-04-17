import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import type { Recipe, FavoriteRow } from "@/lib/recipe";

function recipeKey(r: Recipe) {
  return `${r.id ?? ""}::${r.title}`;
}

export function useFavorites() {
  const { user } = useAuth();
  const { t } = useLang();
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
        const { error } = await supabase.from("favorites").delete().eq("id", existing.id);
        if (error) {
          toast.error(t.recipe.favoriteError);
          return;
        }
        toast.success(t.recipe.favoriteRemoved);
      } else {
        const { error } = await supabase.from("favorites").insert({
          user_id: user.id,
          recipe_id: r.id ?? null,
          recipe_snapshot: r.id ? null : (r as unknown as never),
        });
        if (error) {
          toast.error(t.recipe.favoriteError);
          return;
        }
        toast.success(t.recipe.favoriteAdded);
      }
      refresh();
    },
    [items, user, refresh, t],
  );

  return { items, loading, isFavorite, toggle, refresh };
}
