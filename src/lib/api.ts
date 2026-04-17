import { supabase } from "@/integrations/supabase/client";
import type { Recipe } from "@/lib/recipe";

export async function generateRecipes(input: {
  ingredients: string[];
  exclude?: string[];
  filters?: string[];
  language: "ar" | "en";
}): Promise<{ recipes: Recipe[]; source?: "local" | "ai" } | { error: string; message?: string }> {
  const { data, error } = await supabase.functions.invoke("generate-recipes", {
    body: input,
  });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const parsed = await ctx.json();
        return { error: parsed.error ?? "error", message: parsed.message };
      } catch {
        /* ignore */
      }
    }
    return { error: "error", message: error.message };
  }
  const payload = data as { recipes: Recipe[]; source?: "local" | "ai" };
  const tagged = (payload.recipes ?? []).map((r) => ({
    ...r,
    source: r.source ?? payload.source ?? "ai",
  }));
  return { recipes: tagged, source: payload.source ?? "ai" };
}

export async function detectIngredientsFromImage(input: {
  imageBase64: string;
  language: "ar" | "en";
}): Promise<{ ingredients: string[] } | { error: string }> {
  const { data, error } = await supabase.functions.invoke("detect-ingredients", {
    body: input,
  });
  if (error) return { error: error.message };
  return data as { ingredients: string[] };
}
