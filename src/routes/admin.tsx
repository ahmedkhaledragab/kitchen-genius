import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  ChefHat,
  Settings,
  Menu,
  X,
  Sparkles,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { user, isAdmin, loading } = useAuth();
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  // Auto-close mobile sidebar on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  if (loading) return null;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 pt-16 text-center">
        <Card className="rounded-3xl p-8">
          <p className="text-sm text-muted-foreground">{t.admin.noAccess}</p>
        </Card>
      </div>
    );
  }

  const items = [
    {
      to: "/admin" as const,
      icon: LayoutDashboard,
      label: lang === "ar" ? "لوحة التحكم" : "Dashboard",
      exact: true,
    },
    {
      to: "/admin/recipes" as const,
      icon: ChefHat,
      label: lang === "ar" ? "الوصفات" : "Recipes",
    },
    {
      to: "/admin/ingredients" as const,
      icon: Sparkles,
      label: lang === "ar" ? "المكونات" : "Ingredients",
    },
    {
      to: "/admin/users" as const,
      icon: Users,
      label: lang === "ar" ? "المستخدمين" : "Users",
    },
    {
      to: "/admin/settings" as const,
      icon: Settings,
      label: lang === "ar" ? "إعدادات الموقع" : "Site settings",
    },
  ];

  return (
    <div className="mx-auto flex max-w-7xl gap-4 px-3 pb-20 pt-4 sm:px-4 sm:pt-6">
      {/* Mobile toggle */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="fixed bottom-5 z-40 rounded-full shadow-card md:hidden"
        style={{ [lang === "ar" ? "right" : "left"]: "1rem" } as React.CSSProperties}
        onClick={() => setOpen((o) => !o)}
        aria-label="menu"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        <span className="ms-1.5 text-xs font-bold">
          {lang === "ar" ? "القائمة" : "Menu"}
        </span>
      </Button>

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 z-30 w-64 shrink-0 overflow-y-auto border-border/60 bg-background/95 px-3 py-6 backdrop-blur transition-transform md:sticky md:top-24 md:z-0 md:h-[calc(100vh-7rem)] md:translate-x-0 md:rounded-3xl md:border md:bg-card md:p-4 md:shadow-soft",
          lang === "ar"
            ? `right-0 border-s ${open ? "translate-x-0" : "translate-x-full"}`
            : `left-0 border-e ${open ? "translate-x-0" : "-translate-x-full"}`,
        ].join(" ")}
      >
        <div className="mb-4 hidden items-center gap-2 px-2 md:flex">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
            <LayoutDashboard className="h-4 w-4" />
          </span>
          <p className="text-sm font-extrabold">
            {lang === "ar" ? "لوحة الأدمن" : "Admin"}
          </p>
        </div>

        <nav className="flex flex-col gap-1">
          {items.map((it) => {
            const isActive = it.exact
              ? location.pathname === it.to
              : location.pathname.startsWith(it.to);
            return (
              <Link
                key={it.to}
                to={it.to}
                className={[
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/80 hover:bg-muted",
                ].join(" ")}
              >
                <it.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{it.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Backdrop on mobile */}
      {open && (
        <button
          type="button"
          aria-label="close menu"
          className="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
