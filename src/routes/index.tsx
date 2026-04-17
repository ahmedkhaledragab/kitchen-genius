import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Sparkles, X, Image as ImageIcon, Loader2, ChefHat } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { generateRecipes, detectIngredientsFromImage } from "@/lib/api";
import { COMMON_INGREDIENTS_AR, COMMON_INGREDIENTS_EN } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import type { Recipe } from "@/lib/recipe";
import { RecipeCard } from "@/components/RecipeCard";
import { RecipeDetail } from "@/components/RecipeDetail";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "من اللي عندك؟ — وصفات سريعة من مكوناتك" },
      {
        name: "description",
        content: "أدخل مكوناتك وخلي الذكاء الاصطناعي يقترح وصفات تقدر تعملها دلوقتي.",
      },
    ],
  }),
  component: HomePage,
});

const FILTERS = [
  { key: "quick", labelKey: "filterQuick" },
  { key: "budget", labelKey: "filterBudget" },
  { key: "healthy", labelKey: "filterHealthy" },
  { key: "arabic", labelKey: "filterArab" },
] as const;

function HomePage() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const navigate = useNavigate();

  const [ingredients, setIngredients] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [excludeInput, setExcludeInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [openRecipe, setOpenRecipe] = useState<Recipe | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Live ingredient suggestions from the admin-managed catalog (with fallback
  // to the hardcoded list if the catalog is empty or fails to load).
  const [catalogAr, setCatalogAr] = useState<string[]>([]);
  const [catalogEn, setCatalogEn] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("ingredients_catalog")
      .select("name_ar, name_en")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(500)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setCatalogAr(data.map((d) => d.name_ar));
        setCatalogEn(data.map((d) => d.name_en));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // When the user switches language, clear stale results & inputs so they
  // don't see Arabic recipes while browsing in English (or vice versa).
  useEffect(() => {
    setRecipes(null);
    setOpenRecipe(null);
    setIngredients([]);
    setExcluded([]);
    setInput("");
    setExcludeInput("");
  }, [lang]);

  const suggestions = useMemo(() => {
    const fromCatalog = lang === "ar" ? catalogAr : catalogEn;
    const fallback = lang === "ar" ? COMMON_INGREDIENTS_AR : COMMON_INGREDIENTS_EN;
    const all = fromCatalog.length > 0 ? fromCatalog : fallback;
    const lc = input.trim().toLowerCase();
    const filtered = all
      .filter(
        (s) =>
          !ingredients.includes(s) &&
          !excluded.includes(s) &&
          (lc ? s.toLowerCase().includes(lc) : true),
      )
      .slice(0, lc ? 10 : 16);
    return filtered;
  }, [input, ingredients, excluded, lang, catalogAr, catalogEn]);

  const addIngredient = (val: string) => {
    const v = val.trim();
    if (!v) return;
    if (ingredients.includes(v)) return;
    setIngredients((prev) => [...prev, v]);
    setInput("");
  };
  const removeIngredient = (v: string) =>
    setIngredients((prev) => prev.filter((x) => x !== v));

  const addExclude = (val: string) => {
    const v = val.trim();
    if (!v || excluded.includes(v)) return;
    setExcluded((prev) => [...prev, v]);
    setExcludeInput("");
  };
  const removeExclude = (v: string) =>
    setExcluded((prev) => prev.filter((x) => x !== v));

  const toggleFilter = (key: string) =>
    setActiveFilters((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key],
    );

  const handleCook = async () => {
    if (ingredients.length === 0) {
      toast.error(t.home.noIngredients);
      return;
    }
    if (!user) {
      toast.info(lang === "ar" ? "سجل دخول علشان نولّد لك وصفة" : "Sign in to generate a recipe");
      navigate({ to: "/auth" });
      return;
    }
    setLoading(true);
    setRecipes(null);
    const res = await generateRecipes({
      ingredients,
      exclude: excluded,
      filters: activeFilters,
      language: lang,
    });
    setLoading(false);
    if ("error" in res) {
      toast.error(res.message ?? t.common.error);
      return;
    }
    setRecipes(res.recipes ?? []);
    setTimeout(() => {
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleImage = async (file: File) => {
    if (!user) {
      toast.info(lang === "ar" ? "سجل دخول علشان نتعرف على المكونات" : "Sign in to detect ingredients");
      navigate({ to: "/auth" });
      return;
    }
    setImageBusy(true);
    try {
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await detectIngredientsFromImage({ imageBase64: dataUrl, language: lang });
      if ("error" in res) {
        toast.error(t.common.error);
      } else {
        const fresh = (res.ingredients || []).filter(
          (i) => !ingredients.includes(i) && !excluded.includes(i),
        );
        setIngredients((prev) => [...prev, ...fresh]);
        toast.success(`+${fresh.length}`);
      }
    } finally {
      setImageBusy(false);
    }
  };

  const handleToggleFavorite = (r: Recipe) => {
    if (!user) {
      toast.info(t.recipe.loginToSave);
      return;
    }
    toggle(r);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-6 sm:pt-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl gradient-hero p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-card/70 px-3 py-1 text-xs font-semibold text-primary backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            مدعوم بالذكاء الاصطناعي
          </div>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
            <span className="gradient-text">{t.home.heroTitle}</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
            {t.home.heroSub}
          </p>
        </motion.div>
      </section>

      {/* Ingredients input */}
      <Card className="mt-6 rounded-3xl border-border/60 bg-card p-5 shadow-card">
        <label className="text-sm font-bold">{t.home.ingredientsLabel}</label>
        <div className="mt-2 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.home.ingredientsPlaceholder}
            className="rounded-xl"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addIngredient(input);
              }
            }}
          />
          <Button
            type="button"
            onClick={() => addIngredient(input)}
            className="rounded-xl gradient-primary text-primary-foreground hover:opacity-95"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t.home.addBtn}</span>
          </Button>
        </div>

        {ingredients.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ingredients.map((ing) => (
              <button
                key={ing}
                type="button"
                onClick={() => removeIngredient(ing)}
                className="group inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"
              >
                {ing}
                <X className="h-3 w-3 opacity-60 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-muted-foreground">{t.home.suggestions}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addIngredient(s)}
                  className="rounded-full border border-dashed border-border bg-background px-3 py-1 text-xs text-muted-foreground transition hover:border-primary hover:bg-primary/5 hover:text-primary"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Exclude */}
        <div className="mt-5">
          <label className="text-sm font-bold">{t.home.excludeLabel}</label>
          <div className="mt-2 flex gap-2">
            <Input
              value={excludeInput}
              onChange={(e) => setExcludeInput(e.target.value)}
              placeholder={t.home.excludePlaceholder}
              className="rounded-xl"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addExclude(excludeInput);
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => addExclude(excludeInput)}
              className="rounded-xl border-accent/40 text-accent hover:bg-accent/10"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {excluded.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {excluded.map((ing) => (
                <button
                  key={ing}
                  type="button"
                  onClick={() => removeExclude(ing)}
                  className="group inline-flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent hover:bg-accent/20"
                >
                  {ing}
                  <X className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="mt-5">
          <p className="text-sm font-bold">{t.home.filters}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {FILTERS.map((f) => {
              const active = activeFilters.includes(f.key);
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => toggleFilter(f.key)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary hover:text-primary"
                  }`}
                >
                  {t.home[f.labelKey as keyof typeof t.home]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Image upload */}
        <div className="mt-5 rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-center">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImage(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={imageBusy}
            className="inline-flex items-center gap-2 rounded-xl bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-card hover:bg-secondary"
          >
            {imageBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            {t.home.uploadFridge}
          </button>
          <p className="mt-1.5 text-[11px] text-muted-foreground">{t.home.uploadHint}</p>
        </div>

        <Button
          type="button"
          onClick={handleCook}
          disabled={loading}
          className="mt-6 h-14 w-full rounded-2xl gradient-accent text-lg font-black text-accent-foreground shadow-warm hover:opacity-95"
        >
          {loading ? (
            <>
              <Loader2 className="me-1 h-5 w-5 animate-spin" />
              {t.home.generating}
            </>
          ) : (
            <>
              <ChefHat className="me-1 h-5 w-5" />
              {t.home.cookBtn}
            </>
          )}
        </Button>
      </Card>

      {/* Results */}
      <section id="results" className="mt-8">
        {recipes && recipes.length === 0 && (
          <p className="rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">
            {t.home.noResults}
          </p>
        )}
        {recipes && recipes.length > 0 && (
          <>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-lg font-extrabold">{t.home.results}</h2>
              <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary border-0">
                {recipes.length}
              </Badge>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {recipes.map((r, i) => (
                <RecipeCard
                  key={`${r.title}-${i}`}
                  recipe={r}
                  index={i}
                  onOpen={() => setOpenRecipe(r)}
                  onToggleFavorite={() => handleToggleFavorite(r)}
                  isFavorite={isFavorite(r)}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <RecipeDetail
        recipe={openRecipe}
        onClose={() => setOpenRecipe(null)}
        onToggleFavorite={openRecipe ? () => handleToggleFavorite(openRecipe) : undefined}
        isFavorite={openRecipe ? isFavorite(openRecipe) : false}
        canFavorite={!!user}
      />
    </div>
  );
}
