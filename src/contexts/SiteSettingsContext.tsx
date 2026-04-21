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
  facebook_url: string | null;
  instagram_url: string | null;
  whatsapp_url: string | null;
  contact_email: string | null;
  tiktok_url: string | null;
  telegram_url: string | null;
  twitter_url: string | null;
  // PWA
  pwa_enabled: boolean;
  pwa_short_name_ar: string | null;
  pwa_short_name_en: string | null;
  pwa_theme_color: string | null;
  pwa_background_color: string | null;
  pwa_icon_192_url: string | null;
  pwa_icon_512_url: string | null;
  pwa_apple_touch_icon_url: string | null;
  pwa_display: string;
  // Recipe generation controls (admin-tunable)
  recipes_target_count: number;
  recipes_daily_limit: number;
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
  facebook_url: null,
  instagram_url: null,
  whatsapp_url: null,
  contact_email: null,
  tiktok_url: null,
  telegram_url: null,
  twitter_url: null,
  pwa_enabled: false,
  pwa_short_name_ar: null,
  pwa_short_name_en: null,
  pwa_theme_color: "#16a34a",
  pwa_background_color: "#ffffff",
  pwa_icon_192_url: null,
  pwa_icon_512_url: null,
  pwa_apple_touch_icon_url: null,
  pwa_display: "standalone",
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
        "site_name_ar, site_name_en, tagline_ar, tagline_en, description_ar, description_en, keywords_ar, keywords_en, logo_url, favicon_url, og_image_url, twitter_handle, primary_color, facebook_url, instagram_url, whatsapp_url, contact_email, tiktok_url, telegram_url, twitter_url, pwa_enabled, pwa_short_name_ar, pwa_short_name_en, pwa_theme_color, pwa_background_color, pwa_icon_192_url, pwa_icon_512_url, pwa_apple_touch_icon_url, pwa_display"
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
        facebook_url: (data as { facebook_url?: string | null }).facebook_url ?? null,
        instagram_url: (data as { instagram_url?: string | null }).instagram_url ?? null,
        whatsapp_url: (data as { whatsapp_url?: string | null }).whatsapp_url ?? null,
        contact_email: (data as { contact_email?: string | null }).contact_email ?? null,
        tiktok_url: (data as { tiktok_url?: string | null }).tiktok_url ?? null,
        telegram_url: (data as { telegram_url?: string | null }).telegram_url ?? null,
        twitter_url: (data as { twitter_url?: string | null }).twitter_url ?? null,
        pwa_enabled: (data as { pwa_enabled?: boolean }).pwa_enabled ?? false,
        pwa_short_name_ar: (data as { pwa_short_name_ar?: string | null }).pwa_short_name_ar ?? null,
        pwa_short_name_en: (data as { pwa_short_name_en?: string | null }).pwa_short_name_en ?? null,
        pwa_theme_color: (data as { pwa_theme_color?: string | null }).pwa_theme_color ?? "#16a34a",
        pwa_background_color: (data as { pwa_background_color?: string | null }).pwa_background_color ?? "#ffffff",
        pwa_icon_192_url: (data as { pwa_icon_192_url?: string | null }).pwa_icon_192_url ?? null,
        pwa_icon_512_url: (data as { pwa_icon_512_url?: string | null }).pwa_icon_512_url ?? null,
        pwa_apple_touch_icon_url: (data as { pwa_apple_touch_icon_url?: string | null }).pwa_apple_touch_icon_url ?? null,
        pwa_display: (data as { pwa_display?: string }).pwa_display ?? "standalone",
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

// Convert #rrggbb to OKLCH components { l, c, h }.
// Uses sRGB → linear → OKLab → OKLCH (Björn Ottosson's formula).
function hexToOklch(hex: string): { l: number; c: number; h: number } | null {
  const m = /^#?([a-f\d]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;

  const toLinear = (v: number) =>
    v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);

  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const C = Math.sqrt(a * a + bb * bb);
  let H = (Math.atan2(bb, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { l: L, c: C, h: H };
}
