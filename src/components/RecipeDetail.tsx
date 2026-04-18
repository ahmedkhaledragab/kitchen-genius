import { motion, AnimatePresence } from "framer-motion";
import { Clock, Flame, Heart, X } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCategoriesCatalog } from "@/hooks/useCategoriesCatalog";
import type { Recipe } from "@/lib/recipe";

interface Props {
  recipe: Recipe | null;
  onClose: () => void;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
  canFavorite?: boolean;
}

export function RecipeDetail({ recipe, onClose, onToggleFavorite, isFavorite, canFavorite }: Props) {
  const { t, lang } = useLang();
  const { bySlug: cuisineBySlug } = useCategoriesCatalog("recipe_cuisines");
  if (!recipe) return null;
  const cuisine = recipe.cuisine ? cuisineBySlug.get(recipe.cuisine) : undefined;
  const cuisineLabel = cuisine
    ? lang === "ar"
      ? cuisine.name_ar
      : cuisine.name_en
    : recipe.cuisine ?? "";
  const diffLabel =
    recipe.difficulty === "easy"
      ? t.recipe.easy
      : recipe.difficulty === "medium"
        ? t.recipe.medium
        : t.recipe.hard;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          className="relative w-full max-w-lg overflow-hidden rounded-t-3xl bg-card shadow-warm sm:rounded-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="gradient-hero p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-extrabold leading-tight">{recipe.title}</h2>
                {recipe.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{recipe.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-full bg-card/70 text-foreground hover:bg-card"
                aria-label={t.recipe.back}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary" className="rounded-full bg-primary/15 text-primary border-0">
                <Clock className="me-1 h-3 w-3" />
                {recipe.estimated_time_minutes} {t.recipe.minutes}
              </Badge>
              <Badge variant="secondary" className="rounded-full bg-accent/15 text-accent border-0">
                <Flame className="me-1 h-3 w-3" />
                {diffLabel}
              </Badge>
              {recipe.tags?.slice(0, 4).map((x) => (
                <Badge key={x} variant="outline" className="rounded-full border-border/70 text-muted-foreground">
                  #{x}
                </Badge>
              ))}
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-5">
            <h3 className="text-sm font-bold text-muted-foreground">{t.recipe.ingredients}</h3>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {recipe.ingredients.map((ing) => (
                <li
                  key={ing}
                  className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground"
                >
                  {ing}
                </li>
              ))}
            </ul>

            {recipe.missing_ingredients?.length > 0 && (
              <>
                <h3 className="mt-4 text-sm font-bold text-accent">{t.recipe.missing}</h3>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {recipe.missing_ingredients.map((ing) => (
                    <li
                      key={ing}
                      className="rounded-full bg-accent/10 px-3 py-1 text-xs text-accent"
                    >
                      {ing}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <h3 className="mt-5 text-sm font-bold text-muted-foreground">{t.recipe.steps}</h3>
            <ol className="mt-2 space-y-2">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex gap-3 rounded-2xl bg-muted/60 p-3 text-sm leading-relaxed">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {onToggleFavorite && (
            <div className="border-t border-border/60 p-4">
              <Button
                type="button"
                onClick={onToggleFavorite}
                className={`w-full rounded-xl ${
                  isFavorite
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    : "gradient-accent text-accent-foreground hover:opacity-95"
                }`}
              >
                <Heart className={`me-1 h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
                {!canFavorite ? t.recipe.loginToSave : isFavorite ? t.recipe.saved : t.recipe.save}
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
