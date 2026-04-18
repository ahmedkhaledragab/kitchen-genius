import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import {
  Trash2,
  Plus,
  Loader2,
  ChefHat,
  Pencil,
  X,
  Check,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Difficulty } from "@/lib/recipe";
import { useCategoriesCatalog } from "@/hooks/useCategoriesCatalog";

export const Route = createFileRoute("/admin/recipes")({
  head: () => ({
    meta: [{ title: "إدارة الوصفات — لوحة التحكم" }],
  }),
  component: AdminRecipesPage,
});

interface RecipeRow {
  id: string;
  title: string;
  description: string | null;
  estimated_time_minutes: number | null;
  difficulty: Difficulty;
  language: string;
  created_at: string;
  cuisine: string | null;
  image_url: string | null;
  tags: string[] | null;
  ingredients: unknown;
  steps: unknown;
}

interface EditState {
  id: string;
  title: string;
  description: string;
  ingredients: string;
  steps: string;
  estimated_time_minutes: number;
  difficulty: Difficulty;
  tags: string;
  cuisine: string;
  language: string;
  image_url: string;
}

function AdminRecipesPage() {
  const { user, isAdmin, loading } = useAuth();
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const { items: cuisineOptions } = useCategoriesCatalog("recipe_cuisines");

  const [list, setList] = useState<RecipeRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [genImg, setGenImg] = useState(false);

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
    const { data } = await supabase
      .from("recipes")
      .select(
        "id, title, description, estimated_time_minutes, difficulty, language, created_at, cuisine, image_url, tags, ingredients, steps"
      )
      .order("created_at", { ascending: false });
    if (data) setList(data as RecipeRow[]);
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
    const ingredients = form.ingredients.split(/[,،\n]/).map((s) => s.trim()).filter(Boolean);
    const steps = form.steps.split(/\n/).map((s) => s.trim()).filter(Boolean);
    const tags = form.tags.split(/[,،]/).map((s) => s.trim()).filter(Boolean);

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
      toast.success(lang === "ar" ? "اتحفظت يا قمر 💕" : "Saved sweetie 💕");
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
    if (!window.confirm(lang === "ar" ? "تأكيد حذف الوصفة؟" : "Delete this recipe?")) return;
    const { error } = await supabase.from("recipes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(lang === "ar" ? "اتحذفت 🌸" : "Deleted 🌸");
      refresh();
    }
  };

  const startEdit = (r: RecipeRow) => {
    const ings = Array.isArray(r.ingredients) ? (r.ingredients as string[]) : [];
    const stps = Array.isArray(r.steps) ? (r.steps as string[]) : [];
    setEditing({
      id: r.id,
      title: r.title,
      description: r.description ?? "",
      ingredients: ings.join("\n"),
      steps: stps.join("\n"),
      estimated_time_minutes: r.estimated_time_minutes ?? 20,
      difficulty: r.difficulty,
      tags: (r.tags ?? []).join(", "),
      cuisine: r.cuisine ?? "",
      language: r.language,
      image_url: r.image_url ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSavingEdit(true);
    const ingredients = editing.ingredients.split(/[,،\n]/).map((s) => s.trim()).filter(Boolean);
    const steps = editing.steps.split(/\n/).map((s) => s.trim()).filter(Boolean);
    const tags = editing.tags.split(/[,،]/).map((s) => s.trim()).filter(Boolean);
    const { error } = await supabase
      .from("recipes")
      .update({
        title: editing.title,
        description: editing.description || null,
        ingredients,
        steps,
        estimated_time_minutes: Number(editing.estimated_time_minutes) || null,
        difficulty: editing.difficulty,
        tags,
        cuisine: editing.cuisine || null,
        language: editing.language,
        image_url: editing.image_url || null,
      })
      .eq("id", editing.id);
    setSavingEdit(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(lang === "ar" ? "اتحفظت يا قمر 💕" : "Saved sweetie 💕");
      setEditing(null);
      refresh();
    }
  };

  const generateImage = async () => {
    if (!editing) return;
    setGenImg(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-recipe-image", {
        body: {
          recipeId: editing.id,
          title: editing.title,
          description: editing.description,
          cuisine: editing.cuisine,
        },
      });
      if (error) throw error;
      const url = (data as { image_url?: string })?.image_url;
      if (!url) throw new Error("no image");
      setEditing((prev) => (prev ? { ...prev, image_url: url } : prev));
      toast.success(lang === "ar" ? "اتولّدت الصورة 💖" : "Image generated 💖");
      refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      toast.error(
        lang === "ar" ? `فشل توليد الصورة: ${msg}` : `Failed to generate image: ${msg}`
      );
    } finally {
      setGenImg(false);
    }
  };

  const dateFmt = new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="pb-2">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-bold text-accent">
          <ChefHat className="h-3 w-3" />
          {lang === "ar" ? "الوصفات" : "RECIPES"}
        </div>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">
          <span className="gradient-text">
            {lang === "ar" ? "إدارة الوصفات" : "Manage recipes"}
          </span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {lang === "ar"
            ? "ضيفي وصفات جديدة، عدّلي، أو احذفي اللي مش عاجبك 🍳"
            : "Add, edit, or remove recipes 🍳"}
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="recipes" className="mt-6">
        <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-muted/60 p-1 sm:w-auto sm:inline-grid">
          <TabsTrigger value="recipes" className="rounded-xl data-[state=active]:bg-background">
            <ChefHat className="me-1.5 h-4 w-4" />
            {t.admin.tabRecipes} ({list.length})
          </TabsTrigger>
          <TabsTrigger value="add" className="rounded-xl data-[state=active]:bg-background">
            <Plus className="me-1.5 h-4 w-4" />
            {t.admin.addRecipe}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recipes" className="mt-4">
          <Card className="rounded-3xl border-border/60 p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">{t.admin.list}</h2>
              <span className="text-xs text-muted-foreground">{list.length}</span>
            </div>
            {list.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {lang === "ar" ? "لسه مفيش وصفات 🌸" : "No recipes yet 🌸"}
              </p>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border/60">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-start font-semibold">{t.admin.title_field}</th>
                      <th className="hidden px-3 py-2 text-start font-semibold sm:table-cell">
                        {t.admin.difficulty}
                      </th>
                      <th className="hidden px-3 py-2 text-start font-semibold sm:table-cell">
                        {t.admin.time}
                      </th>
                      <th className="hidden px-3 py-2 text-start font-semibold md:table-cell">
                        {lang === "ar" ? "تاريخ" : "Date"}
                      </th>
                      <th className="px-3 py-2 text-end font-semibold">
                        {lang === "ar" ? "إجراءات" : "Actions"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((r, i) => (
                      <tr
                        key={r.id}
                        className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            {r.image_url ? (
                              <img
                                src={r.image_url}
                                alt=""
                                loading="lazy"
                                className="h-10 w-10 shrink-0 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                                <ChefHat className="h-4 w-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate font-semibold">{r.title}</p>
                              {r.description && (
                                <p className="line-clamp-1 text-xs text-muted-foreground">
                                  {r.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-3 py-2.5 text-xs sm:table-cell">
                          <DiffBadge d={r.difficulty} t={t} />
                        </td>
                        <td className="hidden px-3 py-2.5 text-xs text-muted-foreground sm:table-cell">
                          {r.estimated_time_minutes ?? "-"} {t.recipe.minutes}
                        </td>
                        <td className="hidden px-3 py-2.5 text-xs text-muted-foreground md:table-cell">
                          {dateFmt.format(new Date(r.created_at))}
                        </td>
                        <td className="px-3 py-2.5 text-end">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(r)}
                              className="rounded-lg text-primary hover:bg-primary/10"
                              aria-label={t.admin.edit}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(r.id)}
                              className="rounded-lg text-destructive hover:bg-destructive/10"
                              aria-label={t.admin.delete}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="add" className="mt-4">
          <Card className="rounded-3xl border-border/60 p-5 shadow-card">
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
                <Select
                  value={form.cuisine || "__none__"}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, cuisine: v === "__none__" ? "" : v }))
                  }
                >
                  <SelectTrigger className="mt-1 rounded-xl">
                    <SelectValue placeholder={lang === "ar" ? "اختاري" : "Select"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{lang === "ar" ? "بدون" : "None"}</SelectItem>
                    {cuisineOptions.map((c) => (
                      <SelectItem key={c.id} value={c.slug}>
                        {c.icon ? `${c.icon} ` : ""}
                        {lang === "ar" ? c.name_ar : c.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="me-1 h-4 w-4" />
                      {t.admin.save}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />
              {t.admin.edit}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold">{t.admin.title_field}</label>
                <Input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold">{t.admin.desc}</label>
                <Input
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold">
                    {lang === "ar" ? "رابط الصورة" : "Image URL"}
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={generateImage}
                    disabled={genImg || !editing.title}
                    className="h-7 rounded-lg border-primary/40 text-[11px] text-primary hover:bg-primary/10"
                  >
                    {genImg ? (
                      <Loader2 className="me-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Wand2 className="me-1 h-3 w-3" />
                    )}
                    {lang === "ar" ? "توليد بالذكاء الاصطناعي" : "Generate with AI"}
                  </Button>
                </div>
                <Input
                  value={editing.image_url}
                  onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                  className="mt-1 rounded-xl"
                  placeholder="/recipes/xxx.png"
                />
                {editing.image_url && (
                  <img
                    src={editing.image_url}
                    alt=""
                    className="mt-2 h-24 w-full rounded-xl object-cover"
                    onError={(e) => ((e.currentTarget.style.display = "none"))}
                  />
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold">{t.admin.ingredients}</label>
                <Textarea
                  rows={3}
                  value={editing.ingredients}
                  onChange={(e) => setEditing({ ...editing, ingredients: e.target.value })}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold">{t.admin.steps}</label>
                <Textarea
                  rows={5}
                  value={editing.steps}
                  onChange={(e) => setEditing({ ...editing, steps: e.target.value })}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">{t.admin.time}</label>
                <Input
                  type="number"
                  min={1}
                  value={editing.estimated_time_minutes}
                  onChange={(e) =>
                    setEditing({ ...editing, estimated_time_minutes: Number(e.target.value) })
                  }
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">{t.admin.difficulty}</label>
                <Select
                  value={editing.difficulty}
                  onValueChange={(v) => setEditing({ ...editing, difficulty: v as Difficulty })}
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
                  value={editing.tags}
                  onChange={(e) => setEditing({ ...editing, tags: e.target.value })}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">{t.admin.cuisine}</label>
                <Select
                  value={editing.cuisine || "__none__"}
                  onValueChange={(v) =>
                    setEditing({ ...editing, cuisine: v === "__none__" ? "" : v })
                  }
                >
                  <SelectTrigger className="mt-1 rounded-xl">
                    <SelectValue placeholder={lang === "ar" ? "اختاري" : "Select"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{lang === "ar" ? "بدون" : "None"}</SelectItem>
                    {cuisineOptions.map((c) => (
                      <SelectItem key={c.id} value={c.slug}>
                        {c.icon ? `${c.icon} ` : ""}
                        {lang === "ar" ? c.name_ar : c.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold">{t.admin.language}</label>
                <Select
                  value={editing.language}
                  onValueChange={(v) => setEditing({ ...editing, language: v })}
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
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setEditing(null)}
              disabled={savingEdit}
            >
              <X className="me-1 h-4 w-4" />
              {t.admin.cancel}
            </Button>
            <Button
              type="button"
              className="rounded-xl gradient-primary text-primary-foreground"
              onClick={saveEdit}
              disabled={savingEdit}
            >
              {savingEdit ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="me-1 h-4 w-4" />
                  {t.admin.update}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DiffBadge({ d, t }: { d: Difficulty; t: ReturnType<typeof useLang>["t"] }) {
  const color =
    d === "easy"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : d === "medium"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
        : "bg-destructive/15 text-destructive";
  const label = d === "easy" ? t.recipe.easy : d === "medium" ? t.recipe.medium : t.recipe.hard;
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${color}`}>
      {label}
    </span>
  );
}
