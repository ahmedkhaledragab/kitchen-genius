import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, Tags, ChefHat, GripVertical } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  icon: string | null;
  sort_order: number;
  is_active: boolean;
};

type TableName = "ingredient_categories" | "recipe_cuisines";

const SUGGESTED_EMOJIS = [
  "🥬","🥩","🥛","🌾","🍅","🥕","🧄","🧅","🌶️","🌽","🥔","🍆","🥒","🥦","🥑",
  "🍎","🍌","🍇","🍊","🍓","🍋","🥭","🍍","🥥","🍑",
  "🍞","🧀","🥚","🍳","🥓","🍗","🍖","🐟","🦐","🦀",
  "🍝","🍕","🍔","🌮","🌯","🥗","🍜","🍲","🍛","🍱",
  "🍰","🧁","🍪","🍩","🍫","🍯","☕","🍵",
  "🇪🇬","🇮🇹","🇨🇳","🇯🇵","🇮🇳","🇲🇽","🇫🇷","🇹🇷","🇱🇧","🇸🇦",
];

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
              ? "اسحبي وأفلتي لإعادة الترتيب 💕"
              : "Drag and drop to reorder."}
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

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

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id || !rows) return;
    const oldIdx = rows.findIndex((r) => r.id === active.id);
    const newIdx = rows.findIndex((r) => r.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;

    const reordered = arrayMove(rows, oldIdx, newIdx).map((r, i) => ({
      ...r,
      sort_order: i,
    }));
    setRows(reordered); // optimistic

    // Persist new sort_order for each row
    const updates = reordered.map((r) =>
      supabase.from(table).update({ sort_order: r.sort_order }).eq("id", r.id),
    );
    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      toast.error(isAr ? "ما قدرناش نحفظ الترتيب 💔" : "Couldn't save order");
      load();
    }
  }

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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={rows!.map((r) => r.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="divide-y divide-border/60">
              {rows!.map((r) => (
                <SortableRow
                  key={r.id}
                  row={r}
                  isAr={isAr}
                  onEdit={() => setEditing(r)}
                  onDelete={() => setDeleting(r)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {(adding || editing) && (
        <CategoryDialog
          table={table}
          row={editing}
          rowsCount={rows?.length ?? 0}
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

function SortableRow({
  row,
  isAr,
  onEdit,
  onDelete,
}: {
  row: CategoryRow;
  isAr: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 py-2.5"
    >
      <button
        type="button"
        className="touch-none rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="drag"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-lg">
        {row.icon || "🏷️"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-bold">
            {isAr ? row.name_ar : row.name_en}
          </p>
          {!row.is_active && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {isAr ? "موقوف" : "inactive"}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {isAr ? row.name_en : row.name_ar} · {row.slug}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={onEdit}
        aria-label="edit"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full text-destructive hover:text-destructive"
        onClick={onDelete}
        aria-label="delete"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
}

function CategoryDialog({
  table,
  row,
  rowsCount,
  onClose,
  onSaved,
}: {
  table: TableName;
  row: CategoryRow | null;
  rowsCount: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const isEdit = !!row;

  const [nameAr, setNameAr] = useState(row?.name_ar ?? "");
  const [nameEn, setNameEn] = useState(row?.name_en ?? "");
  const [slug, setSlug] = useState(row?.slug ?? "");
  const [icon, setIcon] = useState(row?.icon ?? "");
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
      icon: icon.trim() || null,
      is_active: isActive,
      ...(isEdit ? {} : { sort_order: rowsCount }),
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
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl">
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
            <Label>{isAr ? "الأيقونة" : "Icon"}</Label>
            <div className="flex items-center gap-2">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-2xl">
                {icon || "🏷️"}
              </span>
              <Input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="🥬"
                maxLength={4}
                dir="ltr"
                className="text-center text-lg"
              />
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {SUGGESTED_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setIcon(e)}
                  className={`grid h-8 w-8 place-items-center rounded-lg text-base hover:bg-muted ${
                    icon === e ? "bg-primary/15 ring-1 ring-primary" : ""
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

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
          <div className="flex items-center gap-2">
            <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="active" className="cursor-pointer">
              {isAr ? "نشط" : "Active"}
            </Label>
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
