import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/robots[.]txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const origin = `${url.protocol}//${url.host}`;
        const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
Disallow: /profile
Disallow: /hooks/

Sitemap: ${origin}/sitemap.xml
`;
        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=86400",
          },
        });
      },
    },
  },
});
