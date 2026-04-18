import { motion } from "framer-motion";
import { Clock, Flame, Heart, Database, Sparkles } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCategoriesCatalog } from "@/hooks/useCategoriesCatalog";
import type { Recipe } from "@/lib/recipe";

interface Props {
  recipe: Recipe;
  onOpen?: () => void;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
  index?: number;
}

const difficultyDots = { easy: 1, medium: 2, hard: 3 } as const;

export function RecipeCard({ recipe, onOpen, onToggleFavorite, isFavorite, index = 0 }: Props) {
  const { t, lang } = useLang();
  const { bySlug: cuisineBySlug } = useCategoriesCatalog("recipe_cuisines");
  const cuisine = recipe.cuisine ? cuisineBySlug.get(recipe.cuisine) : undefined;
  const cuisineLabel = cuisine
    ? lang === "ar"
      ? cuisine.name_ar
      : cuisine.name_en
    : recipe.cuisine ?? "";
  const dots = difficultyDots[recipe.difficulty] ?? 1;
  const diffLabel =
    recipe.difficulty === "easy"
      ? t.recipe.easy
      : recipe.difficulty === "medium"
        ? t.recipe.medium
        : t.recipe.hard;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className="group relative overflow-hidden rounded-3xl border-border/60 bg-card shadow-card transition-all hover:-translate-y-0.5 hover:shadow-warm">
        {recipe.image_url && (
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
            <img
              src={recipe.image_url}
              alt={recipe.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {onToggleFavorite && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
                className="absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-background/85 text-foreground shadow-md backdrop-blur transition hover:bg-background"
                aria-label={isFavorite ? t.recipe.remove : t.recipe.save}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? "fill-rose-500 text-rose-500" : ""}`} />
              </button>
            )}
          </div>
        )}
        <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-lg font-extrabold leading-snug">{recipe.title}</h3>
            </div>
            {recipe.description && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{recipe.description}</p>
            )}
          </div>
          {!recipe.image_url && onToggleFavorite && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-secondary-foreground transition hover:bg-accent hover:text-accent-foreground"
              aria-label={isFavorite ? t.recipe.remove : t.recipe.save}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? "fill-current text-accent" : ""}`} />
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          {recipe.source === "local" ? (
            <Badge
              variant="secondary"
              className="rounded-full border-0 bg-primary/15 text-primary"
              title={t.recipe.localBadgeHint}
            >
              <Database className="me-1 h-3 w-3" />
              {t.recipe.localBadge}
            </Badge>
          ) : recipe.source === "ai" ? (
            <Badge
              variant="secondary"
              className="rounded-full border-0 bg-accent/15 text-accent"
              title={t.recipe.aiBadgeHint}
            >
              <Sparkles className="me-1 h-3 w-3" />
              {t.recipe.aiBadge}
            </Badge>
          ) : null}
          <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary border-0">
            <Clock className="me-1 h-3 w-3" />
            {recipe.estimated_time_minutes} {t.recipe.minutes}
          </Badge>
          <Badge variant="secondary" className="rounded-full bg-accent/10 text-accent border-0">
            <Flame className="me-1 h-3 w-3" />
            {diffLabel}
            <span className="ms-1 inline-flex gap-0.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1 w-1 rounded-full ${i < dots ? "bg-accent" : "bg-accent/30"}`}
                />
              ))}
            </span>
          </Badge>
          {cuisineLabel && (
            <Badge
              variant="secondary"
              className="rounded-full border-0 bg-secondary text-secondary-foreground"
            >
              {cuisine?.icon ? <span className="me-1">{cuisine.icon}</span> : null}
              {cuisineLabel}
            </Badge>
          )}
          {recipe.tags?.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="rounded-full border-border/70 text-muted-foreground">
              #{tag}
            </Badge>
          ))}
        </div>

        {recipe.missing_ingredients && recipe.missing_ingredients.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            <span className="font-semibold text-accent">{t.recipe.missing}:</span>{" "}
            {recipe.missing_ingredients.slice(0, 4).join("، ")}
            {recipe.missing_ingredients.length > 4 ? "…" : ""}
          </p>
        )}

        {onOpen && (
          <Button
            type="button"
            onClick={onOpen}
            className="mt-4 w-full rounded-xl gradient-primary text-primary-foreground hover:opacity-95"
          >
            {t.recipe.steps} →
          </Button>
        )}
        </div>
      </Card>
    </motion.div>
  );
}
