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
  MessagesSquare,
  Inbox,
  Activity,
  TrendingUp,
  Clock,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";

import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { GenerationsChart } from "@/components/admin/GenerationsChart";
import { PageHeader } from "@/components/admin/PageHeader";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "لوحة التحكم — من اللي عندك؟" }],
  }),
  component: AdminPage,
});

interface UserRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  is_active: boolean;
  is_admin: boolean;
  recipes_today: number;
  recipes_limit: number;
  created_at: string;
}

interface RecentPost {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
  user_id: string;
  likes_count: number;
  comments_count: number;
}

interface RecentMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  status: string;
  created_at: string;
}

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const { t, lang } = useLang();
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [recipesCount, setRecipesCount] = useState(0);
  const [favCount, setFavCount] = useState(0);
  const [ingredientsCount, setIngredientsCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([]);
  const [authorMap, setAuthorMap] = useState<Record<string, { name: string | null; avatar: string | null }>>({});
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const [
      recipesRes,
      usersRes,
      favsRes,
      ingsRes,
      postsCountRes,
      unreadRes,
      recentPostsRes,
      recentMsgsRes,
    ] = await Promise.all([
      supabase.from("recipes").select("*", { count: "exact", head: true }),
      supabase.rpc("admin_list_users"),
      supabase.from("favorites").select("*", { count: "exact", head: true }),
      supabase.from("ingredients_catalog").select("*", { count: "exact", head: true }),
      supabase.from("community_posts").select("*", { count: "exact", head: true }).eq("is_hidden", false),
      supabase.from("contact_messages").select("*", { count: "exact", head: true }).eq("status", "new"),
      supabase
        .from("community_posts")
        .select("id, title, content, created_at, user_id, likes_count, comments_count")
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("contact_messages")
        .select("id, name, email, message, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    if (typeof recipesRes.count === "number") setRecipesCount(recipesRes.count);
    if (usersRes.data) setUsers(usersRes.data as UserRow[]);
    if (typeof favsRes.count === "number") setFavCount(favsRes.count);
    if (typeof ingsRes.count === "number") setIngredientsCount(ingsRes.count);
    if (typeof postsCountRes.count === "number") setPostsCount(postsCountRes.count);
    if (typeof unreadRes.count === "number") setUnreadMessages(unreadRes.count);
    if (recentPostsRes.data) setRecentPosts(recentPostsRes.data as RecentPost[]);
    if (recentMsgsRes.data) setRecentMessages(recentMsgsRes.data as RecentMessage[]);

    // Fetch author profiles for recent posts (best-effort)
    const authorIds = Array.from(new Set((recentPostsRes.data ?? []).map((p) => p.user_id)));
    if (authorIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", authorIds);
      if (profiles) {
        const map: Record<string, { name: string | null; avatar: string | null }> = {};
        for (const p of profiles) {
          map[p.id] = { name: p.display_name, avatar: p.avatar_url };
        }
        setAuthorMap(map);
      }
    }

    setIsLoading(false);
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
    // New users in last 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const newThisWeek = users.filter((u) => new Date(u.created_at).getTime() > sevenDaysAgo).length;
    // Active users (with at least 1 generation today)
    const activeToday = users.filter((u) => (u.recipes_today || 0) > 0).length;
    return { totalUsers, banned, admins, todayUses, newThisWeek, activeToday };
  }, [users]);

  const topUsers = useMemo(() => {
    return [...users]
      .filter((u) => (u.recipes_today || 0) > 0)
      .sort((a, b) => (b.recipes_today || 0) - (a.recipes_today || 0))
      .slice(0, 5);
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

  const dateLocale = lang === "ar" ? ar : enUS;
  const fmtTime = (iso: string) =>
    formatDistanceToNow(new Date(iso), { addSuffix: true, locale: dateLocale });

  return (
    <div>
      <PageHeader
        title={t.admin.title}
        description={
          lang === "ar"
            ? "نظرة شاملة على نشاط الموقع وأحدث التفاعلات"
            : "Comprehensive overview of site activity and latest interactions"
        }
        icon={<LayoutDashboard className="h-4 w-4" />}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            {lang === "ar" ? "تحديث" : "Refresh"}
          </Button>
        }
      />

      {/* Primary KPIs */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          label={lang === "ar" ? "المستخدمون" : "Users"}
          value={stats.totalUsers}
          delta={stats.newThisWeek > 0 ? `+${stats.newThisWeek} ${lang === "ar" ? "هذا الأسبوع" : "this week"}` : undefined}
          tone="primary"
          loading={isLoading}
        />
        <KpiCard
          icon={ChefHat}
          label={lang === "ar" ? "الوصفات" : "Recipes"}
          value={recipesCount}
          delta={`${ingredientsCount} ${lang === "ar" ? "مكون" : "ingredients"}`}
          tone="accent"
          loading={isLoading}
        />
        <KpiCard
          icon={Activity}
          label={lang === "ar" ? "نشط اليوم" : "Active today"}
          value={stats.activeToday}
          delta={`${stats.todayUses} ${lang === "ar" ? "توليد" : "generations"}`}
          tone="emerald"
          loading={isLoading}
        />
        <KpiCard
          icon={MessagesSquare}
          label={lang === "ar" ? "بوستات المجتمع" : "Community posts"}
          value={postsCount}
          delta={
            unreadMessages > 0
              ? `${unreadMessages} ${lang === "ar" ? "رسالة جديدة" : "new messages"}`
              : undefined
          }
          tone="rose"
          loading={isLoading}
        />
      </section>

      {/* Secondary KPIs */}
      <section className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat
          icon={Heart}
          label={lang === "ar" ? "المفضلات" : "Favorites"}
          value={favCount}
        />
        <MiniStat
          icon={ShieldCheck}
          label={lang === "ar" ? "أدمنز" : "Admins"}
          value={stats.admins}
        />
        <MiniStat
          icon={Ban}
          label={lang === "ar" ? "محظورين" : "Banned"}
          value={stats.banned}
          tone="destructive"
        />
        <MiniStat
          icon={Inbox}
          label={lang === "ar" ? "رسائل جديدة" : "New messages"}
          value={unreadMessages}
          tone="accent"
        />
      </section>

      {/* Quick links */}
      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              ? `${stats.totalUsers} مستخدم — صلاحيات وحدود`
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
      </section>

      {/* Chart */}
      <section className="mt-6">
        <GenerationsChart />
      </section>

      {/* Activity grids */}
      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Top users today */}
        <Panel
          title={lang === "ar" ? "أكثر المستخدمين نشاطاً اليوم" : "Top users today"}
          icon={<TrendingUp className="h-4 w-4" />}
          action={{ to: "/admin/users", label: lang === "ar" ? "كل المستخدمين" : "All users" }}
        >
          {isLoading ? (
            <SkeletonRows />
          ) : topUsers.length === 0 ? (
            <EmptyState text={lang === "ar" ? "لا يوجد نشاط بعد اليوم" : "No activity yet today"} />
          ) : (
            <ul className="divide-y divide-border/60">
              {topUsers.map((u) => (
                <li key={u.id} className="flex items-center gap-2.5 py-2.5">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={u.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[11px]">
                      {(u.display_name ?? u.email ?? "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold">
                      {u.display_name ?? u.email ?? "—"}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">{u.email}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-[10px] tabular-nums">
                    {u.recipes_today}/{u.recipes_limit}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Recent community posts */}
        <Panel
          title={lang === "ar" ? "آخر بوستات المجتمع" : "Latest community posts"}
          icon={<MessagesSquare className="h-4 w-4" />}
          action={{ to: "/admin/community", label: lang === "ar" ? "إدارة المجتمع" : "Manage community" }}
        >
          {isLoading ? (
            <SkeletonRows />
          ) : recentPosts.length === 0 ? (
            <EmptyState text={lang === "ar" ? "لا توجد بوستات بعد" : "No posts yet"} />
          ) : (
            <ul className="divide-y divide-border/60">
              {recentPosts.map((p) => {
                const author = authorMap[p.user_id];
                return (
                  <li key={p.id} className="py-2.5">
                    <div className="flex items-start gap-2.5">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={author?.avatar ?? undefined} />
                        <AvatarFallback className="text-[10px]">
                          {(author?.name ?? "?").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold">
                          {author?.name ?? (lang === "ar" ? "مستخدم" : "User")}
                        </p>
                        <p className="line-clamp-2 text-[11px] text-muted-foreground">
                          {p.title ?? p.content}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="inline-flex items-center gap-0.5">
                            <Heart className="h-2.5 w-2.5" /> {p.likes_count}
                          </span>
                          <span className="inline-flex items-center gap-0.5">
                            <MessagesSquare className="h-2.5 w-2.5" /> {p.comments_count}
                          </span>
                          <span className="inline-flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" /> {fmtTime(p.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {/* Recent contact messages */}
        <Panel
          title={lang === "ar" ? "آخر الرسائل" : "Latest messages"}
          icon={<Inbox className="h-4 w-4" />}
          action={{ to: "/admin/messages", label: lang === "ar" ? "كل الرسائل" : "All messages" }}
        >
          {isLoading ? (
            <SkeletonRows />
          ) : recentMessages.length === 0 ? (
            <EmptyState text={lang === "ar" ? "لا توجد رسائل" : "No messages"} />
          ) : (
            <ul className="divide-y divide-border/60">
              {recentMessages.map((m) => (
                <li key={m.id} className="py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-xs font-bold">{m.name}</p>
                        {m.status === "new" ? (
                          <Badge className="h-4 bg-primary/15 px-1.5 text-[9px] font-bold text-primary hover:bg-primary/15">
                            {lang === "ar" ? "جديد" : "New"}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="truncate text-[10px] text-muted-foreground">{m.email}</p>
                      <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                        {m.message}
                      </p>
                      <p className="mt-1 inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" /> {fmtTime(m.created_at)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>
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

function KpiCard({
  icon: Icon,
  label,
  value,
  delta,
  tone,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  delta?: string;
  tone: keyof typeof TONES;
  loading?: boolean;
}) {
  return (
    <Card className={`rounded-2xl border-border/60 bg-gradient-to-br ${TONES[tone]} p-4 shadow-card`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold opacity-80">{label}</p>
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-background/50">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-16" />
      ) : (
        <p className="mt-2 text-3xl font-black tabular-nums">{value.toLocaleString()}</p>
      )}
      {delta ? <p className="mt-0.5 text-[10px] font-semibold opacity-70">{delta}</p> : null}
    </Card>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  tone = "primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone?: keyof typeof TONES;
}) {
  return (
    <Card className="flex items-center gap-2.5 rounded-xl border-border/60 p-3 shadow-card">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${TONES[tone]}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold text-muted-foreground">{label}</p>
        <p className="text-lg font-black tabular-nums">{value.toLocaleString()}</p>
      </div>
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

function Panel({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: { to: "/admin/users" | "/admin/community" | "/admin/messages"; label: string };
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl border-border/60 p-4 shadow-card">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5">
          {icon ? (
            <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 text-primary">
              {icon}
            </span>
          ) : null}
          <h3 className="text-sm font-bold">{title}</h3>
        </div>
        {action ? (
          <Link
            to={action.to}
            className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary hover:underline"
          >
            {action.label}
            <ArrowRight className="h-3 w-3 rtl:rotate-180" />
          </Link>
        ) : null}
      </div>
      {children}
    </Card>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-2.5 py-1.5">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2.5 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="grid place-items-center py-6 text-center">
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  );
}
