import { Link } from "@tanstack/react-router";
import {
  Heart,
  Shield,
  Globe2,
  LogOut,
  Menu,
  Home,
  Info,
  Sparkles,
  MessageCircle,
  ChefHat,
  Tags,
  Users,
  Star,
  Mail,
  Inbox,
  Settings as SettingsIcon,
  LayoutDashboard,
  Utensils,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { Button } from "@/components/ui/button";
import { NotificationsBell } from "@/components/NotificationsBell";
import { InstallPWAButton } from "@/components/InstallPWAButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import defaultLogo from "@/assets/logo.png";

export function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const { t, lang, toggleLang } = useLang();
  const { settings } = useSiteSettings();
  const [open, setOpen] = useState(false);

  const logo = settings.logo_url || defaultLogo;
  const siteName = lang === "ar" ? settings.site_name_ar : settings.site_name_en;

  const handleLogoError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (e.currentTarget.src !== defaultLogo) {
      e.currentTarget.src = defaultLogo;
    }
  };

  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-2 px-3 sm:px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2 group">
          <img
            src={logo}
            alt={siteName}
            className="h-14 w-14 shrink-0 object-contain transition-transform group-hover:scale-105 sm:h-16 sm:w-16"
          />
          <span className="hidden truncate text-base font-extrabold tracking-tight md:inline">
            {siteName}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          <Button asChild variant="ghost" size="sm" className="rounded-xl">
            <Link to="/">{t.nav.home}</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="rounded-xl">
            <Link to="/kitchens">{lang === "ar" ? "المطابخ" : "Kitchens"}</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="rounded-xl">
            <Link to="/features">{t.nav.features}</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="rounded-xl">
            <Link to="/community">{t.nav.community}</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="rounded-xl">
            <Link to="/top-creators">{t.nav.topCreators}</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="rounded-xl">
            <Link to="/about">{t.nav.about}</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="rounded-xl">
            <Link to="/contact">{t.nav.contact}</Link>
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

          {user && <NotificationsBell />}
          <InstallPWAButton className="hidden lg:inline-flex" />

          <ThemeToggle />

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
          {user && <NotificationsBell />}
          <ThemeToggle className="rounded-xl px-2" />
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
            <SheetContent
              side={lang === "ar" ? "right" : "left"}
              className="flex w-72 flex-col p-0"
            >
              <SheetHeader className="border-b border-border/60 p-6 pb-4">
                <SheetTitle className="flex items-center gap-2">
                  <img src={logo} alt={siteName} className="h-9 w-9 object-contain" />
                  <span className="truncate">{siteName}</span>
                </SheetTitle>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="flex flex-col gap-1">
                <Button asChild variant="ghost" className="justify-start rounded-xl" onClick={close}>
                  <Link to="/">
                    <Home className="me-2 h-4 w-4" />
                    {t.nav.home}
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="justify-start rounded-xl" onClick={close}>
                  <Link to="/kitchens">
                    <Utensils className="me-2 h-4 w-4" />
                    {lang === "ar" ? "المطابخ" : "Kitchens"}
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="justify-start rounded-xl" onClick={close}>
                  <Link to="/features">
                    <Sparkles className="me-2 h-4 w-4" />
                    {t.nav.features}
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="justify-start rounded-xl" onClick={close}>
                  <Link to="/community">
                    <Users className="me-2 h-4 w-4" />
                    {t.nav.community}
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="justify-start rounded-xl" onClick={close}>
                  <Link to="/top-creators">
                    <Star className="me-2 h-4 w-4" />
                    {t.nav.topCreators}
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="justify-start rounded-xl" onClick={close}>
                  <Link to="/about">
                    <Info className="me-2 h-4 w-4" />
                    {t.nav.about}
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="justify-start rounded-xl" onClick={close}>
                  <Link to="/contact">
                    <MessageCircle className="me-2 h-4 w-4" />
                    {t.nav.contact}
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
                    <div className="my-2 h-px bg-border" />
                    <p className="px-3 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {lang === "ar" ? "لوحة الأدمن" : "Admin"}
                    </p>
                    <Button asChild variant="ghost" className="justify-start rounded-xl" onClick={close}>
                      <Link to="/admin">
                        <LayoutDashboard className="me-2 h-4 w-4" />
                        {lang === "ar" ? "لوحة التحكم" : "Dashboard"}
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" className="justify-start rounded-xl" onClick={close}>
                      <Link to="/admin/recipes">
                        <ChefHat className="me-2 h-4 w-4" />
                        {lang === "ar" ? "الوصفات" : "Recipes"}
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" className="justify-start rounded-xl" onClick={close}>
                      <Link to="/admin/ingredients">
                        <Sparkles className="me-2 h-4 w-4" />
                        {lang === "ar" ? "المكونات" : "Ingredients"}
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" className="justify-start rounded-xl" onClick={close}>
                      <Link to="/admin/categories">
                        <Tags className="me-2 h-4 w-4" />
                        {lang === "ar" ? "الأصناف" : "Categories"}
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" className="justify-start rounded-xl" onClick={close}>
                      <Link to="/admin/users">
                        <Users className="me-2 h-4 w-4" />
                        {lang === "ar" ? "المستخدمين" : "Users"}
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" className="justify-start rounded-xl" onClick={close}>
                      <Link to="/admin/content/about">
                        <Info className="me-2 h-4 w-4" />
                        {lang === "ar" ? "صفحة من نحن" : "About page"}
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" className="justify-start rounded-xl" onClick={close}>
                      <Link to="/admin/content/features">
                        <Star className="me-2 h-4 w-4" />
                        {lang === "ar" ? "صفحة المميزات" : "Features page"}
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" className="justify-start rounded-xl" onClick={close}>
                      <Link to="/admin/content/contact">
                        <Mail className="me-2 h-4 w-4" />
                        {lang === "ar" ? "صفحة تواصل معنا" : "Contact page"}
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" className="justify-start rounded-xl" onClick={close}>
                      <Link to="/admin/community">
                        <Users className="me-2 h-4 w-4" />
                        {lang === "ar" ? "إدارة المجتمع" : "Community"}
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" className="justify-start rounded-xl" onClick={close}>
                      <Link to="/admin/messages">
                        <Inbox className="me-2 h-4 w-4" />
                        {lang === "ar" ? "الرسائل" : "Messages"}
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" className="justify-start rounded-xl" onClick={close}>
                      <Link to="/admin/settings">
                        <SettingsIcon className="me-2 h-4 w-4" />
                        {lang === "ar" ? "إعدادات الموقع" : "Site settings"}
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
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
