import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { ArrowLeft, Plus, Trash2, Search, Pencil, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategoriesCatalog } from "@/hooks/useCategoriesCatalog";
import { useKitchens } from "@/hooks/useKitchens";

export const Route = createFileRoute("/admin/ingredients")({
  head: () => ({
    meta: [{ title: "كتالوج المكونات — الأدمن" }],
  }),
  component: AdminIngredientsPage,
});

interface Ingredient {
  id: string;
  name_ar: string;
  name_en: string;
  category: string | null;
  is_active: boolean;
  sort_order: number;
}

interface DraftRow {
  name_ar: string;
  name_en: string;
  category: string;
  sort_order: number;
  kitchen_ids: string[];
}

// `ingredient_kitchens` is a new table not yet in the auto-generated types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

function AdminIngredientsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const tx = t.admin.ingredientsCatalog;

  const { items: catOptions } = useCategoriesCatalog("ingredient_categories");
  const { items: kitchens } = useKitchens();

  const [items, setItems] = useState<Ingredient[]>([]);
  // Map of ingredient_id -> kitchen_id[] (so we can show chips per row).
  const [kitchenLinks, setKitchenLinks] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | "all">("all");
  const [activeKitchen, setActiveKitchen] = useState<string | "all">("all");
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [newDraft, setNewDraft] = useState<DraftRow>({
    name_ar: "",
    name_en: "",
    category: "",
    sort_order: 999,
    kitchen_ids: [],
  });
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [{ data, error }, { data: links }] = await Promise.all([
      supabase
        .from("ingredients_catalog")
        .select("*")
        .order("category", { ascending: true, nullsFirst: false })
        .order("sort_order", { ascending: true })
        .order("name_ar", { ascending: true }),
      sb.from("ingredient_kitchens").select("ingredient_id, kitchen_id"),
    ]);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems((data ?? []) as Ingredient[]);
    const map: Record<string, string[]> = {};
    for (const l of (links ?? []) as Array<{ ingredient_id: string; kitchen_id: string }>) {
      (map[l.ingredient_id] ??= []).push(l.kitchen_id);
    }
    setKitchenLinks(map);
  }, []);

  useEffect(() => {
    if (isAdmin) refresh();
  }, [isAdmin, refresh]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    items.forEach((it) => {
      if (it.category) s.add(it.category);
    });
    return Array.from(s).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const lc = q.trim().toLowerCase();
    return items.filter((it) => {
      if (activeCategory !== "all" && it.category !== activeCategory) return false;
      if (activeKitchen !== "all") {
        const linked = kitchenLinks[it.id] ?? [];
        if (!linked.includes(activeKitchen)) return false;
      }
      if (!lc) return true;
      return (
        it.name_ar.toLowerCase().includes(lc) ||
        it.name_en.toLowerCase().includes(lc) ||
        (it.category ?? "").toLowerCase().includes(lc)
      );
    });
  }, [items, q, activeCategory, activeKitchen, kitchenLinks]);

  // Persist the kitchens link rows for an ingredient (delete-then-insert).
  const saveKitchenLinks = async (ingredientId: string, kitchenIds: string[]) => {
    await sb.from("ingredient_kitchens").delete().eq("ingredient_id", ingredientId);
    if (kitchenIds.length > 0) {
      await sb.from("ingredient_kitchens").insert(
        kitchenIds.map((kid) => ({ ingredient_id: ingredientId, kitchen_id: kid })),
      );
    }
    setKitchenLinks((prev) => ({ ...prev, [ingredientId]: [...kitchenIds] }));
  };

  if (authLoading) return null;
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 pt-16 text-center">
        <Card className="rounded-3xl p-8">
          <p className="text-sm text-muted-foreground">{t.admin.noAccess}</p>
        </Card>
      </div>
    );
  }

  const startEdit = (it: Ingredient) => {
    setEditId(it.id);
    setEditDraft({
      name_ar: it.name_ar,
      name_en: it.name_en,
      category: it.category ?? "",
      sort_order: it.sort_order,
      kitchen_ids: kitchenLinks[it.id] ?? [],
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditDraft(null);
  };

  const saveEdit = async (id: string) => {
    if (!editDraft) return;
    if (!editDraft.name_ar.trim() || !editDraft.name_en.trim()) {
      toast.error(lang === "ar" ? "الاسم العربي والإنجليزي مطلوبين" : "Both names required");
      return;
    }
    setBusyId(id);
    const { error } = await supabase
      .from("ingredients_catalog")
      .update({
        name_ar: editDraft.name_ar.trim(),
        name_en: editDraft.name_en.trim(),
        category: editDraft.category.trim() || null,
        sort_order: Number(editDraft.sort_order) || 0,
      })
      .eq("id", id);
    if (!error) {
      await saveKitchenLinks(id, editDraft.kitchen_ids);
    }
    setBusyId(null);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(tx.updated);
      cancelEdit();
      refresh();
    }
  };

  const toggleActive = async (it: Ingredient) => {
    setBusyId(it.id);
    const { error } = await supabase
      .from("ingredients_catalog")
      .update({ is_active: !it.is_active })
      .eq("id", it.id);
    setBusyId(null);
    if (error) {
      toast.error(error.message);
    } else {
      setItems((prev) =>
        prev.map((x) => (x.id === it.id ? { ...x, is_active: !x.is_active } : x)),
      );
    }
  };

  const remove = async (it: Ingredient) => {
    if (!window.confirm(tx.confirmDelete)) return;
    setBusyId(it.id);
    const { error } = await supabase.from("ingredients_catalog").delete().eq("id", it.id);
    setBusyId(null);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(tx.deleted);
      setItems((prev) => prev.filter((x) => x.id !== it.id));
    }
  };

  const addNew = async () => {
    if (!newDraft.name_ar.trim() || !newDraft.name_en.trim()) {
      toast.error(lang === "ar" ? "الاسم العربي والإنجليزي مطلوبين" : "Both names required");
      return;
    }
    setBusyId("__new__");
    const { data: inserted, error } = await supabase
      .from("ingredients_catalog")
      .insert({
        name_ar: newDraft.name_ar.trim(),
        name_en: newDraft.name_en.trim(),
        category: newDraft.category.trim() || null,
        sort_order: Number(newDraft.sort_order) || 999,
        is_active: true,
      })
      .select("id")
      .single();
    if (!error && inserted && newDraft.kitchen_ids.length > 0) {
      await saveKitchenLinks(inserted.id, newDraft.kitchen_ids);
    }
    setBusyId(null);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(tx.added);
      setNewDraft({ name_ar: "", name_en: "", category: "", sort_order: 999, kitchen_ids: [] });
      setAdding(false);
      refresh();
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-3 pb-20 pt-4 sm:px-4 sm:pt-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="rounded-xl text-muted-foreground">
            <Link to="/admin">
              <ArrowLeft className="me-1 h-4 w-4" />
              {tx.backToAdmin}
            </Link>
          </Button>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">
            <span className="gradient-text">{tx.title}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{tx.subtitle}</p>
        </div>
        <Button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="rounded-xl gradient-primary text-primary-foreground hover:opacity-95"
        >
          <Plus className="me-1 h-4 w-4" />
          {tx.addNew}
        </Button>
      </div>

      {/* Add new */}
      {adding && (
        <Card className="mt-4 rounded-3xl border-primary/30 bg-primary/5 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <label className="text-xs font-semibold">{tx.nameAr}</label>
              <Input
                value={newDraft.name_ar}
                onChange={(e) => setNewDraft((d) => ({ ...d, name_ar: e.target.value }))}
                placeholder={tx.emptyAr}
                className="mt-1 rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-semibold">{tx.nameEn}</label>
              <Input
                value={newDraft.name_en}
                onChange={(e) => setNewDraft((d) => ({ ...d, name_en: e.target.value }))}
                placeholder={tx.emptyEn}
                className="mt-1 rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-semibold">{tx.category}</label>
              <Select
                value={newDraft.category || "__none__"}
                onValueChange={(v) =>
                  setNewDraft((d) => ({ ...d, category: v === "__none__" ? "" : v }))
                }
              >
                <SelectTrigger className="mt-1 rounded-xl">
                  <SelectValue placeholder={lang === "ar" ? "اختاري" : "Select"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{lang === "ar" ? "بدون" : "None"}</SelectItem>
                  {catOptions.map((c) => (
                    <SelectItem key={c.id} value={c.slug}>
                      {c.icon ? `${c.icon} ` : ""}
                      {lang === "ar" ? c.name_ar : c.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold">{tx.sortOrder}</label>
              <Input
                type="number"
                value={newDraft.sort_order}
                onChange={(e) =>
                  setNewDraft((d) => ({ ...d, sort_order: Number(e.target.value) || 0 }))
                }
                className="mt-1 rounded-xl"
              />
            </div>
          </div>
          {kitchens.length > 0 && (
            <div className="mt-3">
              <label className="text-xs font-semibold">
                {lang === "ar" ? "المطابخ اللي يظهر فيها" : "Kitchens"}
              </label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {kitchens.map((k) => {
                  const checked = newDraft.kitchen_ids.includes(k.id);
                  return (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() =>
                        setNewDraft((d) => ({
                          ...d,
                          kitchen_ids: checked
                            ? d.kitchen_ids.filter((x) => x !== k.id)
                            : [...d.kitchen_ids, k.id],
                        }))
                      }
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition ${
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary"
                      }`}
                    >
                      {k.icon && <span aria-hidden>{k.icon}</span>}
                      {lang === "ar" ? k.name_ar : k.name_en}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="mt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAdding(false)}
              className="rounded-xl"
            >
              {t.common.cancel}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={addNew}
              disabled={busyId === "__new__"}
              className="rounded-xl gradient-primary text-primary-foreground"
            >
              {busyId === "__new__" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {tx.addNew}
            </Button>
          </div>
        </Card>
      )}

      {/* Search + categories */}
      <Card className="mt-4 rounded-3xl border-border/60 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tx.search}
            className="ps-9 rounded-xl"
          />
        </div>
        {categories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                activeCategory === "all"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {lang === "ar" ? "الكل" : "All"} ({items.length})
            </button>
            {categories.map((c) => {
              const count = items.filter((it) => it.category === c).length;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setActiveCategory(c)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    activeCategory === c
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary hover:text-primary"
                  }`}
                >
                  {c} ({count})
                </button>
              );
            })}
          </div>
        )}
        {kitchens.length > 0 && (
          <div className="mt-3 border-t border-border/50 pt-3">
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
              {lang === "ar" ? "فلترة بالمطبخ" : "Filter by kitchen"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setActiveKitchen("all")}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  activeKitchen === "all"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {lang === "ar" ? "الكل" : "All"}
              </button>
              {kitchens.map((k) => {
                const count = items.filter((it) =>
                  (kitchenLinks[it.id] ?? []).includes(k.id),
                ).length;
                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setActiveKitchen(k.id)}
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition ${
                      activeKitchen === k.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary hover:text-primary"
                    }`}
                  >
                    {k.icon && <span aria-hidden>{k.icon}</span>}
                    {lang === "ar" ? k.name_ar : k.name_en} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* List */}
      <Card className="mt-4 rounded-3xl border-border/60 p-2 sm:p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">{tx.noResults}</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start font-semibold">{tx.nameAr}</th>
                  <th className="px-3 py-2 text-start font-semibold">{tx.nameEn}</th>
                  <th className="hidden px-3 py-2 text-start font-semibold sm:table-cell">
                    {tx.category}
                  </th>
                  <th className="hidden px-3 py-2 text-center font-semibold sm:table-cell">
                    {tx.sortOrder}
                  </th>
                  <th className="px-3 py-2 text-center font-semibold">{tx.active}</th>
                  <th className="px-3 py-2 text-end font-semibold">
                    {lang === "ar" ? "إجراءات" : "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((it, i) => {
                  const isEditing = editId === it.id;
                  return (
                    <tr
                      key={it.id}
                      className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}
                    >
                      <td className="px-3 py-2">
                        {isEditing && editDraft ? (
                          <Input
                            value={editDraft.name_ar}
                            onChange={(e) =>
                              setEditDraft((d) => (d ? { ...d, name_ar: e.target.value } : d))
                            }
                            className="h-8 rounded-lg"
                          />
                        ) : (
                          <span className="font-semibold">{it.name_ar}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {isEditing && editDraft ? (
                          <Input
                            value={editDraft.name_en}
                            onChange={(e) =>
                              setEditDraft((d) => (d ? { ...d, name_en: e.target.value } : d))
                            }
                            className="h-8 rounded-lg"
                          />
                        ) : (
                          it.name_en
                        )}
                      </td>
                      <td className="hidden px-3 py-2 text-xs text-muted-foreground sm:table-cell">
                        {isEditing && editDraft ? (
                          <Select
                            value={editDraft.category || "__none__"}
                            onValueChange={(v) =>
                              setEditDraft((d) =>
                                d ? { ...d, category: v === "__none__" ? "" : v } : d,
                              )
                            }
                          >
                            <SelectTrigger className="h-8 rounded-lg">
                              <SelectValue placeholder={lang === "ar" ? "اختاري" : "Select"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">
                                {lang === "ar" ? "بدون" : "None"}
                              </SelectItem>
                              {catOptions.map((c) => (
                                <SelectItem key={c.id} value={c.slug}>
                                  {c.icon ? `${c.icon} ` : ""}
                                  {lang === "ar" ? c.name_ar : c.name_en}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : it.category ? (
                          (() => {
                            const found = catOptions.find((c) => c.slug === it.category);
                            return found
                              ? `${found.icon ? found.icon + " " : ""}${
                                  lang === "ar" ? found.name_ar : found.name_en
                                }`
                              : it.category;
                          })()
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="hidden px-3 py-2 text-center text-xs text-muted-foreground sm:table-cell">
                        {isEditing && editDraft ? (
                          <Input
                            type="number"
                            value={editDraft.sort_order}
                            onChange={(e) =>
                              setEditDraft((d) =>
                                d ? { ...d, sort_order: Number(e.target.value) || 0 } : d,
                              )
                            }
                            className="h-8 w-20 rounded-lg text-center"
                          />
                        ) : (
                          it.sort_order
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Switch
                          checked={it.is_active}
                          onCheckedChange={() => toggleActive(it)}
                          disabled={busyId === it.id}
                        />
                      </td>
                      <td className="px-3 py-2 text-end">
                        <div className="inline-flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => saveEdit(it.id)}
                                disabled={busyId === it.id}
                                className="rounded-lg text-primary hover:bg-primary/10"
                                aria-label="save"
                              >
                                {busyId === it.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={cancelEdit}
                                className="rounded-lg text-muted-foreground hover:bg-muted"
                                aria-label="cancel"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => startEdit(it)}
                                className="rounded-lg text-primary hover:bg-primary/10"
                                aria-label="edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => remove(it)}
                                disabled={busyId === it.id}
                                className="rounded-lg text-destructive hover:bg-destructive/10"
                                aria-label="delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isEditing && editDraft && kitchens.length > 0 && (
                      <tr key={`${it.id}-kitchens`} className="bg-primary/5">
                        <td colSpan={6} className="px-3 py-2">
                          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
                            {lang === "ar" ? "المطابخ:" : "Kitchens:"}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {kitchens.map((k) => {
                              const checked = editDraft.kitchen_ids.includes(k.id);
                              return (
                                <button
                                  key={k.id}
                                  type="button"
                                  onClick={() =>
                                    setEditDraft((d) =>
                                      d
                                        ? {
                                            ...d,
                                            kitchen_ids: checked
                                              ? d.kitchen_ids.filter((x) => x !== k.id)
                                              : [...d.kitchen_ids, k.id],
                                          }
                                        : d,
                                    )
                                  }
                                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition ${
                                    checked
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border bg-background text-muted-foreground hover:border-primary"
                                  }`}
                                >
                                  {k.icon && <span aria-hidden>{k.icon}</span>}
                                  {lang === "ar" ? k.name_ar : k.name_en}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 px-2 text-end text-xs text-muted-foreground">
          {filtered.length} / {items.length}
        </div>
      </Card>
    </div>
  );
}
