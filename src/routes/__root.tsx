import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";

import appCss from "../styles.css?url";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SiteSettingsProvider, useSiteSettings } from "@/contexts/SiteSettingsContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Toaster } from "@/components/ui/sonner";
import { registerServiceWorker, unregisterServiceWorkers } from "@/lib/pwa";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-extrabold gradient-text">404</h1>
        <h2 className="mt-4 text-xl font-bold">الصفحة غير موجودة</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          الصفحة دي مش موجودة أو اتنقلت.
        </p>
        <div className="mt-6">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
          >
            الرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "من اللي عندك؟ — وصفات من مكوناتك" },
      {
        name: "description",
        content:
          "اكتب اللي عندك في المطبخ ونقترحلك وصفات تقدر تعملها فوراً بالذكاء الاصطناعي.",
      },
      { name: "author", content: "Manar Elsheikh" },
      { name: "theme-color", content: "#16a34a" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { property: "og:title", content: "من اللي عندك؟ — وصفات من مكوناتك" },
      {
        property: "og:description",
        content: "أدخل المكونات اللي عندك واحصل على وصفات فورية بالذكاء الاصطناعي.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ThemeProvider>
          <SiteSettingsProvider>
            <PWAManager />
            <div className="flex min-h-screen flex-col bg-background">
              <Header />
              <main className="flex-1">
                <Outlet />
              </main>
              <Footer />
            </div>
            <Toaster richColors closeButton position="top-center" />
          </SiteSettingsProvider>
        </ThemeProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

function PWAManager() {
  const { settings } = useSiteSettings();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (settings.pwa_enabled) {
      registerServiceWorker();
    } else {
      unregisterServiceWorkers();
    }
  }, [settings.pwa_enabled]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const themeColor = settings.pwa_theme_color || "#16a34a";
    let meta = document.querySelector<HTMLMetaElement>("meta[name='theme-color']");
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = themeColor;
  }, [settings.pwa_theme_color]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!settings.pwa_apple_touch_icon_url) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "apple-touch-icon";
      document.head.appendChild(link);
    }
    link.href = settings.pwa_apple_touch_icon_url;
  }, [settings.pwa_apple_touch_icon_url]);

  return null;
}
