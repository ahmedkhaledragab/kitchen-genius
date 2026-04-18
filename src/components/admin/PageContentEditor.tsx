import { useEffect, useState } from "react";
import { Loader2, Save, Plus, Trash2, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { useLang } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  invalidatePageContent,
  type PageContent,
  type PageItem,
  type PageCTA,
  type PageKey,
} from "@/hooks/usePageContent";

type LangKey = "ar" | "en";
const LANGS: LangKey[] = ["ar", "en"];

const empty = (): PageContent => ({});

const PAGE_TITLES: Record<PageKey, { ar: string; en: string }> = {
  home: { ar: "الصفحة الرئيسية", en: "Home page" },
  about: { ar: "صفحة من نحن", en: "About page" },
  features: { ar: "صفحة المميزات", en: "Features page" },
  contact: { ar: "صفحة تواصل معنا", en: "Contact page" },
};

const PAGE_PATHS: Record<PageKey, string> = {
  home: "/",
  about: "/about",
  features: "/features",
  contact: "/contact",
};

export function PageContentEditor({ pageKey }: { pageKey: PageKey }) {
  const { lang } = useLang();
  const ar = lang === "ar";

  const [content, setContent] = useState<{ ar: PageContent; en: PageContent }>({
    ar: empty(),
    en: empty(),
  });
  const [activeLang, setActiveLang] = useState<LangKey>("ar");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: row, error } = await supabase
        .from("pages_content")
        .select("content_ar, content_en")
        .eq("page_key", pageKey)
        .maybeSingle();
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      setContent({
        ar: ((row?.content_ar as PageContent) || {}) ?? {},
        en: ((row?.content_en as PageContent) || {}) ?? {},
      });
      setLoading(false);
    })();
  }, [pageKey]);

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const current = content[activeLang];

  const update = (patch: Partial<PageContent>) => {
    setContent((c) => ({
      ...c,
      [activeLang]: { ...c[activeLang], ...patch },
    }));
  };

  const updateList = <K extends "values" | "features" | "channels">(
    key: K,
    items: PageItem[],
  ) => update({ [key]: items } as Partial<PageContent>);

  const handleSave = async () => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("pages_content")
        .update({ content_ar: content.ar, content_en: content.en })
        .eq("page_key", pageKey);
      if (error) throw error;
      invalidatePageContent(pageKey);
      toast.success(ar ? "اتحفظ تمام 💖" : "Saved 💖");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const titles = PAGE_TITLES[pageKey];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </span>
          <div>
            <h1 className="text-lg font-extrabold sm:text-xl">
              {titles[ar ? "ar" : "en"]}
            </h1>
            <p className="text-xs text-muted-foreground">
              {ar
                ? "عدّلي العناوين والفقرات والعناصر بالعربي والإنجليزي."
                : "Edit titles, paragraphs and lists in Arabic & English."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            className="rounded-xl"
          >
            <a
              href={PAGE_PATHS[pageKey]}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={ar ? "معاينة الصفحة" : "Preview page"}
            >
              <ExternalLink className="me-1 h-4 w-4" />
              {ar ? "معاينة الصفحة" : "Preview page"}
            </a>
          </Button>
          <Button
            onClick={handleSave}
            disabled={busy}
            className="rounded-xl gradient-primary text-primary-foreground"
          >
            {busy ? (
              <Loader2 className="me-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="me-1 h-4 w-4" />
            )}
            {ar ? "حفظ التغييرات" : "Save changes"}
          </Button>
        </div>
      </div>

      <Tabs value={activeLang} onValueChange={(v) => setActiveLang(v as LangKey)}>
        <TabsList className="rounded-xl">
          {LANGS.map((l) => (
            <TabsTrigger key={l} value={l} className="rounded-lg uppercase">
              {l}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card className="rounded-3xl border-border/60 p-5 sm:p-6">
        <PageEditor
          pageKey={pageKey}
          content={current}
          onUpdate={update}
          onUpdateList={updateList}
          ar={ar}
        />
      </Card>
    </div>
  );
}

function PageEditor({
  pageKey,
  content,
  onUpdate,
  onUpdateList,
  ar,
}: {
  pageKey: PageKey;
  content: PageContent;
  onUpdate: (patch: Partial<PageContent>) => void;
  onUpdateList: (
    key: "values" | "features" | "channels",
    items: PageItem[],
  ) => void;
  ar: boolean;
}) {
  return (
    <div className="space-y-5">
      {/* Hero block */}
      <Section title={ar ? "البطل (Hero)" : "Hero"}>
        <Field label={ar ? "بادج صغير" : "Badge"}>
          <Input
            value={content.hero_badge ?? ""}
            onChange={(e) => onUpdate({ hero_badge: e.target.value })}
            className="rounded-xl"
          />
        </Field>
        <Field label={ar ? "العنوان الرئيسي" : "Main title"}>
          <Input
            value={content.hero_title ?? ""}
            onChange={(e) => onUpdate({ hero_title: e.target.value })}
            className="rounded-xl"
          />
        </Field>
        <Field label={ar ? "النص التحتي" : "Subtitle"}>
          <Textarea
            value={content.hero_sub ?? ""}
            onChange={(e) => onUpdate({ hero_sub: e.target.value })}
            rows={3}
            className="rounded-xl"
          />
        </Field>
      </Section>

      {pageKey === "home" && (
        <>
          <Section title={ar ? "خانة المكونات" : "Ingredients input"}>
            <Field label={ar ? "عنوان الخانة" : "Field label"}>
              <Input
                value={content.home_ingredients_label ?? ""}
                onChange={(e) => onUpdate({ home_ingredients_label: e.target.value })}
                className="rounded-xl"
                placeholder={ar ? "اكتب المكونات" : "Type ingredients"}
              />
            </Field>
            <Field label={ar ? "النص الإرشادي (placeholder)" : "Placeholder text"}>
              <Input
                value={content.home_ingredients_placeholder ?? ""}
                onChange={(e) => onUpdate({ home_ingredients_placeholder: e.target.value })}
                className="rounded-xl"
                placeholder={ar ? "مثال: بيض، طماطم، جبنة..." : "e.g. eggs, tomato, cheese..."}
              />
            </Field>
            <Field label={ar ? "زر الإضافة" : "Add button"}>
              <Input
                value={content.home_add_btn ?? ""}
                onChange={(e) => onUpdate({ home_add_btn: e.target.value })}
                className="rounded-xl"
                placeholder={ar ? "أضف" : "Add"}
              />
            </Field>
            <Field label={ar ? "عنوان الاقتراحات" : "Suggestions title"}>
              <Input
                value={content.home_suggestions_title ?? ""}
                onChange={(e) => onUpdate({ home_suggestions_title: e.target.value })}
                className="rounded-xl"
                placeholder={ar ? "اقتراحات" : "Suggestions"}
              />
            </Field>
          </Section>

          <Section title={ar ? "خانة الاستبعاد" : "Exclude input"}>
            <Field label={ar ? "عنوان الخانة" : "Field label"}>
              <Input
                value={content.home_exclude_label ?? ""}
                onChange={(e) => onUpdate({ home_exclude_label: e.target.value })}
                className="rounded-xl"
                placeholder={ar ? "مكونات تحب تستبعدها" : "Ingredients to exclude"}
              />
            </Field>
            <Field label={ar ? "النص الإرشادي (placeholder)" : "Placeholder text"}>
              <Input
                value={content.home_exclude_placeholder ?? ""}
                onChange={(e) => onUpdate({ home_exclude_placeholder: e.target.value })}
                className="rounded-xl"
                placeholder={ar ? "مثال: فلفل حار" : "e.g. chili"}
              />
            </Field>
          </Section>

          <Section title={ar ? "الفلاتر السريعة" : "Quick filters"}>
            <Field label={ar ? "عنوان القسم" : "Section title"}>
              <Input
                value={content.home_filters_title ?? ""}
                onChange={(e) => onUpdate({ home_filters_title: e.target.value })}
                className="rounded-xl"
                placeholder={ar ? "فلاتر سريعة" : "Quick filters"}
              />
            </Field>
            <Field label={ar ? "وجبة سريعة" : "Quick meal"}>
              <Input
                value={content.home_filter_quick ?? ""}
                onChange={(e) => onUpdate({ home_filter_quick: e.target.value })}
                className="rounded-xl"
              />
            </Field>
            <Field label={ar ? "اقتصادي" : "Budget"}>
              <Input
                value={content.home_filter_budget ?? ""}
                onChange={(e) => onUpdate({ home_filter_budget: e.target.value })}
                className="rounded-xl"
              />
            </Field>
            <Field label={ar ? "صحي / دايت" : "Healthy"}>
              <Input
                value={content.home_filter_healthy ?? ""}
                onChange={(e) => onUpdate({ home_filter_healthy: e.target.value })}
                className="rounded-xl"
              />
            </Field>
            <Field label={ar ? "أكلات عربية" : "Arabic dishes"}>
              <Input
                value={content.home_filter_arab ?? ""}
                onChange={(e) => onUpdate({ home_filter_arab: e.target.value })}
                className="rounded-xl"
              />
            </Field>
          </Section>

          <Section title={ar ? "زر التوليد ورسائل الحالة" : "Generate button & states"}>
            <Field label={ar ? "نص زر التوليد" : "Generate button label"}>
              <Input
                value={content.home_cook_btn ?? ""}
                onChange={(e) => onUpdate({ home_cook_btn: e.target.value })}
                className="rounded-xl"
                placeholder={ar ? "يلا نطبخ 🍳" : "Let's cook 🍳"}
              />
            </Field>
            <Field label={ar ? "أثناء التحميل" : "While generating"}>
              <Input
                value={content.home_generating ?? ""}
                onChange={(e) => onUpdate({ home_generating: e.target.value })}
                className="rounded-xl"
                placeholder={ar ? "بنحضرلك وصفات..." : "Cooking up recipes..."}
              />
            </Field>
            <Field label={ar ? "عنوان النتائج" : "Results title"}>
              <Input
                value={content.home_results_title ?? ""}
                onChange={(e) => onUpdate({ home_results_title: e.target.value })}
                className="rounded-xl"
                placeholder={ar ? "الوصفات المقترحة" : "Suggested recipes"}
              />
            </Field>
            <Field label={ar ? "رسالة لما مفيش نتائج" : "No results message"}>
              <Textarea
                value={content.home_no_results ?? ""}
                onChange={(e) => onUpdate({ home_no_results: e.target.value })}
                rows={2}
                className="rounded-xl"
              />
            </Field>
            <Field label={ar ? "رسالة لو محدش حط مكونات" : "Empty ingredients warning"}>
              <Textarea
                value={content.home_no_ingredients ?? ""}
                onChange={(e) => onUpdate({ home_no_ingredients: e.target.value })}
                rows={2}
                className="rounded-xl"
              />
            </Field>
          </Section>
        </>
      )}

      {pageKey === "about" && (
        <>
          <Section title={ar ? "المهمة" : "Mission"}>
            <Field label={ar ? "عنوان" : "Title"}>
              <Input
                value={content.mission_title ?? ""}
                onChange={(e) => onUpdate({ mission_title: e.target.value })}
                className="rounded-xl"
              />
            </Field>
            <Field label={ar ? "النص" : "Body"}>
              <Textarea
                value={content.mission_body ?? ""}
                onChange={(e) => onUpdate({ mission_body: e.target.value })}
                rows={4}
                className="rounded-xl"
              />
            </Field>
          </Section>

          <Section title={ar ? "القيم" : "Values"}>
            <Field label={ar ? "عنوان القسم" : "Section title"}>
              <Input
                value={content.values_title ?? ""}
                onChange={(e) => onUpdate({ values_title: e.target.value })}
                className="rounded-xl"
              />
            </Field>
            <ItemList
              items={content.values ?? []}
              onChange={(items) => onUpdateList("values", items)}
              ar={ar}
              showIcon
            />
          </Section>
        </>
      )}

      {pageKey === "features" && (
        <Section title={ar ? "قائمة المميزات" : "Features list"}>
          <Field label={ar ? "عنوان القسم (اختياري)" : "Section title (optional)"}>
            <Input
              value={content.features_title ?? ""}
              onChange={(e) => onUpdate({ features_title: e.target.value })}
              className="rounded-xl"
            />
          </Field>
          <ItemList
            items={content.features ?? []}
            onChange={(items) => onUpdateList("features", items)}
            ar={ar}
            showIcon
          />
        </Section>
      )}

      {pageKey === "contact" && (
        <>
          <Section title={ar ? "إيميل التواصل" : "Contact email"}>
            <Field label={ar ? "الإيميل" : "Email"}>
              <Input
                type="email"
                value={content.contact_email ?? ""}
                onChange={(e) => onUpdate({ contact_email: e.target.value })}
                className="rounded-xl"
                placeholder="hello@example.com"
              />
            </Field>
          </Section>

          <Section title={ar ? "قنوات التواصل" : "Channels"}>
            <Field label={ar ? "عنوان القسم (اختياري)" : "Section title (optional)"}>
              <Input
                value={content.channels_title ?? ""}
                onChange={(e) => onUpdate({ channels_title: e.target.value })}
                className="rounded-xl"
              />
            </Field>
            <p className="text-xs text-muted-foreground">
              {ar
                ? "كل قناة: العنوان (Email/Facebook/Instagram)، النص الظاهر، والرابط."
                : "Each channel: title (Email/Facebook/Instagram), label and link."}
            </p>
            <ItemList
              items={content.channels ?? []}
              onChange={(items) => onUpdateList("channels", items)}
              ar={ar}
              showIcon
              descLabel={ar ? "النص الظاهر" : "Label shown"}
              iconLabel={ar ? "الرابط (URL)" : "Link (URL)"}
            />
          </Section>

          <Section title={ar ? "نموذج الإرسال" : "Form"}>
            <Field label={ar ? "عنوان النموذج" : "Form title"}>
              <Input
                value={content.form_title ?? ""}
                onChange={(e) => onUpdate({ form_title: e.target.value })}
                className="rounded-xl"
              />
            </Field>
            <Field label={ar ? "نص توضيحي" : "Helper text"}>
              <Input
                value={content.form_sub ?? ""}
                onChange={(e) => onUpdate({ form_sub: e.target.value })}
                className="rounded-xl"
              />
            </Field>
          </Section>
        </>
      )}

      {/* CTA — about & features only */}
      {(pageKey === "about" || pageKey === "features") && (
        <Section title={ar ? "بلوك الدعوة (CTA)" : "Call-to-action"}>
          <Field label={ar ? "عنوان" : "Title"}>
            <Input
              value={content.cta_title ?? ""}
              onChange={(e) => onUpdate({ cta_title: e.target.value })}
              className="rounded-xl"
            />
          </Field>
          <Field label={ar ? "وصف" : "Subtitle"}>
            <Textarea
              value={content.cta_sub ?? ""}
              onChange={(e) => onUpdate({ cta_sub: e.target.value })}
              rows={2}
              className="rounded-xl"
            />
          </Field>
          <CTAEditor
            label={ar ? "الزر الأساسي" : "Primary button"}
            cta={content.cta_primary ?? {}}
            onChange={(v) => onUpdate({ cta_primary: v })}
          />
          <CTAEditor
            label={ar ? "الزر الثانوي" : "Secondary button"}
            cta={content.cta_secondary ?? {}}
            onChange={(v) => onUpdate({ cta_secondary: v })}
          />
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
      <h3 className="text-sm font-extrabold text-foreground/80">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function CTAEditor({
  label,
  cta,
  onChange,
}: {
  label: string;
  cta: PageCTA;
  onChange: (v: PageCTA) => void;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-background/50 p-3">
      <p className="mb-2 text-xs font-bold">{label}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          placeholder="Label"
          value={cta.label ?? ""}
          onChange={(e) => onChange({ ...cta, label: e.target.value })}
          className="rounded-lg"
        />
        <Input
          placeholder="/auth or https://..."
          value={cta.href ?? ""}
          onChange={(e) => onChange({ ...cta, href: e.target.value })}
          className="rounded-lg"
        />
      </div>
    </div>
  );
}

function ItemList({
  items,
  onChange,
  ar,
  showIcon,
  descLabel,
  iconLabel,
}: {
  items: PageItem[];
  onChange: (items: PageItem[]) => void;
  ar: boolean;
  showIcon?: boolean;
  descLabel?: string;
  iconLabel?: string;
}) {
  const setAt = (i: number, patch: Partial<PageItem>) => {
    const next = items.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, { title: "", desc: "", icon: "" }]);

  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-border/40 bg-background/50 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground">#{i + 1}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove(i)}
              className="h-7 rounded-lg text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Input
            placeholder={ar ? "العنوان" : "Title"}
            value={it.title ?? ""}
            onChange={(e) => setAt(i, { title: e.target.value })}
            className="rounded-lg"
          />
          <Textarea
            placeholder={descLabel ?? (ar ? "الوصف" : "Description")}
            value={it.desc ?? ""}
            onChange={(e) => setAt(i, { desc: e.target.value })}
            rows={2}
            className="rounded-lg"
          />
          {showIcon && (
            <Input
              placeholder={iconLabel ?? (ar ? "أيقونة (إيموجي اختياري)" : "Icon (emoji optional)")}
              value={it.icon ?? ""}
              onChange={(e) => setAt(i, { icon: e.target.value })}
              className="rounded-lg"
            />
          )}
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="w-full rounded-xl"
      >
        <Plus className="me-1 h-4 w-4" />
        {ar ? "إضافة عنصر" : "Add item"}
      </Button>
    </div>
  );
}
