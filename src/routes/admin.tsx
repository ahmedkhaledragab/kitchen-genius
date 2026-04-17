import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Difficulty } from "@/lib/recipe";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "لوحة الأدمن — من اللي عندك؟" }],
  }),
  component: AdminPage,
});

interface RecipeRow {
  id: string;
  title: string;
  description: string | null;
  estimated_time_minutes: number | null;
  difficulty: Difficulty;
  language: string;
}

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  const [list, setList] = useState<RecipeRow[]>([]);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    ingredients: "",
    steps: "",
    estimated_time_minutes: 20,
    difficulty: "easy" as Difficulty,
    tags: "",
    cuisine: "",
    language: "ar",
  });

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from("recipes")
      .select("id, title, description, estimated_time_minutes, difficulty, language")
      .order("created_at", { ascending: false });
    if (!error && data) setList(data as RecipeRow[]);
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (isAdmin) refresh();
  }, [isAdmin, refresh]);

  if (loading) return null;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 pt-16 text-center">
        <Card className="rounded-3xl p-8">
          <p className="text-sm text-muted-foreground">{t.admin.noAccess}</p>
        </Card>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const ingredients = form.ingredients
      .split(/[,،\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const steps = form.steps
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    const tags = form.tags
      .split(/[,،]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const { error } = await supabase.from("recipes").insert({
      title: form.title,
      description: form.description || null,
      ingredients,
      missing_ingredients: [],
      steps,
      estimated_time_minutes: Number(form.estimated_time_minutes) || null,
      difficulty: form.difficulty,
      tags,
      cuisine: form.cuisine || null,
      language: form.language,
      is_published: true,
      created_by: user.id,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t.admin.saved);
      setForm({
        title: "",
        description: "",
        ingredients: "",
        steps: "",
        estimated_time_minutes: 20,
        difficulty: "easy",
        tags: "",
        cuisine: "",
        language: "ar",
      });
      refresh();
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("recipes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else refresh();
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-6">
      <h1 className="text-2xl font-extrabold">{t.admin.title}</h1>

      <Card className="mt-4 rounded-3xl border-border/60 p-5 shadow-card">
        <h2 className="text-base font-bold">{t.admin.addRecipe}</h2>
        <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold">{t.admin.title_field}</label>
            <Input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="mt-1 rounded-xl"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold">{t.admin.desc}</label>
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="mt-1 rounded-xl"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold">{t.admin.ingredients}</label>
            <Textarea
              required
              rows={2}
              value={form.ingredients}
              onChange={(e) => setForm((f) => ({ ...f, ingredients: e.target.value }))}
              className="mt-1 rounded-xl"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold">{t.admin.steps}</label>
            <Textarea
              required
              rows={4}
              value={form.steps}
              onChange={(e) => setForm((f) => ({ ...f, steps: e.target.value }))}
              className="mt-1 rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs font-semibold">{t.admin.time}</label>
            <Input
              type="number"
              min={1}
              value={form.estimated_time_minutes}
              onChange={(e) =>
                setForm((f) => ({ ...f, estimated_time_minutes: Number(e.target.value) }))
              }
              className="mt-1 rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs font-semibold">{t.admin.difficulty}</label>
            <Select
              value={form.difficulty}
              onValueChange={(v) => setForm((f) => ({ ...f, difficulty: v as Difficulty }))}
            >
              <SelectTrigger className="mt-1 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">{t.recipe.easy}</SelectItem>
                <SelectItem value="medium">{t.recipe.medium}</SelectItem>
                <SelectItem value="hard">{t.recipe.hard}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold">{t.admin.tags}</label>
            <Input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              className="mt-1 rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs font-semibold">{t.admin.cuisine}</label>
            <Input
              value={form.cuisine}
              onChange={(e) => setForm((f) => ({ ...f, cuisine: e.target.value }))}
              className="mt-1 rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs font-semibold">{t.admin.language}</label>
            <Select
              value={form.language}
              onValueChange={(v) => setForm((f) => ({ ...f, language: v }))}
            >
              <SelectTrigger className="mt-1 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ar">العربية</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Button
              type="submit"
              disabled={busy}
              className="h-11 w-full rounded-xl gradient-primary text-primary-foreground hover:opacity-95"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="me-1 h-4 w-4" />{t.admin.save}</>}
            </Button>
          </div>
        </form>
      </Card>

      <section className="mt-6">
        <h2 className="mb-3 text-base font-bold">{t.admin.list}</h2>
        <div className="space-y-2">
          {list.map((r) => (
            <Card key={r.id} className="flex items-center justify-between gap-2 rounded-2xl p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{r.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.estimated_time_minutes ?? "-"} {t.recipe.minutes} · {r.difficulty} · {r.language}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => remove(r.id)}
                className="rounded-xl text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          ))}
          {list.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">—</p>
          )}
        </div>
      </section>
    </div>
  );
}
