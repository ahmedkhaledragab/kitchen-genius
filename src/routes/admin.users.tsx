import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Loader2, Search, Shield, ShieldOff, Ban, CheckCircle2, Pencil } from "lucide-react";
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

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "إدارة المستخدمين — من اللي عندك؟" }] }),
  component: AdminUsersPage,
});

interface AdminUserRow {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  recipes_today: number;
  recipes_limit: number;
  fridge_today: number;
  fridge_limit: number;
}

function AdminUsersPage() {
  const { user, isAdmin, loading } = useAuth();
  const { t, lang } = useLang();
  const navigate = useNavigate();

  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  const [editing, setEditing] = useState<{ user: AdminUserRow; feature: "generate_recipes" | "detect_ingredients" } | null>(null);
  const [newLimit, setNewLimit] = useState<number>(10);

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
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.display_name ?? "").toLowerCase().includes(q),
    );
  }, [rows, query]);

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

  const openLimitEditor = (u: AdminUserRow, feature: "generate_recipes" | "detect_ingredients") => {
    setEditing({ user: u, feature });
    setNewLimit(feature === "generate_recipes" ? u.recipes_limit : u.fridge_limit);
  };

  const saveLimit = async () => {
    if (!editing) return;
    const { error } = await supabase.rpc("admin_set_user_limit", {
      _user_id: editing.user.id,
      _feature: editing.feature,
      _new_limit: Math.max(0, Math.floor(newLimit || 0)),
    });
    if (error) toast.error(error.message);
    else {
      toast.success(t.admin.users.limitUpdated);
      setEditing(null);
      refresh();
    }
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
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.admin.users.search}
            className="ps-9 rounded-xl"
          />
        </div>
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
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {t.admin.users.joined}: {dateFmt.format(new Date(u.created_at))}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => openLimitEditor(u, "generate_recipes")}
                        className="inline-flex items-center gap-1 rounded-lg border border-border/70 bg-background px-2 py-1 hover:bg-accent"
                      >
                        🍳 {t.admin.users.recipes}: <b>{u.recipes_today}</b>/{u.recipes_limit}
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openLimitEditor(u, "detect_ingredients")}
                        className="inline-flex items-center gap-1 rounded-lg border border-border/70 bg-background px-2 py-1 hover:bg-accent"
                      >
                        📸 {t.admin.users.fridge}: <b>{u.fridge_today}</b>/{u.fridge_limit}
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
            <DialogTitle>
              {editing?.feature === "generate_recipes"
                ? t.admin.users.recipesLimit
                : t.admin.users.fridgeLimit}
            </DialogTitle>
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
    </div>
  );
}
