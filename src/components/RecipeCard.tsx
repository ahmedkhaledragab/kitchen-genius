import { motion } from "framer-motion";
import { Clock, Flame, Heart } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const { t } = useLang();
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
      <Card className="group relative overflow-hidden rounded-3xl border-border/60 bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-warm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-extrabold leading-snug">{recipe.title}</h3>
            {recipe.description && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{recipe.description}</p>
            )}
          </div>
          {onToggleFavorite && (
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
      </Card>
    </motion.div>
  );
}
