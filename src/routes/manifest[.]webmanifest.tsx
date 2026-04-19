import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/manifest.webmanifest")({
  server: {
    handlers: {
      GET: async () => {
        const { data } = await supabaseAdmin
          .from("site_settings")
          .select(
            "site_name_ar, site_name_en, pwa_enabled, pwa_short_name_ar, pwa_short_name_en, pwa_theme_color, pwa_background_color, pwa_icon_192_url, pwa_icon_512_url, pwa_display, logo_url"
          )
          .limit(1)
          .maybeSingle();

        const enabled = data?.pwa_enabled ?? false;
        const name = data?.site_name_ar || data?.site_name_en || "App";
        const shortName =
          data?.pwa_short_name_ar ||
          data?.pwa_short_name_en ||
          name.slice(0, 12);
        const themeColor = data?.pwa_theme_color || "#16a34a";
        const backgroundColor = data?.pwa_background_color || "#ffffff";
        const display = data?.pwa_display || "standalone";

        const icons: Array<{
          src: string;
          sizes: string;
          type: string;
          purpose?: string;
        }> = [];

        if (data?.pwa_icon_192_url) {
          icons.push({
            src: data.pwa_icon_192_url,
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          });
        }
        if (data?.pwa_icon_512_url) {
          icons.push({
            src: data.pwa_icon_512_url,
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          });
        }
        // Fallback to logo if no icons configured
        if (icons.length === 0 && data?.logo_url) {
          icons.push({
            src: data.logo_url,
            sizes: "512x512",
            type: "image/png",
          });
        }

        const manifest = {
          name,
          short_name: shortName,
          description: name,
          start_url: "/",
          scope: "/",
          display: enabled ? display : "browser",
          orientation: "portrait",
          theme_color: themeColor,
          background_color: backgroundColor,
          lang: "ar",
          dir: "rtl",
          icons,
        };

        return new Response(JSON.stringify(manifest, null, 2), {
          status: 200,
          headers: {
            "Content-Type": "application/manifest+json; charset=utf-8",
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
