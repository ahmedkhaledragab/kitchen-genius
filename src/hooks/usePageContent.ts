import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/contexts/LanguageContext";

export type PageKey = "about" | "features" | "contact" | "home";

export type PageItem = { title?: string; desc?: string; icon?: string };
export type PageCTA = { label?: string; href?: string };

export type PageContent = {
  // generic fields used across pages
  hero_badge?: string;
  hero_title?: string;
  hero_sub?: string;

  // about
  mission_title?: string;
  mission_body?: string;
  values_title?: string;
  values?: PageItem[];

  // features
  features_title?: string;
  features?: PageItem[];

  // contact
  channels_title?: string;
  channels?: PageItem[]; // title, desc(=value), icon(=href)
  contact_email?: string;
  form_title?: string;
  form_sub?: string;

  // home page (الصفحة الرئيسية)
  home_ingredients_label?: string;
  home_ingredients_placeholder?: string;
  home_add_btn?: string;
  home_exclude_label?: string;
  home_exclude_placeholder?: string;
  home_filters_title?: string;
  home_filter_quick?: string;
  home_filter_budget?: string;
  home_filter_healthy?: string;
  home_filter_arab?: string;
  home_suggestions_title?: string;
  home_cook_btn?: string;
  home_generating?: string;
  home_results_title?: string;
  home_no_results?: string;
  home_no_ingredients?: string;

  // shared CTA block
  cta_title?: string;
  cta_sub?: string;
  cta_primary?: PageCTA;
  cta_secondary?: PageCTA;
};

const cache = new Map<string, { ar: PageContent; en: PageContent }>();
const listeners = new Map<string, Set<() => void>>();

function notify(key: string) {
  listeners.get(key)?.forEach((fn) => fn());
}

async function fetchPage(key: PageKey) {
  const { data } = await supabase
    .from("pages_content")
    .select("content_ar, content_en")
    .eq("page_key", key)
    .maybeSingle();
  const value = {
    ar: ((data?.content_ar ?? {}) as PageContent) || {},
    en: ((data?.content_en ?? {}) as PageContent) || {},
  };
  cache.set(key, value);
  notify(key);
  return value;
}

export function usePageContent(key: PageKey): {
  content: PageContent;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const { lang } = useLang();
  const [, setTick] = useState(0);
  const [loading, setLoading] = useState(!cache.has(key));

  useEffect(() => {
    const set = listeners.get(key) ?? new Set();
    const sub = () => setTick((t) => t + 1);
    set.add(sub);
    listeners.set(key, set);

    if (!cache.has(key)) {
      fetchPage(key).finally(() => setLoading(false));
    }
    return () => {
      set.delete(sub);
    };
  }, [key]);

  const both = cache.get(key) ?? { ar: {}, en: {} };
  const content = lang === "ar" ? both.ar : both.en;
  return {
    content,
    loading,
    refresh: async () => {
      await fetchPage(key);
    },
  };
}

export async function loadPageContentBoth(key: PageKey) {
  if (!cache.has(key)) await fetchPage(key);
  return cache.get(key)!;
}

export function invalidatePageContent(key: PageKey) {
  cache.delete(key);
}
