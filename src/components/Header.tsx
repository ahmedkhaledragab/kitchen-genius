import { Link } from "@tanstack/react-router";
import { ChefHat, Heart, User as UserIcon, Shield, Globe2, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

export function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const { t, lang, toggleLang } = useLang();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="grid h-9 w-9 place-items-center rounded-2xl gradient-primary text-primary-foreground shadow-soft transition-transform group-hover:scale-105">
            <ChefHat className="h-5 w-5" />
          </span>
          <span className="text-base font-extrabold tracking-tight">{t.appName}</span>
        </Link>

        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm" className="rounded-xl">
            <Link to="/">{t.nav.home}</Link>
          </Button>
          {user && (
            <Button asChild variant="ghost" size="sm" className="rounded-xl">
              <Link to="/profile">
                <Heart className="h-4 w-4" />
                <span className="hidden sm:inline">{t.nav.favorites}</span>
              </Link>
            </Button>
          )}
          {isAdmin && (
            <Button asChild variant="ghost" size="sm" className="rounded-xl">
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
            className="rounded-xl"
            onClick={toggleLang}
            aria-label={t.common.language}
          >
            <Globe2 className="h-4 w-4" />
            <span className="text-xs font-semibold">{lang === "ar" ? "EN" : "ع"}</span>
          </Button>

          {user ? (
            <>
              <Button asChild variant="ghost" size="sm" className="rounded-xl">
                <Link to="/profile">
                  <UserIcon className="h-4 w-4" />
                </Link>
              </Button>
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
            </>
          ) : (
            <Button asChild size="sm" className="rounded-xl gradient-primary text-primary-foreground hover:opacity-95">
              <Link to="/auth">{t.nav.login}</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
