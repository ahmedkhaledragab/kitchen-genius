import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Loader2, Search, Shield, ShieldOff, Ban, CheckCircle2, Pencil, UserPlus, Download, Phone } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "إدارة المستخدمين — من اللي عندك؟" }] }),
  component: AdminUsersPage,
});

interface AdminUserRow {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  recipes_today: number;
  recipes_limit: number;
}

type UserFilter = "all" | "admin" | "user" | "active" | "banned";
type DateFilter = "all" | "7d" | "30d";

function AdminUsersPage() {
  const { user, isAdmin, loading } = useAuth();
  const { t, lang } = useLang();
  const navigate = useNavigate();

  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<UserFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const [editing, setEditing] = useState<{ user: AdminUserRow } | null>(null);
  const [newLimit, setNewLimit] = useState<number>(10);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    display_name: "",
    phone: "",
    make_admin: false,
  });

  const refresh = useCallback(async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_list_users");
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((data as AdminUserRow[]) ?? []);
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (isAdmin) refresh();
  }, [isAdmin, refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = Date.now();
    const cutoff =
      dateFilter === "7d" ? now - 7 * 86400000 : dateFilter === "30d" ? now - 30 * 86400000 : 0;
    return rows.filter((r) => {
      if (filter === "admin" && !r.is_admin) return false;
      if (filter === "user" && r.is_admin) return false;
      if (filter === "active" && !r.is_active) return false;
      if (filter === "banned" && r.is_active) return false;
      if (cutoff && new Date(r.created_at).getTime() < cutoff) return false;
      if (!q) return true;
      return (
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.display_name ?? "").toLowerCase().includes(q) ||
        (r.phone ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, filter, dateFilter]);

  const exportCsv = () => {
    const headers = [
      "id",
      "email",
      "display_name",
      "phone",
      "is_admin",
      "is_active",
      "created_at",
      "recipes_today",
      "recipes_limit",
    ];
    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const csv = [
      headers.join(","),
      ...filtered.map((r) =>
        [
          r.id,
          r.email,
          r.display_name,
          r.phone,
          r.is_admin,
          r.is_active,
          r.created_at,
          r.recipes_today,
          r.recipes_limit,
        ]
          .map(escape)
          .join(","),
      ),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(lang === "ar" ? "تم التصدير" : "Exported");
  };

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

  const setStatus = async (u: AdminUserRow, makeActive: boolean) => {
    const { error } = await supabase.rpc("admin_set_user_status", {
      _user_id: u.id,
      _is_active: makeActive,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(t.admin.users.statusUpdated);
      refresh();
    }
  };

  const setRole = async (u: AdminUserRow, makeAdmin: boolean) => {
    const { error } = await supabase.rpc("admin_set_user_role", {
      _user_id: u.id,
      _make_admin: makeAdmin,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(t.admin.users.roleUpdated);
      refresh();
    }
  };

  const openLimitEditor = (u: AdminUserRow) => {
    setEditing({ user: u });
    setNewLimit(u.recipes_limit);
  };

  const saveLimit = async () => {
    if (!editing) return;
    const { error } = await supabase.rpc("admin_set_user_limit", {
      _user_id: editing.user.id,
      _feature: "generate_recipes",
      _new_limit: Math.max(0, Math.floor(newLimit || 0)),
    });
    if (error) toast.error(error.message);
    else {
      toast.success(t.admin.users.limitUpdated);
      setEditing(null);
      refresh();
    }
  };

  const createUser = async () => {
    if (!newUser.email || newUser.password.length < 6) {
      toast.error(lang === "ar" ? "إيميل وكلمة سر صحيحين مطلوبين" : "Valid email and password required");
      return;
    }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: newUser,
    });
    setCreating(false);
    if (error || (data as { error?: string })?.error) {
      const msg = (data as { message?: string })?.message ?? error?.message ?? "error";
      toast.error(msg);
      return;
    }
    toast.success(t.admin.users.userCreated);
    setCreateOpen(false);
    setNewUser({ email: "", password: "", display_name: "", phone: "", make_admin: false });
    refresh();
  };

  const dateFmt = new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-5xl px-3 pb-20 pt-4 sm:px-4 sm:pt-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold sm:text-2xl">{t.admin.users.title}</h1>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.admin.users.search}
              className="ps-9 rounded-xl"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="rounded-xl"
          >
            <Download className="me-1 h-4 w-4" />
            {lang === "ar" ? `تصدير (${filtered.length})` : `Export (${filtered.length})`}
          </Button>
          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-xl gradient-primary text-primary-foreground hover:opacity-95"
          >
            <UserPlus className="me-1 h-4 w-4" />
            {t.admin.users.addUser}
          </Button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {(
          [
            { k: "all", ar: "الكل", en: "All" },
            { k: "admin", ar: "أدمن", en: "Admins" },
            { k: "user", ar: "مستخدمين", en: "Users" },
            { k: "active", ar: "نشط", en: "Active" },
            { k: "banned", ar: "محظور", en: "Banned" },
          ] as const
        ).map((f) => (
          <button
            key={f.k}
            type="button"
            onClick={() => setFilter(f.k as UserFilter)}
            className={`rounded-full px-3 py-1 text-xs font-bold transition ${
              filter === f.k
                ? "gradient-primary text-primary-foreground"
                : "border border-border/70 bg-background text-muted-foreground hover:bg-accent"
            }`}
          >
            {lang === "ar" ? f.ar : f.en}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {(
          [
            { k: "all", ar: "كل الوقت", en: "All time" },
            { k: "7d", ar: "آخر ٧ أيام", en: "Last 7 days" },
            { k: "30d", ar: "آخر ٣٠ يوم", en: "Last 30 days" },
          ] as const
        ).map((f) => (
          <button
            key={f.k}
            type="button"
            onClick={() => setDateFilter(f.k as DateFilter)}
            className={`rounded-full px-3 py-1 text-xs font-bold transition ${
              dateFilter === f.k
                ? "bg-foreground text-background"
                : "border border-border/70 bg-background text-muted-foreground hover:bg-accent"
            }`}
          >
            {lang === "ar" ? f.ar : f.en}
          </button>
        ))}
      </div>

      {busy && rows.length === 0 ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t.admin.users.empty}</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => {
            const isMe = u.id === user?.id;
            return (
              <Card key={u.id} className="rounded-2xl border-border/60 p-4 shadow-card">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-bold">
                        {u.display_name || u.email || u.id.slice(0, 8)}
                        {isMe && (
                          <span className="ms-1 text-xs font-normal text-muted-foreground">
                            {t.admin.users.you}
                          </span>
                        )}
                      </p>
                      <Badge
                        variant="secondary"
                        className={
                          u.is_admin
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {u.is_admin ? t.admin.users.admin : t.admin.users.user}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={
                          u.is_active
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : "bg-destructive/15 text-destructive"
                        }
                      >
                        {u.is_active ? t.admin.users.active : t.admin.users.banned}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{u.email}</p>
                    {u.phone && (
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground" dir="ltr">
                        <Phone className="h-3 w-3" />
                        {u.phone}
                      </p>
                    )}
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {t.admin.users.joined}: {dateFmt.format(new Date(u.created_at))}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => openLimitEditor(u)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border/70 bg-background px-2 py-1 hover:bg-accent"
                      >
                        🍳 {t.admin.users.recipes}: <b>{u.recipes_today}</b>/{u.recipes_limit}
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      disabled={isMe}
                      onClick={() => setRole(u, !u.is_admin)}
                    >
                      {u.is_admin ? (
                        <>
                          <ShieldOff className="me-1 h-4 w-4" />
                          {t.admin.users.revokeAdmin}
                        </>
                      ) : (
                        <>
                          <Shield className="me-1 h-4 w-4" />
                          {t.admin.users.makeAdmin}
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={
                        u.is_active
                          ? "rounded-xl text-destructive hover:bg-destructive/10"
                          : "rounded-xl text-emerald-600 hover:bg-emerald-500/10"
                      }
                      disabled={isMe}
                      onClick={() => setStatus(u, !u.is_active)}
                    >
                      {u.is_active ? (
                        <>
                          <Ban className="me-1 h-4 w-4" />
                          {t.admin.users.ban}
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="me-1 h-4 w-4" />
                          {t.admin.users.unban}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t.admin.users.recipesLimit}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {editing?.user.email ?? editing?.user.display_name}
            </p>
            <div>
              <label className="text-xs font-semibold">{t.admin.users.newLimit}</label>
              <Input
                type="number"
                min={0}
                value={newLimit}
                onChange={(e) => setNewLimit(Number(e.target.value))}
                className="mt-1 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setEditing(null)}>
              {t.admin.users.cancel}
            </Button>
            <Button
              className="rounded-xl gradient-primary text-primary-foreground hover:opacity-95"
              onClick={saveLimit}
            >
              {t.admin.users.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={(o) => !creating && setCreateOpen(o)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t.admin.users.addUserTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold">{t.admin.users.emailLabel}</label>
              <Input
                type="email"
                autoComplete="off"
                value={newUser.email}
                onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))}
                className="mt-1 rounded-xl"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-semibold">{t.admin.users.passwordLabel}</label>
              <Input
                type="password"
                autoComplete="new-password"
                value={newUser.password}
                onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))}
                className="mt-1 rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-semibold">{t.admin.users.displayNameLabel}</label>
              <Input
                value={newUser.display_name}
                onChange={(e) => setNewUser((u) => ({ ...u, display_name: e.target.value }))}
                className="mt-1 rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-semibold">{t.profile.phoneOptional}</label>
              <Input
                type="tel"
                value={newUser.phone}
                onChange={(e) => setNewUser((u) => ({ ...u, phone: e.target.value }))}
                maxLength={20}
                className="mt-1 rounded-xl"
                placeholder={t.profile.phonePlaceholder}
                dir="ltr"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={newUser.make_admin}
                onCheckedChange={(c) => setNewUser((u) => ({ ...u, make_admin: !!c }))}
              />
              <span>{t.admin.users.makeAdminLabel}</span>
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={creating}
              onClick={() => setCreateOpen(false)}
            >
              {t.admin.users.cancel}
            </Button>
            <Button
              className="rounded-xl gradient-primary text-primary-foreground hover:opacity-95"
              disabled={creating}
              onClick={createUser}
            >
              {creating ? (
                <>
                  <Loader2 className="me-1 h-4 w-4 animate-spin" />
                  {t.admin.users.creating}
                </>
              ) : (
                <>
                  <UserPlus className="me-1 h-4 w-4" />
                  {t.admin.users.confirm}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
