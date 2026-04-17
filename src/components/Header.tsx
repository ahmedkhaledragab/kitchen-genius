import { Link } from "@tanstack/react-router";
import { Heart, User as UserIcon, Shield, Globe2, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

export function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const { t, lang, toggleLang } = useLang();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2 group">
          <img
            src={logo}
            alt={t.appName}
            className="h-10 w-10 shrink-0 object-contain transition-transform group-hover:scale-105 sm:h-11 sm:w-11"
          />
          <span className="hidden truncate text-base font-extrabold tracking-tight md:inline">
            {t.appName}
          </span>
        </Link>

        <nav className="flex items-center gap-0.5 sm:gap-1">
          <Button asChild variant="ghost" size="sm" className="rounded-xl px-2 sm:px-3">
            <Link to="/">{t.nav.home}</Link>
          </Button>
          {user && (
            <Button asChild variant="ghost" size="sm" className="rounded-xl px-2 sm:px-3" aria-label={t.nav.favorites}>
              <Link to="/profile">
                <Heart className="h-4 w-4" />
                <span className="hidden sm:inline">{t.nav.favorites}</span>
              </Link>
            </Button>
          )}
          {isAdmin && (
            <Button asChild variant="ghost" size="sm" className="rounded-xl px-2 sm:px-3" aria-label={t.nav.admin}>
              <Link to="/admin">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">{t.nav.admin}</span>
              </Link>
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-xl px-2 sm:px-3"
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
              className="rounded-xl px-2 sm:px-3"
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
      </div>
    </header>
  );
}
