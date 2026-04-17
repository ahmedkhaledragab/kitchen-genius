import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { RecipeCard } from "@/components/RecipeCard";
import { RecipeDetail } from "@/components/RecipeDetail";
import type { Recipe, Difficulty } from "@/lib/recipe";
import { toast } from "sonner";

export const Route = createFileRoute("/recipes")({
  head: () => ({
    meta: [
      { title: "كل الوصفات — من اللي عندك؟" },
      { name: "description", content: "استعرض كل الوصفات المنشورة وابحث وفلتر بالصعوبة والتاج." },
    ],
  }),
  component: RecipesPage,
});

const DIFFS: { key: Difficulty | "all"; ar: string; en: string }[] = [
  { key: "all", ar: "الكل", en: "All" },
  { key: "easy", ar: "سهل", en: "Easy" },
  { key: "medium", ar: "متوسط", en: "Medium" },
  { key: "hard", ar: "صعب", en: "Hard" },
];

function RecipesPage() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const { isFavorite, toggle } = useFavorites();

  const [all, setAll] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [diff, setDiff] = useState<Difficulty | "all">("all");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [open, setOpen] = useState<Recipe | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      setLoading(false);
      if (error) {
        console.error(error);
        toast.error(t.common.error);
        return;
      }
      const mapped = (data ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description ?? "",
        ingredients: (r.ingredients as string[]) ?? [],
        missing_ingredients: (r.missing_ingredients as string[]) ?? [],
        steps: (r.steps as string[]) ?? [],
        estimated_time_minutes: r.estimated_time_minutes ?? 0,
        difficulty: r.difficulty as Difficulty,
        tags: r.tags ?? [],
        cuisine: r.cuisine ?? undefined,
        language: r.language,
        image_url: r.image_url,
      })) satisfies Recipe[];
      setAll(mapped);
    })();
  }, [t.common.error]);

  const tags = useMemo(() => {
    const s = new Set<string>();
    all.forEach((r) => r.tags?.forEach((tg) => s.add(tg)));
    return Array.from(s).slice(0, 12);
  }, [all]);

  const filtered = useMemo(() => {
    const lc = q.trim().toLowerCase();
    return all.filter((r) => {
      if (diff !== "all" && r.difficulty !== diff) return false;
      if (activeTag && !r.tags?.includes(activeTag)) return false;
      if (!lc) return true;
      return (
        r.title.toLowerCase().includes(lc) ||
        r.description?.toLowerCase().includes(lc) ||
        r.ingredients.some((i) => i.toLowerCase().includes(lc))
      );
    });
  }, [all, q, diff, activeTag]);

  const handleFav = (r: Recipe) => {
    if (!user) {
      toast.info(t.recipe.loginToSave);
      return;
    }
    toggle(r);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:pt-10">
      <header className="mb-6">
        <h1 className="text-3xl font-black sm:text-4xl">
          <span className="gradient-text">{lang === "ar" ? "كل الوصفات" : "All recipes"}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {lang === "ar" ? "ابحث وفلتر بين الوصفات المنشورة." : "Search and filter our recipes."}
        </p>
      </header>

      <Card className="rounded-3xl border-border/60 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={lang === "ar" ? "ابحث باسم الوصفة أو مكون..." : "Search by name or ingredient..."}
            className="ps-9 rounded-xl"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {DIFFS.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setDiff(d.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                diff === d.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {lang === "ar" ? d.ar : d.en}
            </button>
          ))}
        </div>

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                activeTag === null
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-dashed border-border text-muted-foreground hover:border-accent hover:text-accent"
              }`}
            >
              {lang === "ar" ? "كل التصنيفات" : "All tags"}
            </button>
            {tags.map((tg) => (
              <button
                key={tg}
                type="button"
                onClick={() => setActiveTag(activeTag === tg ? null : tg)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  activeTag === tg
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-dashed border-border text-muted-foreground hover:border-accent hover:text-accent"
                }`}
              >
                #{tg}
              </button>
            ))}
          </div>
        )}
      </Card>

      <section className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="rounded-2xl bg-muted p-8 text-center text-sm text-muted-foreground">
            {lang === "ar" ? "مفيش وصفات مطابقة." : "No matching recipes."}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r, i) => (
              <RecipeCard
                key={r.id ?? `${r.title}-${i}`}
                recipe={r}
                index={i}
                onOpen={() => setOpen(r)}
                onToggleFavorite={() => handleFav(r)}
                isFavorite={isFavorite(r)}
              />
            ))}
          </div>
        )}
      </section>

      <RecipeDetail
        recipe={open}
        onClose={() => setOpen(null)}
        onToggleFavorite={open ? () => handleFav(open) : undefined}
        isFavorite={open ? isFavorite(open) : false}
        canFavorite={!!user}
      />
    </div>
  );
}
