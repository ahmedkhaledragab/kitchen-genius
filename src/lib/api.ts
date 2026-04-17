import { supabase } from "@/integrations/supabase/client";
import type { Recipe } from "@/lib/recipe";

export async function generateRecipes(input: {
  ingredients: string[];
  exclude?: string[];
  filters?: string[];
  language: "ar" | "en";
}): Promise<{ recipes: Recipe[] } | { error: string; message?: string }> {
  const { data, error } = await supabase.functions.invoke("generate-recipes", {
    body: input,
  });
  if (error) {
    // try to read structured error
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
  return data as { recipes: Recipe[] };
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
