import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, Tags, ChefHat } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/categories")({
  component: AdminCategoriesPage,
});

type CategoryRow = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  sort_order: number;
  is_active: boolean;
};

type TableName = "ingredient_categories" | "recipe_cuisines";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function AdminCategoriesPage() {
  const { isAdmin } = useAuth();
  const { lang } = useLang();
  const isAr = lang === "ar";

  if (!isAdmin) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold sm:text-2xl">
            {isAr ? "إدارة الأصناف" : "Categories management"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAr
              ? "تصنيفات المكونات وتصنيفات الوصفات في مكان واحد."
              : "Manage ingredient categories and recipe cuisines in one place."}
          </p>
        </div>
      </div>

      <Tabs defaultValue="ingredients" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="ingredients" className="gap-1.5">
            <Tags className="h-3.5 w-3.5" />
            {isAr ? "تصنيفات المكونات" : "Ingredient categories"}
          </TabsTrigger>
          <TabsTrigger value="cuisines" className="gap-1.5">
            <ChefHat className="h-3.5 w-3.5" />
            {isAr ? "تصنيفات الوصفات" : "Recipe cuisines"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ingredients" className="mt-4">
          <CategoryManager
            table="ingredient_categories"
            titleAr="تصنيفات المكونات"
            titleEn="Ingredient categories"
          />
        </TabsContent>

        <TabsContent value="cuisines" className="mt-4">
          <CategoryManager
            table="recipe_cuisines"
            titleAr="تصنيفات الوصفات"
            titleEn="Recipe cuisines"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CategoryManager({
  table,
  titleAr,
  titleEn,
}: {
  table: TableName;
  titleAr: string;
  titleEn: string;
}) {
  const { lang } = useLang();
  const isAr = lang === "ar";

  const [rows, setRows] = useState<CategoryRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<CategoryRow | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name_ar", { ascending: true });
    if (error) {
      toast.error(isAr ? "حصلت مشكلة وإحنا بنحمّل القائمة 💔" : "Couldn't load");
    } else {
      setRows((data ?? []) as CategoryRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  const empty = useMemo(() => !loading && (rows?.length ?? 0) === 0, [loading, rows]);

  return (
    <Card className="rounded-3xl p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-extrabold sm:text-lg">
          {isAr ? titleAr : titleEn}
        </h2>
        <Button
          size="sm"
          className="rounded-full"
          onClick={() => setAdding(true)}
        >
          <Plus className="me-1.5 h-4 w-4" />
          {isAr ? "إضافة" : "Add"}
        </Button>
      </div>

      {loading ? (
        <div className="grid place-items-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : empty ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          {isAr ? "ما فيش حاجة لسه — ابدأي بإضافة صنف." : "Nothing yet — add your first one."}
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {rows!.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold">
                    {isAr ? r.name_ar : r.name_en}
                  </p>
                  {!r.is_active && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {isAr ? "موقوف" : "inactive"}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {isAr ? r.name_en : r.name_ar} · {r.slug} · #{r.sort_order}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setEditing(r)}
                aria-label="edit"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-destructive hover:text-destructive"
                onClick={() => setDeleting(r)}
                aria-label="delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {(adding || editing) && (
        <CategoryDialog
          table={table}
          row={editing}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSaved={() => {
            setAdding(false);
            setEditing(null);
            load();
          }}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isAr ? "تأكيد الحذف" : "Confirm delete"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isAr
                ? `هتمسحي "${deleting ? deleting.name_ar : ""}"؟ ده مش هيرجع تاني.`
                : `Delete "${deleting?.name_en ?? ""}"? This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">
              {isAr ? "إلغاء" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleting) return;
                const { error } = await supabase
                  .from(table)
                  .delete()
                  .eq("id", deleting.id);
                if (error) {
                  toast.error(isAr ? "ما قدرناش نمسح 💔" : "Couldn't delete");
                } else {
                  toast.success(isAr ? "اتمسح 💖" : "Deleted 💖");
                  setDeleting(null);
                  load();
                }
              }}
            >
              {isAr ? "احذفي" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function CategoryDialog({
  table,
  row,
  onClose,
  onSaved,
}: {
  table: TableName;
  row: CategoryRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const isEdit = !!row;

  const [nameAr, setNameAr] = useState(row?.name_ar ?? "");
  const [nameEn, setNameEn] = useState(row?.name_en ?? "");
  const [slug, setSlug] = useState(row?.slug ?? "");
  const [sortOrder, setSortOrder] = useState(row?.sort_order ?? 0);
  const [isActive, setIsActive] = useState(row?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  // Auto-generate slug when adding from English name
  useEffect(() => {
    if (!isEdit && !slug && nameEn) setSlug(slugify(nameEn));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameEn]);

  async function handleSave() {
    if (!nameAr.trim() || !nameEn.trim() || !slug.trim()) {
      toast.error(isAr ? "املي كل الحقول يا حلوة 💕" : "Please fill all fields");
      return;
    }
    setSaving(true);
    const payload = {
      name_ar: nameAr.trim(),
      name_en: nameEn.trim(),
      slug: slugify(slug),
      sort_order: Number(sortOrder) || 0,
      is_active: isActive,
    };
    const { error } = isEdit
      ? await supabase.from(table).update(payload).eq("id", row!.id)
      : await supabase.from(table).insert(payload);
    setSaving(false);
    if (error) {
      toast.error(
        error.message.includes("duplicate")
          ? isAr
            ? "الـslug ده موجود قبل كده"
            : "Slug already exists"
          : isAr
            ? "ما قدرناش نحفظ 💔"
            : "Couldn't save",
      );
      return;
    }
    toast.success(isAr ? "اتحفظ 💖" : "Saved 💖");
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? isAr
                ? "تعديل صنف"
                : "Edit category"
              : isAr
                ? "إضافة صنف"
                : "Add category"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="name_ar">{isAr ? "الاسم بالعربي" : "Arabic name"}</Label>
            <Input
              id="name_ar"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              dir="rtl"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="name_en">{isAr ? "الاسم بالإنجليزي" : "English name"}</Label>
            <Input
              id="name_en"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              dir="ltr"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              dir="ltr"
              placeholder="vegetables"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="sort">{isAr ? "الترتيب" : "Sort order"}</Label>
              <Input
                id="sort"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
              />
            </div>
            <div className="flex items-end gap-2 pb-1.5">
              <Switch
                id="active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="active" className="cursor-pointer">
                {isAr ? "نشط" : "Active"}
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={onClose}>
            {isAr ? "إلغاء" : "Cancel"}
          </Button>
          <Button className="rounded-full" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="me-1.5 h-4 w-4 animate-spin" />}
            {isAr ? "حفظ" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
