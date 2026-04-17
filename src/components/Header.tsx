import { Link } from "@tanstack/react-router";
import { Heart, Shield, Globe2, LogOut, Menu, Home } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import logo from "@/assets/logo.png";

export function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const { t, lang, toggleLang } = useLang();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-2 px-3 sm:px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2 group">
          <img
            src={logo}
            alt={t.appName}
            className="h-14 w-14 shrink-0 object-contain transition-transform group-hover:scale-105 sm:h-16 sm:w-16"
          />
          <span className="hidden truncate text-base font-extrabold tracking-tight md:inline">
            {t.appName}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          <Button asChild variant="ghost" size="sm" className="rounded-xl">
            <Link to="/">{t.nav.home}</Link>
          </Button>
          {user && (
            <Button asChild variant="ghost" size="sm" className="rounded-xl">
              <Link to="/profile">
                <Heart className="h-4 w-4" />
                {t.nav.favorites}
              </Link>
            </Button>
          )}
          {isAdmin && (
            <Button asChild variant="ghost" size="sm" className="rounded-xl">
              <Link to="/admin">
                <Shield className="h-4 w-4" />
                {t.nav.admin}
              </Link>
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-xl"
            onClick={toggleLang}
            aria-label={t.common.language}
          >
            <Globe2 className="h-4 w-4" />
            <span className="text-xs font-semibold">{lang === "ar" ? "EN" : "ع"}</span>
          </Button>

          {user ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-xl"
              onClick={() => signOut()}
              aria-label={t.nav.logout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          ) : (
            <Button asChild size="sm" className="rounded-xl gradient-primary px-3 text-primary-foreground hover:opacity-95">
              <Link to="/auth">{t.nav.login}</Link>
            </Button>
          )}
        </nav>

        {/* Mobile nav */}
        <div className="flex items-center gap-1 md:hidden">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-xl px-2"
            onClick={toggleLang}
            aria-label={t.common.language}
          >
            <Globe2 className="h-4 w-4" />
            <span className="text-xs font-semibold">{lang === "ar" ? "EN" : "ع"}</span>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-xl px-2" aria-label="menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side={lang === "ar" ? "right" : "left"} className="w-72">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <img src={logo} alt={t.appName} className="h-9 w-9 object-contain" />
                  <span className="truncate">{t.appName}</span>
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 flex flex-col gap-1">
                <Button asChild variant="ghost" className="justify-start rounded-xl" onClick={close}>
                  <Link to="/">
                    <Home className="me-2 h-4 w-4" />
                    {t.nav.home}
                  </Link>
                </Button>
                {user && (
                  <Button asChild variant="ghost" className="justify-start rounded-xl" onClick={close}>
                    <Link to="/profile">
                      <Heart className="me-2 h-4 w-4" />
                      {t.nav.favorites}
                    </Link>
                  </Button>
                )}
                {isAdmin && (
                  <>
                    <Button asChild variant="ghost" className="justify-start rounded-xl" onClick={close}>
                      <Link to="/admin">
                        <Shield className="me-2 h-4 w-4" />
                        {t.nav.admin}
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" className="justify-start rounded-xl" onClick={close}>
                      <Link to="/admin/users">
                        <Shield className="me-2 h-4 w-4" />
                        {lang === "ar" ? "إدارة المستخدمين" : "Users"}
                      </Link>
                    </Button>
                  </>
                )}

                <div className="my-3 h-px bg-border" />

                {user ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="justify-start rounded-xl text-destructive"
                    onClick={() => {
                      close();
                      signOut();
                    }}
                  >
                    <LogOut className="me-2 h-4 w-4" />
                    {t.nav.logout}
                  </Button>
                ) : (
                  <Button asChild className="rounded-xl gradient-primary text-primary-foreground" onClick={close}>
                    <Link to="/auth">{t.nav.login}</Link>
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
