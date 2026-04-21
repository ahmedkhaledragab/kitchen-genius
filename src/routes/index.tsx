import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Sparkles, X, Loader2, ChefHat, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { useKitchens, type KitchenOption } from "@/hooks/useKitchens";
import { generateRecipes } from "@/lib/api";
import { COMMON_INGREDIENTS_AR, COMMON_INGREDIENTS_EN } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import type { Recipe } from "@/lib/recipe";
import { RecipeCard } from "@/components/RecipeCard";
import { RecipeDetail } from "@/components/RecipeDetail";
import { usePageContent } from "@/hooks/usePageContent";

const pick = (custom: string | undefined, fallback: string): string => {
  const v = (custom ?? "").trim();
  return v.length > 0 ? v : fallback;
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "من اللي عندك؟ — وصفات سريعة من مكوناتك" },
      {
        name: "description",
        content: "اختاري المطبخ المفضّل وأدخلي مكوناتك، وخلي الذكاء الاصطناعي يقترح وصفات تقدري تعمليها دلوقتي.",
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

// `ingredient_kitchens` is a new junction table that may not yet appear in the
// auto-generated supabase types. Cast through `any` while we wait for the types
// to refresh.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

function HomePage() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const navigate = useNavigate();
  const { content: c } = usePageContent("home");
  const { items: kitchens, loading: kitchensLoading } = useKitchens();

  // The user must pick a kitchen before seeing the ingredients UI.
  const [selectedKitchen, setSelectedKitchen] = useState<KitchenOption | null>(null);

  const [ingredients, setIngredients] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [excludeInput, setExcludeInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [openRecipe, setOpenRecipe] = useState<Recipe | null>(null);

  // Catalog of ingredients filtered by the selected kitchen.
  const [catalogAr, setCatalogAr] = useState<string[]>([]);
  const [catalogEn, setCatalogEn] = useState<string[]>([]);
  const [iconByName, setIconByName] = useState<Record<string, string>>({});
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Reload the ingredient catalog whenever the selected kitchen changes. We
  // join through `ingredient_kitchens` so an ingredient assigned to multiple
  // kitchens shows up in each one (many-to-many).
  useEffect(() => {
    if (!selectedKitchen) {
      setCatalogAr([]);
      setCatalogEn([]);
      setIconByName({});
      return;
    }
    let cancelled = false;
    setCatalogLoading(true);
    (async () => {
      // Step 1: ingredient ids belonging to this kitchen
      const { data: links } = await sb
        .from("ingredient_kitchens")
        .select("ingredient_id")
        .eq("kitchen_id", selectedKitchen.id);
      const ids = (links ?? []).map((l: { ingredient_id: string }) => l.ingredient_id);

      // Step 2: load those ingredients + the category icon map
      const [ingsRes, catsRes] = await Promise.all([
        ids.length === 0
          ? Promise.resolve({ data: [] as Array<{ name_ar: string; name_en: string; category: string | null }> })
          : supabase
              .from("ingredients_catalog")
              .select("name_ar, name_en, category")
              .eq("is_active", true)
              .in("id", ids)
              .order("sort_order", { ascending: true })
              .limit(500),
        supabase
          .from("ingredient_categories")
          .select("slug, icon")
          .eq("is_active", true),
      ]);
      if (cancelled) return;
      const ings = (ingsRes.data ?? []) as Array<{ name_ar: string; name_en: string; category: string | null }>;
      const cats = (catsRes.data ?? []) as Array<{ slug: string; icon: string | null }>;
      setCatalogAr(ings.map((d) => d.name_ar));
      setCatalogEn(ings.map((d) => d.name_en));
      const iconBySlug: Record<string, string> = {};
      for (const cat of cats) if (cat.icon) iconBySlug[cat.slug] = cat.icon;
      const map: Record<string, string> = {};
      for (const i of ings) {
        const icon = i.category ? iconBySlug[i.category] : undefined;
        if (icon) {
          map[i.name_ar] = icon;
          map[i.name_en] = icon;
        }
      }
      setIconByName(map);
      setCatalogLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedKitchen]);

  // Reset everything when language changes (recipes returned in other lang).
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
    // Only fall back to the hardcoded list when no kitchen is picked or the
    // kitchen catalog is empty — otherwise we'd show off-cuisine items.
    const all = fromCatalog.length > 0 ? fromCatalog : selectedKitchen ? [] : fallback;
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
  }, [input, ingredients, excluded, lang, catalogAr, catalogEn, selectedKitchen]);

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
      toast.error(pick(c.home_no_ingredients, t.home.noIngredients));
      return;
    }
    if (!user) {
      toast.info(
        lang === "ar"
          ? "يلا يا قمر، سجّلي دخول الأول وهنطبخلك أحلى وصفة 💕🍳"
          : "Hey lovely, sign in first and we'll cook up something delicious 💕🍳"
      );
      navigate({ to: "/auth" });
      return;
    }
    setLoading(true);
    setRecipes(null);
    // Tag the kitchen as a filter so the AI knows the cuisine context.
    const kitchenFilter = selectedKitchen
      ? [`kitchen:${selectedKitchen.slug}`]
      : [];
    const res = await generateRecipes({
      ingredients,
      exclude: excluded,
      filters: [...activeFilters, ...kitchenFilter],
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

  const handleToggleFavorite = (r: Recipe) => {
    if (!user) {
      toast.info(t.recipe.loginToSave);
      return;
    }
    toggle(r);
  };

  const changeKitchen = () => {
    setSelectedKitchen(null);
    setRecipes(null);
    setIngredients([]);
    setExcluded([]);
    setInput("");
    setExcludeInput("");
  };

  // ============== KITCHEN PICKER (shown first) ==============
  if (!selectedKitchen) {
    return (
      <div className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:pt-10">
        <section className="relative overflow-hidden rounded-3xl gradient-hero p-6 sm:p-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-card/70 px-3 py-1 text-xs font-semibold text-primary backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              {pick(c.hero_badge, lang === "ar" ? "مدعوم بالذكاء الاصطناعي" : "AI-powered")}
            </div>
            <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
              <span className="gradient-text">
                {lang === "ar" ? "اختاري المطبخ الأول 👩‍🍳" : "Pick your kitchen first 👩‍🍳"}
              </span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
              {lang === "ar"
                ? "كل مطبخ ليه مكوناته الخاصة. اختاري واحد وهنوريكي اللي يناسبه."
                : "Each kitchen has its own ingredient list — pick one to start."}
            </p>
          </motion.div>
        </section>

        <div className="mt-8">
          {kitchensLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : kitchens.length === 0 ? (
            <Card className="rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">
              {lang === "ar"
                ? "لسه مفيش مطابخ. الأدمن لازم يضيف مطابخ من لوحة التحكم."
                : "No kitchens yet. The admin needs to add some from the dashboard."}
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {kitchens.map((k, i) => (
                <motion.button
                  key={k.id}
                  type="button"
                  onClick={() => setSelectedKitchen(k)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="group flex flex-col items-center gap-2 rounded-3xl border border-border/60 bg-card p-5 text-center shadow-card transition hover:-translate-y-0.5 hover:border-primary hover:shadow-warm"
                >
                  <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-3xl transition group-hover:bg-primary/20">
                    {k.icon || "🍳"}
                  </span>
                  <p className="text-base font-extrabold">
                    {lang === "ar" ? k.name_ar : k.name_en}
                  </p>
                  {(lang === "ar" ? k.description_ar : k.description_en) && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {lang === "ar" ? k.description_ar : k.description_en}
                    </p>
                  )}
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============== INGREDIENTS UI (after kitchen is picked) ==============
  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-6 sm:pt-10">
      {/* Selected kitchen header with change button */}
      <Card className="mb-4 flex items-center justify-between rounded-3xl border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-2xl">
            {selectedKitchen.icon || "🍳"}
          </span>
          <div>
            <p className="text-xs text-muted-foreground">
              {lang === "ar" ? "المطبخ المختار" : "Selected kitchen"}
            </p>
            <p className="text-base font-extrabold">
              {lang === "ar" ? selectedKitchen.name_ar : selectedKitchen.name_en}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={changeKitchen}
          className="rounded-full text-primary hover:bg-primary/10"
        >
          <ArrowLeft className="me-1 h-4 w-4 rtl:rotate-180" />
          {lang === "ar" ? "تغيير المطبخ" : "Change"}
        </Button>
      </Card>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl gradient-hero p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-card/70 px-3 py-1 text-xs font-semibold text-primary backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            {pick(c.hero_badge, lang === "ar" ? "مدعوم بالذكاء الاصطناعي" : "AI-powered")}
          </div>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
            <span className="gradient-text">{pick(c.hero_title, t.home.heroTitle)}</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
            {pick(c.hero_sub, t.home.heroSub)}
          </p>
        </motion.div>
      </section>

      {/* Ingredients input */}
      <Card className="mt-6 rounded-3xl border-border/60 bg-card p-5 shadow-card">
        <label className="text-sm font-bold">{pick(c.home_ingredients_label, t.home.ingredientsLabel)}</label>
        <div className="mt-2 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={pick(c.home_ingredients_placeholder, t.home.ingredientsPlaceholder)}
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
            <span className="hidden sm:inline">{pick(c.home_add_btn, t.home.addBtn)}</span>
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
                {iconByName[ing] && <span aria-hidden>{iconByName[ing]}</span>}
                {ing}
                <X className="h-3 w-3 opacity-60 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        )}

        {catalogLoading ? (
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {lang === "ar" ? "بنحضّر مكونات المطبخ..." : "Loading kitchen ingredients..."}
          </div>
        ) : suggestions.length > 0 ? (
          <div className="mt-4">
            <p className="text-xs font-semibold text-muted-foreground">
              {lang === "ar"
                ? `اقتراحات مطبخ ${selectedKitchen.name_ar}`
                : `${selectedKitchen.name_en} kitchen suggestions`}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addIngredient(s)}
                  className="inline-flex items-center gap-1 rounded-full border border-dashed border-border bg-background px-3 py-1 text-xs text-muted-foreground transition hover:border-primary hover:bg-primary/5 hover:text-primary"
                >
                  {iconByName[s] ? (
                    <span aria-hidden>{iconByName[s]}</span>
                  ) : (
                    <span aria-hidden>+</span>
                  )}
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
            {lang === "ar"
              ? "لسه مفيش مكونات معيّنة لهذا المطبخ. الأدمن يقدر يربط مكونات من لوحة المكونات."
              : "No ingredients linked to this kitchen yet. Admin can link from the ingredients page."}
          </p>
        )}

        {/* Exclude */}
        <div className="mt-5">
          <label className="text-sm font-bold">{pick(c.home_exclude_label, t.home.excludeLabel)}</label>
          <div className="mt-2 flex gap-2">
            <Input
              value={excludeInput}
              onChange={(e) => setExcludeInput(e.target.value)}
              placeholder={pick(c.home_exclude_placeholder, t.home.excludePlaceholder)}
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
          <p className="text-sm font-bold">{pick(c.home_filters_title, t.home.filters)}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {FILTERS.map((f) => {
              const active = activeFilters.includes(f.key);
              const customByKey: Record<string, string | undefined> = {
                quick: c.home_filter_quick,
                budget: c.home_filter_budget,
                healthy: c.home_filter_healthy,
                arabic: c.home_filter_arab,
              };
              const label = pick(
                customByKey[f.key],
                t.home[f.labelKey as keyof typeof t.home] as string,
              );
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
                  {label}
                </button>
              );
            })}
          </div>
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
              {pick(c.home_generating, t.home.generating)}
            </>
          ) : (
            <>
              <ChefHat className="me-1 h-5 w-5" />
              {pick(c.home_cook_btn, t.home.cookBtn)}
            </>
          )}
        </Button>
      </Card>

      {/* Results */}
      <section id="results" className="mt-8">
        {recipes && recipes.length === 0 && (
          <p className="rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">
            {pick(c.home_no_results, t.home.noResults)}
          </p>
        )}
        {recipes && recipes.length > 0 && (
          <>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-lg font-extrabold">{pick(c.home_results_title, t.home.results)}</h2>
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
