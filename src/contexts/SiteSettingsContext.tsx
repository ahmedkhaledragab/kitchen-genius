import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SiteSettings {
  site_name_ar: string;
  site_name_en: string;
  tagline_ar: string | null;
  tagline_en: string | null;
  logo_url: string | null;
  favicon_url: string | null;
}

const DEFAULTS: SiteSettings = {
  site_name_ar: "من اللي عندك؟",
  site_name_en: "What's in your kitchen?",
  tagline_ar: "اكتب اللي عندك في المطبخ، وإحنا نطلعلك وصفات تقدر تعملها فوراً 🍳",
  tagline_en: "Type what you have, get cookable recipes in seconds 🍳",
  logo_url: null,
  favicon_url: null,
};

interface SiteSettingsContextValue {
  settings: SiteSettings;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue | undefined>(undefined);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("site_name_ar, site_name_en, tagline_ar, tagline_en, logo_url, favicon_url")
      .limit(1)
      .maybeSingle();
    if (data) {
      setSettings({
        site_name_ar: data.site_name_ar || DEFAULTS.site_name_ar,
        site_name_en: data.site_name_en || DEFAULTS.site_name_en,
        tagline_ar: data.tagline_ar,
        tagline_en: data.tagline_en,
        logo_url: data.logo_url,
        favicon_url: data.favicon_url,
      });
    }
    setLoading(false);
  }, []);

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

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, refresh }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const ctx = useContext(SiteSettingsContext);
  if (!ctx) throw new Error("useSiteSettings must be used inside SiteSettingsProvider");
  return ctx;
}
