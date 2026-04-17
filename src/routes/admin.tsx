import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Trash2,
  Plus,
  Loader2,
  Users,
  ChefHat,
  Heart,
  ShieldCheck,
  Ban,
  Sparkles,
  LayoutDashboard,
  Pencil,
  X,
  Check,
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
import { GenerationsChart } from "@/components/admin/GenerationsChart";
import type { Difficulty } from "@/lib/recipe";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "لوحة التحكم — من اللي عندك؟" }],
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
  created_at: string;
  cuisine: string | null;
  image_url: string | null;
  tags: string[] | null;
  ingredients: unknown;
  steps: unknown;
}

interface UserRow {
  id: string;
  is_active: boolean;
  is_admin: boolean;
  recipes_today: number;
  recipes_limit: number;
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

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const { t, lang } = useLang();
  const navigate = useNavigate();

  const [list, setList] = useState<RecipeRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [favCount, setFavCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

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
    const [recipesRes, usersRes, favsRes] = await Promise.all([
      supabase
        .from("recipes")
        .select("id, title, description, estimated_time_minutes, difficulty, language, created_at, cuisine, image_url, tags, ingredients, steps")
        .order("created_at", { ascending: false }),
      supabase.rpc("admin_list_users"),
      supabase.from("favorites").select("*", { count: "exact", head: true }),
    ]);
    if (recipesRes.data) setList(recipesRes.data as RecipeRow[]);
    if (usersRes.data) setUsers(usersRes.data as UserRow[]);
    if (typeof favsRes.count === "number") setFavCount(favsRes.count);
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (isAdmin) refresh();
  }, [isAdmin, refresh]);

  const stats = useMemo(() => {
    const totalUsers = users.length;
    const banned = users.filter((u) => !u.is_active).length;
    const admins = users.filter((u) => u.is_admin).length;
    const todayUses = users.reduce((sum, u) => sum + (u.recipes_today || 0), 0);
    const avg = totalUsers ? Math.round((todayUses / totalUsers) * 10) / 10 : 0;
    return { totalUsers, banned, admins, todayUses, avg };
  }, [users]);

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

  const dateFmt = new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-6xl px-3 pb-20 pt-4 sm:px-4 sm:pt-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
            <LayoutDashboard className="h-3 w-3" />
            ADMIN
          </div>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">
            <span className="gradient-text">{t.admin.title}</span>
          </h1>
        </div>
        <Button asChild variant="outline" className="rounded-xl">
          <Link to="/admin/users">
            <Users className="me-1 h-4 w-4" />
            {t.admin.users.title}
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={Users} label={t.admin.stats.users} value={stats.totalUsers} tone="primary" />
        <StatCard icon={ChefHat} label={t.admin.stats.recipes} value={list.length} tone="accent" />
        <StatCard icon={Heart} label={t.admin.stats.favorites} value={favCount} tone="rose" />
        <StatCard icon={ShieldCheck} label={t.admin.stats.admins} value={stats.admins} tone="emerald" />
        <StatCard icon={Ban} label={t.admin.stats.banned} value={stats.banned} tone="destructive" />
        <StatCard icon={Sparkles} label={t.admin.stats.recipesToday} value={stats.todayUses} tone="primary" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="recipes" className="mt-6">
        <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-muted/60 p-1 sm:w-auto sm:inline-grid">
          <TabsTrigger value="recipes" className="rounded-xl data-[state=active]:bg-background">
            <ChefHat className="me-1.5 h-4 w-4" />
            {t.admin.tabRecipes}
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
              <p className="py-10 text-center text-sm text-muted-foreground">—</p>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border/60">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-start font-semibold">{t.admin.title_field}</th>
                      <th className="hidden px-3 py-2 text-start font-semibold sm:table-cell">{t.admin.difficulty}</th>
                      <th className="hidden px-3 py-2 text-start font-semibold sm:table-cell">{t.admin.time}</th>
                      <th className="hidden px-3 py-2 text-start font-semibold md:table-cell">{lang === "ar" ? "تاريخ" : "Date"}</th>
                      <th className="px-3 py-2 text-end font-semibold">{t.admin.delete}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((r, i) => (
                      <tr
                        key={r.id}
                        className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}
                      >
                        <td className="px-3 py-2.5">
                          <p className="truncate font-semibold">{r.title}</p>
                          {r.description && (
                            <p className="line-clamp-1 text-xs text-muted-foreground">{r.description}</p>
                          )}
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
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(r.id)}
                            className="rounded-lg text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
    </div>
  );
}

const TONES = {
  primary: "from-primary/15 to-primary/5 text-primary",
  accent: "from-accent/15 to-accent/5 text-accent",
  rose: "from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-400",
  emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
  destructive: "from-destructive/15 to-destructive/5 text-destructive",
} as const;

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: keyof typeof TONES;
}) {
  return (
    <Card className={`rounded-2xl border-border/60 bg-gradient-to-br ${TONES[tone]} p-4 shadow-card`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold opacity-80">{label}</p>
        <Icon className="h-4 w-4 opacity-70" />
      </div>
      <p className="mt-2 text-2xl font-black tabular-nums">{value}</p>
    </Card>
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
