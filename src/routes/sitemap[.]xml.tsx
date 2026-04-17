import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const origin = `${url.protocol}//${url.host}`;

        // Static routes (only public, indexable pages)
        const staticPaths: Array<{ path: string; changefreq: string; priority: string }> = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/auth", changefreq: "monthly", priority: "0.5" },
        ];

        // Dynamic: published recipes
        let recipes: Array<{ id: string; updated_at: string }> = [];
        try {
          const { data } = await supabaseAdmin
            .from("recipes")
            .select("id, updated_at")
            .eq("is_published", true)
            .order("updated_at", { ascending: false })
            .limit(5000);
          recipes = data ?? [];
        } catch (e) {
          console.error("sitemap: failed to load recipes", e);
        }

        const urls: string[] = [];
        for (const r of staticPaths) {
          urls.push(
            `<url><loc>${escapeXml(origin + r.path)}</loc><changefreq>${r.changefreq}</changefreq><priority>${r.priority}</priority></url>`
          );
        }
        for (const rec of recipes) {
          urls.push(
            `<url><loc>${escapeXml(`${origin}/?recipe=${rec.id}`)}</loc><lastmod>${new Date(rec.updated_at).toISOString()}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`
          );
        }

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

        return new Response(xml, {
          status: 200,
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
          },
        });
      },
    },
  },
});
