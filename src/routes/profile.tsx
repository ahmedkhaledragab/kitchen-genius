import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, User as UserIcon } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { useFavorites } from "@/hooks/useFavorites";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RecipeCard } from "@/components/RecipeCard";
import { RecipeDetail } from "@/components/RecipeDetail";
import type { Recipe } from "@/lib/recipe";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "حسابي — من اللي عندك؟" },
      { name: "description", content: "صفحة بروفايل المستخدم ووصفاته المحفوظة." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const { items, isFavorite, toggle, refresh } = useFavorites();
  const [profileName, setProfileName] = useState<string | null>(null);
  const [openRecipe, setOpenRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfileName(data?.display_name ?? null));
  }, [user]);

  if (!user) return null;

  const savedRecipes: Recipe[] = items
    .map((it) => (it.recipe_snapshot as Recipe | null) ?? null)
    .filter((r): r is Recipe => !!r);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-6">
      <Card className="rounded-3xl border-border/60 bg-card p-6 shadow-card">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl gradient-primary text-primary-foreground">
            <UserIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-extrabold">{profileName ?? user.email}</h1>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => signOut()}
            className="rounded-xl"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{t.profile.logout}</span>
          </Button>
        </div>
      </Card>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-extrabold">{t.profile.mySaved}</h2>
        {savedRecipes.length === 0 ? (
          <Card className="rounded-3xl border-dashed border-border bg-muted/40 p-8 text-center">
            <p className="text-sm text-muted-foreground">{t.profile.empty}</p>
            <Button
              asChild
              className="mt-4 rounded-xl gradient-primary text-primary-foreground hover:opacity-95"
            >
              <Link to="/">{t.profile.goHome}</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {savedRecipes.map((r, i) => (
              <RecipeCard
                key={i}
                recipe={r}
                index={i}
                onOpen={() => setOpenRecipe(r)}
                onToggleFavorite={() => {
                  toggle(r);
                  setTimeout(refresh, 200);
                }}
                isFavorite={isFavorite(r)}
              />
            ))}
          </div>
        )}
      </section>

      <RecipeDetail
        recipe={openRecipe}
        onClose={() => setOpenRecipe(null)}
        onToggleFavorite={
          openRecipe
            ? () => {
                toggle(openRecipe);
                setTimeout(refresh, 200);
              }
            : undefined
        }
        isFavorite={openRecipe ? isFavorite(openRecipe) : false}
        canFavorite={true}
      />
    </div>
  );
}
