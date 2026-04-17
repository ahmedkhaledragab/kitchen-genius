import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Users,
  ChefHat,
  Heart,
  ShieldCheck,
  Ban,
  Sparkles,
  LayoutDashboard,
  Settings,
  ArrowRight,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { GenerationsChart } from "@/components/admin/GenerationsChart";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "لوحة التحكم — من اللي عندك؟" }],
  }),
  component: AdminPage,
});

interface UserRow {
  id: string;
  is_active: boolean;
  is_admin: boolean;
  recipes_today: number;
  recipes_limit: number;
}

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const { t, lang } = useLang();
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [recipesCount, setRecipesCount] = useState(0);
  const [favCount, setFavCount] = useState(0);
  const [ingredientsCount, setIngredientsCount] = useState(0);

  const refresh = useCallback(async () => {
    const [recipesRes, usersRes, favsRes, ingsRes] = await Promise.all([
      supabase.from("recipes").select("*", { count: "exact", head: true }),
      supabase.rpc("admin_list_users"),
      supabase.from("favorites").select("*", { count: "exact", head: true }),
      supabase.from("ingredients_catalog").select("*", { count: "exact", head: true }),
    ]);
    if (typeof recipesRes.count === "number") setRecipesCount(recipesRes.count);
    if (usersRes.data) setUsers(usersRes.data as UserRow[]);
    if (typeof favsRes.count === "number") setFavCount(favsRes.count);
    if (typeof ingsRes.count === "number") setIngredientsCount(ingsRes.count);
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
    return { totalUsers, banned, admins, todayUses };
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

  return (
    <div className="pb-2">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
          <LayoutDashboard className="h-3 w-3" />
          ADMIN
        </div>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">
          <span className="gradient-text">{t.admin.title}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {lang === "ar"
            ? "نظرة سريعة على نشاط الموقع 💕"
            : "Quick overview of your site activity 💕"}
        </p>
      </div>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={Users} label={t.admin.stats.users} value={stats.totalUsers} tone="primary" />
        <StatCard icon={ChefHat} label={t.admin.stats.recipes} value={recipesCount} tone="accent" />
        <StatCard icon={Heart} label={t.admin.stats.favorites} value={favCount} tone="rose" />
        <StatCard icon={ShieldCheck} label={t.admin.stats.admins} value={stats.admins} tone="emerald" />
        <StatCard icon={Ban} label={t.admin.stats.banned} value={stats.banned} tone="destructive" />
        <StatCard icon={Sparkles} label={t.admin.stats.recipesToday} value={stats.todayUses} tone="primary" />
      </div>

      {/* Quick links */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink
          to="/admin/recipes"
          icon={ChefHat}
          title={lang === "ar" ? "الوصفات" : "Recipes"}
          subtitle={
            lang === "ar"
              ? `${recipesCount} وصفة — أضيفي/عدّلي`
              : `${recipesCount} recipes — add/edit`
          }
          tone="accent"
        />
        <QuickLink
          to="/admin/ingredients"
          icon={Sparkles}
          title={lang === "ar" ? "المكونات" : "Ingredients"}
          subtitle={
            lang === "ar"
              ? `${ingredientsCount} مكون في الكتالوج`
              : `${ingredientsCount} ingredients in catalog`
          }
          tone="primary"
        />
        <QuickLink
          to="/admin/users"
          icon={Users}
          title={lang === "ar" ? "المستخدمين" : "Users"}
          subtitle={
            lang === "ar"
              ? `${stats.totalUsers} مستخدمة — صلاحيات وحدود`
              : `${stats.totalUsers} users — roles & limits`
          }
          tone="rose"
        />
        <QuickLink
          to="/admin/settings"
          icon={Settings}
          title={lang === "ar" ? "إعدادات الموقع" : "Site settings"}
          subtitle={lang === "ar" ? "اللوجو، SEO، الألوان" : "Logo, SEO, colors"}
          tone="emerald"
        />
      </div>

      {/* Chart */}
      <div className="mt-6">
        <GenerationsChart />
      </div>
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

function QuickLink({
  to,
  icon: Icon,
  title,
  subtitle,
  tone,
}: {
  to: "/admin/recipes" | "/admin/ingredients" | "/admin/users" | "/admin/settings";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  tone: keyof typeof TONES;
}) {
  return (
    <Link
      to={to}
      className={`group flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-gradient-to-br ${TONES[tone]} p-4 shadow-card transition hover:scale-[1.02] hover:shadow-soft`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-background/60">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{title}</p>
          <p className="truncate text-[11px] opacity-70">{subtitle}</p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 opacity-60 transition group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
    </Link>
  );
}
