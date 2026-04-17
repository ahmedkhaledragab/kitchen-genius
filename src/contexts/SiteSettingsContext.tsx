import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/contexts/LanguageContext";

export interface SiteSettings {
  site_name_ar: string;
  site_name_en: string;
  tagline_ar: string | null;
  tagline_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  keywords_ar: string | null;
  keywords_en: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  og_image_url: string | null;
  twitter_handle: string | null;
  primary_color: string | null;
}

const DEFAULTS: SiteSettings = {
  site_name_ar: "من اللي عندك؟",
  site_name_en: "What's in your kitchen?",
  tagline_ar: "اكتب اللي عندك في المطبخ، وإحنا نطلعلك وصفات تقدر تعملها فوراً 🍳",
  tagline_en: "Type what you have, get cookable recipes in seconds 🍳",
  description_ar: null,
  description_en: null,
  keywords_ar: null,
  keywords_en: null,
  logo_url: null,
  favicon_url: null,
  og_image_url: null,
  twitter_handle: null,
  primary_color: null,
};

interface SiteSettingsContextValue {
  settings: SiteSettings;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue | undefined>(undefined);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const { lang } = useLang();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("site_settings")
      .select(
        "site_name_ar, site_name_en, tagline_ar, tagline_en, description_ar, description_en, keywords_ar, keywords_en, logo_url, favicon_url, og_image_url, twitter_handle, primary_color"
      )
      .limit(1)
      .maybeSingle();
    if (data) {
      setSettings({
        site_name_ar: data.site_name_ar || DEFAULTS.site_name_ar,
        site_name_en: data.site_name_en || DEFAULTS.site_name_en,
        tagline_ar: data.tagline_ar,
        tagline_en: data.tagline_en,
        description_ar: data.description_ar,
        description_en: data.description_en,
        keywords_ar: data.keywords_ar,
        keywords_en: data.keywords_en,
        logo_url: data.logo_url,
        favicon_url: data.favicon_url,
        og_image_url: data.og_image_url,
        twitter_handle: data.twitter_handle,
        primary_color: (data as { primary_color?: string | null }).primary_color ?? null,
      });
    }
    setLoading(false);
  }, []);

  // Apply dynamic primary color to CSS variables
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (!settings.primary_color) {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--primary-glow");
      root.style.removeProperty("--primary-foreground");
      root.style.removeProperty("--ring");
      return;
    }
    const oklch = hexToOklch(settings.primary_color);
    if (!oklch) return;
    const { l, c, h } = oklch;
    root.style.setProperty("--primary", `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`);
    root.style.setProperty(
      "--primary-glow",
      `oklch(${Math.min(l + 0.1, 0.95).toFixed(3)} ${(c * 0.85).toFixed(3)} ${h.toFixed(1)})`
    );
    // Foreground: white if dark color, dark if light color
    root.style.setProperty(
      "--primary-foreground",
      l < 0.6 ? "oklch(0.99 0.01 95)" : "oklch(0.22 0.03 150)"
    );
    root.style.setProperty("--ring", `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`);
  }, [settings.primary_color]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Update favicon dynamically when settings change
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!settings.favicon_url) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = settings.favicon_url;
  }, [settings.favicon_url]);

  // Keep <title>, <meta description>, OG/Twitter, and JSON-LD up to date
  useEffect(() => {
    if (typeof document === "undefined") return;
    const name = lang === "ar" ? settings.site_name_ar : settings.site_name_en;
    const desc =
      (lang === "ar" ? settings.description_ar : settings.description_en) ||
      (lang === "ar" ? settings.tagline_ar : settings.tagline_en) ||
      "";
    const keywords = lang === "ar" ? settings.keywords_ar : settings.keywords_en;

    if (name) document.title = name;

    upsertMeta("name", "description", desc);
    if (keywords) upsertMeta("name", "keywords", keywords);
    upsertMeta("property", "og:site_name", name);
    upsertMeta("property", "og:title", name);
    upsertMeta("property", "og:description", desc);
    upsertMeta("property", "og:type", "website");
    if (settings.og_image_url) {
      upsertMeta("property", "og:image", settings.og_image_url);
      upsertMeta("name", "twitter:image", settings.og_image_url);
      upsertMeta("name", "twitter:card", "summary_large_image");
    } else {
      upsertMeta("name", "twitter:card", "summary");
    }
    upsertMeta("name", "twitter:title", name);
    upsertMeta("name", "twitter:description", desc);
    if (settings.twitter_handle) {
      const handle = settings.twitter_handle.startsWith("@")
        ? settings.twitter_handle
        : `@${settings.twitter_handle}`;
      upsertMeta("name", "twitter:site", handle);
      upsertMeta("name", "twitter:creator", handle);
    }

    // JSON-LD: Website + Organization
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          name,
          url: origin || undefined,
          description: desc,
          inLanguage: lang === "ar" ? "ar" : "en",
          potentialAction: {
            "@type": "SearchAction",
            target: `${origin}/?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        },
        {
          "@type": "Organization",
          name,
          url: origin || undefined,
          logo: settings.logo_url || undefined,
        },
      ],
    };
    upsertJsonLd("site-jsonld", jsonLd);
  }, [settings, lang]);

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, refresh }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

function upsertMeta(attr: "name" | "property", key: string, value: string | null | undefined) {
  if (typeof document === "undefined") return;
  if (!value) return;
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

function upsertJsonLd(id: string, data: unknown) {
  if (typeof document === "undefined") return;
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.id = id;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function useSiteSettings() {
  const ctx = useContext(SiteSettingsContext);
  if (!ctx) throw new Error("useSiteSettings must be used inside SiteSettingsProvider");
  return ctx;
}
