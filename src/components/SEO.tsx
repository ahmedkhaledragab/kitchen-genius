import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";

const SITE_URL = "https://minellyandak.com";
const DEFAULT_OG = `${SITE_URL}/og-image.jpg`;

interface SEOProps {
  title: string;
  description: string;
  image?: string;
  type?: "website" | "article";
  /** Optional override; defaults to current path under SITE_URL. */
  canonical?: string;
}

/**
 * Lightweight per-route SEO updater for the SPA.
 * Updates <title>, meta description, canonical, OG and Twitter tags
 * whenever a route renders. Safe to mount once per page.
 */
export function SEO({ title, description, image, type = "website", canonical }: SEOProps) {
  const location = useLocation();

  useEffect(() => {
    if (typeof document === "undefined") return;

    const url = canonical ?? `${SITE_URL}${location.pathname}`;
    const img = image ?? DEFAULT_OG;

    document.title = title;

    setMeta("name", "description", description);
    setLink("canonical", url);

    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", img);
    setMeta("property", "og:type", type);

    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", img);
  }, [title, description, image, type, canonical, location.pathname]);

  return null;
}

function setMeta(attr: "name" | "property", key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}
