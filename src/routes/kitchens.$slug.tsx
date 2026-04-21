import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { useKitchens } from "@/hooks/useKitchens";
import { supabase } from "@/integrations/supabase/client";
import type { Recipe } from "@/lib/recipe";
import { RecipeCard } from "@/components/RecipeCard";
import { RecipeDetail } from "@/components/RecipeDetail";

export const Route = createFileRoute("/kitchens/$slug")({
  component: KitchenRecipesPage,
});

const PAGE_SIZE = 50;

function KitchenRecipesPage() {
  const { slug } = Route.useParams();
  const { lang } = useLang();
  const { user } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const navigate = useNavigate();
  const { items: kitchens, loading: kitchensLoading } = useKitchens();

  const kitchen = useMemo(
    () => kitchens.find((k) => k.slug === slug) ?? null,
    [kitchens, slug],
  );

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [openRecipe, setOpenRecipe] = useState<Recipe | null>(null);
  const [search, setSearch] = useState("");

  // Load recipes for this kitchen
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      // Some kitchen slugs are aliases that map to multiple cuisine codes
      // stored in the recipes table. This way kitchens like "levantine"
      // (شامي) can pull from both lebanese & syrian recipes, etc.
      const SLUG_ALIASES: Record<string, string[]> = {
        levantine: ["lebanese", "syrian", "levantine"],
        asian: ["indian", "asian"],
        general: ["world", "general"],
      };
      const cuisines = SLUG_ALIASES[slug] ?? [slug];

      // Try the user's current language first; if empty, fall back to any language
      // so kitchens that only have recipes in one language still render.
      let { data, error } = await supabase
        .from("recipes")
        .select("*")
        .eq("is_published", true)
        .in("cuisine", cuisines)
        .eq("language", lang)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (!error && (!data || data.length === 0)) {
        const fallback = await supabase
          .from("recipes")
          .select("*")
          .eq("is_published", true)
          .in("cuisine", cuisines)
          .order("created_at", { ascending: false })
          .limit(PAGE_SIZE);
        data = fallback.data;
        error = fallback.error;
      }
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
        setRecipes([]);
      } else {
        const rows = (data ?? []) as Array<Recipe & { id: string }>;
        setRecipes(
          rows.map((r) => ({
            ...r,
            ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
            missing_ingredients: Array.isArray(r.missing_ingredients)
              ? r.missing_ingredients
              : [],
            steps: Array.isArray(r.steps) ? r.steps : [],
            tags: Array.isArray(r.tags) ? r.tags : [],
            source: "local",
          })),
        );
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, lang]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q) ||
        r.ingredients.some((i) => i.toLowerCase().includes(q)),
    );
  }, [recipes, search]);

  const handleToggleFavorite = (r: Recipe) => {
    if (!user) {
      toast.info(lang === "ar" ? "سجّلي دخول الأول 💕" : "Please sign in first 💕");
      navigate({ to: "/auth" });
      return;
    }
    toggle(r);
  };

  if (kitchensLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!kitchen) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <Card className="rounded-2xl bg-muted p-8">
          <p className="text-base font-bold">
            {lang === "ar" ? "المطبخ ده مش موجود" : "Kitchen not found"}
          </p>
          <Button asChild className="mt-4 rounded-xl">
            <Link to="/kitchens">
              {lang === "ar" ? "رجوع للمطابخ" : "Back to kitchens"}
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  const kitchenName = lang === "ar" ? kitchen.name_ar : kitchen.name_en;
  const kitchenDesc = lang === "ar" ? kitchen.description_ar : kitchen.description_en;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:pt-10">
      {/* Back link */}
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="mb-3 rounded-full text-primary hover:bg-primary/10"
      >
        <Link to="/kitchens">
          <ArrowLeft className="me-1 h-4 w-4 rtl:rotate-180" />
          {lang === "ar" ? "كل المطابخ" : "All kitchens"}
        </Link>
      </Button>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl gradient-hero p-6 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-4"
        >
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-card/70 text-4xl backdrop-blur">
            {kitchen.icon || "🍳"}
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-black leading-tight sm:text-4xl">
              <span className="gradient-text">{kitchenName}</span>
            </h1>
            {kitchenDesc && (
              <p className="mt-1 text-sm text-muted-foreground">{kitchenDesc}</p>
            )}
          </div>
        </motion.div>
      </section>

      {/* Search */}
      <Card className="mt-5 rounded-3xl border-border/60 bg-card p-4 shadow-card">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground start-3" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              lang === "ar"
                ? "ابحثي باسم الوصفة أو مكون..."
                : "Search by recipe name or ingredient..."
            }
            className="rounded-xl ps-9"
          />
        </div>
      </Card>

      {/* Results */}
      <section className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">
            {recipes.length === 0
              ? lang === "ar"
                ? "لسه مفيش وصفات في المطبخ ده."
                : "No recipes in this kitchen yet."
              : lang === "ar"
                ? "مفيش نتائج للبحث ده."
                : "No matches for this search."}
          </Card>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-lg font-extrabold">
                {lang === "ar" ? "الوصفات" : "Recipes"}
              </h2>
              <Badge
                variant="secondary"
                className="rounded-full bg-primary/10 text-primary border-0"
              >
                {filtered.length}
              </Badge>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((r, i) => (
                <RecipeCard
                  key={r.id ?? `${r.title}-${i}`}
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
