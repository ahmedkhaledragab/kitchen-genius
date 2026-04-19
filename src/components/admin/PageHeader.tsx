import { Link, useLocation } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";
import { type ReactNode } from "react";

import { useLang } from "@/contexts/LanguageContext";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  /** Override breadcrumb segments after /admin. Otherwise auto-derived from URL. */
  breadcrumbs?: { label: string; to?: string }[];
}

const SEGMENT_LABELS: Record<string, { ar: string; en: string }> = {
  admin: { ar: "الإدارة", en: "Admin" },
  recipes: { ar: "الوصفات", en: "Recipes" },
  ingredients: { ar: "المكونات", en: "Ingredients" },
  categories: { ar: "الأصناف", en: "Categories" },
  users: { ar: "المستخدمين", en: "Users" },
  community: { ar: "المجتمع", en: "Community" },
  messages: { ar: "الرسائل", en: "Messages" },
  settings: { ar: "إعدادات الموقع", en: "Site settings" },
  content: { ar: "المحتوى", en: "Content" },
  home: { ar: "الرئيسية", en: "Home" },
  about: { ar: "من نحن", en: "About" },
  features: { ar: "المميزات", en: "Features" },
  contact: { ar: "تواصل معنا", en: "Contact" },
};

/**
 * Unified page header for every admin sub-page.
 * Auto-builds breadcrumbs from the URL when not provided.
 */
export function PageHeader({
  title,
  description,
  icon,
  actions,
  breadcrumbs,
}: PageHeaderProps) {
  const { lang } = useLang();
  const location = useLocation();

  const crumbs =
    breadcrumbs ??
    (() => {
      const segments = location.pathname.split("/").filter(Boolean);
      let path = "";
      return segments.map((seg, i) => {
        path += `/${seg}`;
        const meta = SEGMENT_LABELS[seg];
        const label = meta ? (lang === "ar" ? meta.ar : meta.en) : seg;
        return {
          label,
          to: i === segments.length - 1 ? undefined : path,
        };
      });
    })();

  return (
    <div className="mb-6">
      <nav
        aria-label="breadcrumb"
        className="mb-3 flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
      >
        <Link to="/" className="inline-flex items-center gap-1 hover:text-foreground">
          <Home className="h-3 w-3" />
        </Link>
        {crumbs.map((c, i) => (
          <span key={i} className="inline-flex items-center gap-1">
            <ChevronRight className="h-3 w-3 rtl:rotate-180" />
            {c.to ? (
              <Link to={c.to} className="hover:text-foreground">
                {c.label}
              </Link>
            ) : (
              <span className="font-semibold text-foreground">{c.label}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            {icon ? (
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                {icon}
              </span>
            ) : null}
            <h1 className="text-xl font-black sm:text-2xl">
              <span className="gradient-text">{title}</span>
            </h1>
          </div>
          {description ? (
            <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
