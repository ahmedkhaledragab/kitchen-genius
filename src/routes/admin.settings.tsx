import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import {
  ArrowLeft,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Upload,
  Search,
  ExternalLink,
  Share2,
  Mail,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "إعدادات الموقع — لوحة التحكم" }] }),
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const { user, isAdmin, loading } = useAuth();
  const { t, lang } = useLang();
  const { settings, refresh } = useSiteSettings();
  const navigate = useNavigate();

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [taglineAr, setTaglineAr] = useState("");
  const [taglineEn, setTaglineEn] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);

  // SEO state
  const [descriptionAr, setDescriptionAr] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [keywordsAr, setKeywordsAr] = useState("");
  const [keywordsEn, setKeywordsEn] = useState("");
  const [ogImageUrl, setOgImageUrl] = useState<string | null>(null);
  const [twitterHandle, setTwitterHandle] = useState("");
  const [primaryColor, setPrimaryColor] = useState<string>("#22c55e");

  // Social links
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [telegramUrl, setTelegramUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");

  // Recipe generation controls
  const [recipesTargetCount, setRecipesTargetCount] = useState<number>(3);
  const [recipesDailyLimit, setRecipesDailyLimit] = useState<number>(4);

  // PWA state
  const [pwaEnabled, setPwaEnabled] = useState(false);
  const [pwaShortNameAr, setPwaShortNameAr] = useState("");
  const [pwaShortNameEn, setPwaShortNameEn] = useState("");
  const [pwaThemeColor, setPwaThemeColor] = useState("#16a34a");
  const [pwaBgColor, setPwaBgColor] = useState("#ffffff");
  const [pwaIcon192, setPwaIcon192] = useState<string | null>(null);
  const [pwaIcon512, setPwaIcon512] = useState<string | null>(null);
  const [pwaAppleIcon, setPwaAppleIcon] = useState<string | null>(null);
  const [uploadingPwa192, setUploadingPwa192] = useState(false);
  const [uploadingPwa512, setUploadingPwa512] = useState(false);
  const [uploadingPwaApple, setUploadingPwaApple] = useState(false);
  const pwa192InputRef = useRef<HTMLInputElement>(null);
  const pwa512InputRef = useRef<HTMLInputElement>(null);
  const pwaAppleInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFav, setUploadingFav] = useState(false);
  const [uploadingOg, setUploadingOg] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const favInputRef = useRef<HTMLInputElement>(null);
  const ogInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    setNameAr(settings.site_name_ar);
    setNameEn(settings.site_name_en);
    setTaglineAr(settings.tagline_ar ?? "");
    setTaglineEn(settings.tagline_en ?? "");
    setLogoUrl(settings.logo_url);
    setFaviconUrl(settings.favicon_url);
    setDescriptionAr(settings.description_ar ?? "");
    setDescriptionEn(settings.description_en ?? "");
    setKeywordsAr(settings.keywords_ar ?? "");
    setKeywordsEn(settings.keywords_en ?? "");
    setOgImageUrl(settings.og_image_url);
    setTwitterHandle(settings.twitter_handle ?? "");
    setPrimaryColor(settings.primary_color ?? "#22c55e");
    setFacebookUrl(settings.facebook_url ?? "");
    setInstagramUrl(settings.instagram_url ?? "");
    setWhatsappUrl(settings.whatsapp_url ?? "");
    setContactEmail(settings.contact_email ?? "");
    setTiktokUrl(settings.tiktok_url ?? "");
    setTelegramUrl(settings.telegram_url ?? "");
    setTwitterUrl(settings.twitter_url ?? "");
    setPwaEnabled(settings.pwa_enabled ?? false);
    setPwaShortNameAr(settings.pwa_short_name_ar ?? "");
    setPwaShortNameEn(settings.pwa_short_name_en ?? "");
    setPwaThemeColor(settings.pwa_theme_color ?? "#16a34a");
    setPwaBgColor(settings.pwa_background_color ?? "#ffffff");
    setPwaIcon192(settings.pwa_icon_192_url);
    setPwaIcon512(settings.pwa_icon_512_url);
    setPwaAppleIcon(settings.pwa_apple_touch_icon_url);
    setRecipesTargetCount(settings.recipes_target_count ?? 3);
    setRecipesDailyLimit(settings.recipes_daily_limit ?? 4);
  }, [settings]);

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

  const uploadFile = async (
    file: File,
    prefix: "logo" | "favicon" | "og" | "pwa192" | "pwa512" | "pwaapple"
  ): Promise<string | null> => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${prefix}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("branding").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });
    if (error) {
      toast.error(error.message);
      return null;
    }
    const { data } = supabase.storage.from("branding").getPublicUrl(path);
    return data.publicUrl;
  };

  const onPickLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const url = await uploadFile(file, "logo");
    setUploadingLogo(false);
    if (url) setLogoUrl(url);
    e.target.value = "";
  };

  const onPickFavicon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFav(true);
    const url = await uploadFile(file, "favicon");
    setUploadingFav(false);
    if (url) setFaviconUrl(url);
    e.target.value = "";
  };

  const onPickOg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingOg(true);
    const url = await uploadFile(file, "og");
    setUploadingOg(false);
    if (url) setOgImageUrl(url);
    e.target.value = "";
  };

  const onPickPwa = async (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: "192" | "512" | "apple"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const setUploading =
      kind === "192" ? setUploadingPwa192 : kind === "512" ? setUploadingPwa512 : setUploadingPwaApple;
    const setUrl =
      kind === "192" ? setPwaIcon192 : kind === "512" ? setPwaIcon512 : setPwaAppleIcon;
    const prefix = kind === "192" ? "pwa192" : kind === "512" ? "pwa512" : "pwaapple";
    setUploading(true);
    const url = await uploadFile(file, prefix);
    setUploading(false);
    if (url) setUrl(url);
    e.target.value = "";
  };

  const save = async () => {
    setSaving(true);
    const cleanedTwitter = twitterHandle.trim().replace(/^@/, "") || null;
    const { error } = await supabase
      .from("site_settings")
      .update({
        site_name_ar: nameAr.trim() || settings.site_name_ar,
        site_name_en: nameEn.trim() || settings.site_name_en,
        tagline_ar: taglineAr.trim() || null,
        tagline_en: taglineEn.trim() || null,
        description_ar: descriptionAr.trim() || null,
        description_en: descriptionEn.trim() || null,
        keywords_ar: keywordsAr.trim() || null,
        keywords_en: keywordsEn.trim() || null,
        og_image_url: ogImageUrl,
        twitter_handle: cleanedTwitter,
        primary_color: primaryColor || null,
        logo_url: logoUrl,
        favicon_url: faviconUrl,
        facebook_url: facebookUrl.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        whatsapp_url: whatsappUrl.trim() || null,
        contact_email: contactEmail.trim() || null,
        tiktok_url: tiktokUrl.trim() || null,
        telegram_url: telegramUrl.trim() || null,
        twitter_url: twitterUrl.trim() || null,
        pwa_enabled: pwaEnabled,
        pwa_short_name_ar: pwaShortNameAr.trim() || null,
        pwa_short_name_en: pwaShortNameEn.trim() || null,
        pwa_theme_color: pwaThemeColor || null,
        pwa_background_color: pwaBgColor || null,
        pwa_icon_192_url: pwaIcon192,
        pwa_icon_512_url: pwaIcon512,
        pwa_apple_touch_icon_url: pwaAppleIcon,
        recipes_target_count: Math.min(Math.max(recipesTargetCount || 3, 1), 10),
        recipes_daily_limit: Math.min(Math.max(recipesDailyLimit || 4, 1), 100),
        updated_by: user?.id ?? null,
      })
      .eq("singleton", true);
    setSaving(false);
    if (error) {
      toast.error(t.admin.siteSettings.saveError);
      return;
    }
    toast.success(t.admin.siteSettings.saved);
    await refresh();
  };

  return (
    <div className="mx-auto max-w-3xl px-3 pb-20 pt-4 sm:px-4 sm:pt-6">
      <Button asChild variant="ghost" size="sm" className="mb-3 rounded-xl">
        <Link to="/admin">
          <ArrowLeft className="me-1.5 h-4 w-4" />
          {t.admin.siteSettings.backToAdmin}
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-black sm:text-3xl">
          <span className="gradient-text">{t.admin.siteSettings.title}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.admin.siteSettings.subtitle}</p>
      </div>

      {/* Logo */}
      <Card className="mt-5 rounded-3xl border-border/60 p-5">
        <Label className="text-sm font-bold">{t.admin.siteSettings.logo}</Label>
        <p className="mt-1 text-xs text-muted-foreground">{t.admin.siteSettings.logoHint}</p>

        <div className="mt-4 flex items-center gap-4">
          <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl border border-dashed border-border/60 bg-muted/30">
            {logoUrl ? (
              <img src={logoUrl} alt="logo" className="h-full w-full object-contain p-2" />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/svg+xml,image/webp"
              className="hidden"
              onChange={onPickLogo}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
            >
              {uploadingLogo ? (
                <>
                  <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
                  {t.admin.siteSettings.uploading}
                </>
              ) : (
                <>
                  <Upload className="me-1.5 h-4 w-4" />
                  {t.admin.siteSettings.upload}
                </>
              )}
            </Button>
            {logoUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-xl text-destructive hover:bg-destructive/10"
                onClick={() => setLogoUrl(null)}
              >
                <Trash2 className="me-1.5 h-4 w-4" />
                {t.admin.siteSettings.remove}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Favicon */}
      <Card className="mt-4 rounded-3xl border-border/60 p-5">
        <Label className="text-sm font-bold">{t.admin.siteSettings.favicon}</Label>
        <p className="mt-1 text-xs text-muted-foreground">{t.admin.siteSettings.faviconHint}</p>

        <div className="mt-4 flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-border/60 bg-muted/30">
            {faviconUrl ? (
              <img src={faviconUrl} alt="favicon" className="h-full w-full object-contain p-1.5" />
            ) : (
              <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <input
              ref={favInputRef}
              type="file"
              accept="image/png,image/x-icon,image/svg+xml,image/webp"
              className="hidden"
              onChange={onPickFavicon}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => favInputRef.current?.click()}
              disabled={uploadingFav}
            >
              {uploadingFav ? (
                <>
                  <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
                  {t.admin.siteSettings.uploading}
                </>
              ) : (
                <>
                  <Upload className="me-1.5 h-4 w-4" />
                  {t.admin.siteSettings.upload}
                </>
              )}
            </Button>
            {faviconUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-xl text-destructive hover:bg-destructive/10"
                onClick={() => setFaviconUrl(null)}
              >
                <Trash2 className="me-1.5 h-4 w-4" />
                {t.admin.siteSettings.remove}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Branding — primary color */}
      <Card className="mt-4 rounded-3xl border-border/60 p-5">
        <Label className="text-sm font-bold">{t.admin.siteSettings.brandingSection}</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          {t.admin.siteSettings.brandingSubtitle}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-12 w-12 cursor-pointer rounded-xl border border-border/60 bg-transparent"
              aria-label={t.admin.siteSettings.primaryColor}
            />
            <Input
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#22c55e"
              className="w-32 rounded-xl font-mono uppercase"
              dir="ltr"
              maxLength={7}
            />
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-10 w-10 rounded-full border border-border/60"
              style={{ backgroundColor: primaryColor }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-xl"
              onClick={() => setPrimaryColor("#22c55e")}
            >
              {t.admin.siteSettings.resetColor}
            </Button>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t.admin.siteSettings.primaryColorHint}
        </p>
      </Card>

      {/* Names + taglines */}
      <Card className="mt-4 rounded-3xl border-border/60 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="nameAr" className="text-sm font-bold">
              {t.admin.siteSettings.nameAr}
            </Label>
            <Input
              id="nameAr"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              className="mt-1.5 rounded-xl"
              dir="rtl"
            />
          </div>
          <div>
            <Label htmlFor="nameEn" className="text-sm font-bold">
              {t.admin.siteSettings.nameEn}
            </Label>
            <Input
              id="nameEn"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              className="mt-1.5 rounded-xl"
              dir="ltr"
            />
          </div>
          <div>
            <Label htmlFor="taglineAr" className="text-sm font-bold">
              {t.admin.siteSettings.taglineAr}
            </Label>
            <Textarea
              id="taglineAr"
              value={taglineAr}
              onChange={(e) => setTaglineAr(e.target.value)}
              className="mt-1.5 min-h-20 rounded-xl"
              dir="rtl"
            />
          </div>
          <div>
            <Label htmlFor="taglineEn" className="text-sm font-bold">
              {t.admin.siteSettings.taglineEn}
            </Label>
            <Textarea
              id="taglineEn"
              value={taglineEn}
              onChange={(e) => setTaglineEn(e.target.value)}
              className="mt-1.5 min-h-20 rounded-xl"
              dir="ltr"
            />
          </div>
        </div>
      </Card>

      {/* SEO section */}
      <Card className="mt-4 rounded-3xl border-border/60 p-5">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Search className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-bold">{t.admin.siteSettings.seoSection}</p>
            <p className="text-xs text-muted-foreground">{t.admin.siteSettings.seoSubtitle}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="descAr" className="text-sm font-bold">
              {t.admin.siteSettings.descriptionAr}
            </Label>
            <Textarea
              id="descAr"
              value={descriptionAr}
              onChange={(e) => setDescriptionAr(e.target.value)}
              maxLength={200}
              className="mt-1.5 min-h-24 rounded-xl"
              dir="rtl"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t.admin.siteSettings.descriptionHint} · {descriptionAr.length}/160
            </p>
          </div>
          <div>
            <Label htmlFor="descEn" className="text-sm font-bold">
              {t.admin.siteSettings.descriptionEn}
            </Label>
            <Textarea
              id="descEn"
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              maxLength={200}
              className="mt-1.5 min-h-24 rounded-xl"
              dir="ltr"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t.admin.siteSettings.descriptionHint} · {descriptionEn.length}/160
            </p>
          </div>

          <div>
            <Label htmlFor="kwAr" className="text-sm font-bold">
              {t.admin.siteSettings.keywordsAr}
            </Label>
            <Textarea
              id="kwAr"
              value={keywordsAr}
              onChange={(e) => setKeywordsAr(e.target.value)}
              className="mt-1.5 min-h-20 rounded-xl"
              dir="rtl"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t.admin.siteSettings.keywordsHint}
            </p>
          </div>
          <div>
            <Label htmlFor="kwEn" className="text-sm font-bold">
              {t.admin.siteSettings.keywordsEn}
            </Label>
            <Textarea
              id="kwEn"
              value={keywordsEn}
              onChange={(e) => setKeywordsEn(e.target.value)}
              className="mt-1.5 min-h-20 rounded-xl"
              dir="ltr"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t.admin.siteSettings.keywordsHint}
            </p>
          </div>
        </div>

        {/* OG Image */}
        <div className="mt-5">
          <Label className="text-sm font-bold">{t.admin.siteSettings.ogImage}</Label>
          <p className="mt-1 text-xs text-muted-foreground">{t.admin.siteSettings.ogImageHint}</p>
          <div className="mt-3 flex items-center gap-4">
            <div className="grid h-20 w-36 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-border/60 bg-muted/30">
              {ogImageUrl ? (
                <img src={ogImageUrl} alt="og" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={ogInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={onPickOg}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => ogInputRef.current?.click()}
                disabled={uploadingOg}
              >
                {uploadingOg ? (
                  <>
                    <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
                    {t.admin.siteSettings.uploading}
                  </>
                ) : (
                  <>
                    <Upload className="me-1.5 h-4 w-4" />
                    {t.admin.siteSettings.upload}
                  </>
                )}
              </Button>
              {ogImageUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-xl text-destructive hover:bg-destructive/10"
                  onClick={() => setOgImageUrl(null)}
                >
                  <Trash2 className="me-1.5 h-4 w-4" />
                  {t.admin.siteSettings.remove}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Twitter handle */}
        <div className="mt-5">
          <Label htmlFor="tw" className="text-sm font-bold">
            {t.admin.siteSettings.twitterHandle}
          </Label>
          <Input
            id="tw"
            value={twitterHandle}
            onChange={(e) => setTwitterHandle(e.target.value)}
            placeholder="yourhandle"
            className="mt-1.5 max-w-xs rounded-xl"
            dir="ltr"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t.admin.siteSettings.twitterHandleHint}
          </p>
        </div>
      </Card>

      {/* Contact email */}
      <Card className="mt-4 rounded-3xl border-border/60 p-5">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Mail className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-bold">
              {lang === "ar" ? "البريد الإلكتروني للتواصل" : "Contact email"}
            </p>
            <p className="text-xs text-muted-foreground">
              {lang === "ar"
                ? "هيظهر في صفحة /contact كأيقونة إيميل قابلة للضغط."
                : "Shown on the /contact page as a clickable email channel."}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <Label htmlFor="contact_email" className="text-sm font-bold">
            {lang === "ar" ? "الإيميل" : "Email"}
          </Label>
          <Input
            id="contact_email"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="hello@example.com"
            className="mt-1.5 max-w-md rounded-xl"
            dir="ltr"
          />
        </div>
      </Card>

      {/* Social media links */}
      <Card className="mt-4 rounded-3xl border-border/60 p-5">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Share2 className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-bold">
              {lang === "ar" ? "روابط السوشيال ميديا" : "Social media links"}
            </p>
            <p className="text-xs text-muted-foreground">
              {lang === "ar"
                ? "هتظهر كأيقونات في الفوتر. سيبي اللي مش عايزاه فاضي وهيختفي."
                : "Shown as icons in the footer. Leave any field empty to hide its icon."}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4">
          <div>
            <Label htmlFor="fb" className="text-sm font-bold">
              Facebook
            </Label>
            <Input
              id="fb"
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
              placeholder="https://www.facebook.com/yourpage"
              className="mt-1.5 rounded-xl"
              dir="ltr"
            />
          </div>
          <div>
            <Label htmlFor="ig" className="text-sm font-bold">
              Instagram
            </Label>
            <Input
              id="ig"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://www.instagram.com/yourhandle"
              className="mt-1.5 rounded-xl"
              dir="ltr"
            />
          </div>
          <div>
            <Label htmlFor="wa" className="text-sm font-bold">
              WhatsApp
            </Label>
            <Input
              id="wa"
              value={whatsappUrl}
              onChange={(e) => setWhatsappUrl(e.target.value)}
              placeholder={
                lang === "ar"
                  ? "رقم الواتساب أو رابط مجتمع (https://chat.whatsapp.com/...)"
                  : "Phone number or community link (https://chat.whatsapp.com/...)"
              }
              className="mt-1.5 rounded-xl"
              dir="ltr"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {lang === "ar"
                ? "اكتبي رقم بصيغة دولية (مثال: +201234567890) أو رابط مجتمع كامل. سيبيها فاضية لو مش عايزة الأيقونة."
                : "Enter a phone number in international format (e.g. +201234567890) or a full community link. Leave empty to hide the icon."}
            </p>
          </div>
          <div>
            <Label htmlFor="tk" className="text-sm font-bold">
              TikTok
            </Label>
            <Input
              id="tk"
              value={tiktokUrl}
              onChange={(e) => setTiktokUrl(e.target.value)}
              placeholder="https://www.tiktok.com/@yourhandle"
              className="mt-1.5 rounded-xl"
              dir="ltr"
            />
          </div>
          <div>
            <Label htmlFor="tg" className="text-sm font-bold">
              Telegram
            </Label>
            <Input
              id="tg"
              value={telegramUrl}
              onChange={(e) => setTelegramUrl(e.target.value)}
              placeholder="https://t.me/yourhandle"
              className="mt-1.5 rounded-xl"
              dir="ltr"
            />
          </div>
          <div>
            <Label htmlFor="tw_url" className="text-sm font-bold">
              Twitter / X
            </Label>
            <Input
              id="tw_url"
              value={twitterUrl}
              onChange={(e) => setTwitterUrl(e.target.value)}
              placeholder="https://x.com/yourhandle"
              className="mt-1.5 rounded-xl"
              dir="ltr"
            />
          </div>
        </div>
      </Card>

      {/* PWA — Progressive Web App */}
      <Card className="mt-4 rounded-3xl border-border/60 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Smartphone className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold">
                {lang === "ar" ? "تطبيق PWA" : "PWA app"}
              </p>
              <p className="text-xs text-muted-foreground">
                {lang === "ar"
                  ? "خلّي الموقع يتثبّت كتطبيق على شاشة الموبايل والكمبيوتر."
                  : "Let users install the site as an app on mobile and desktop."}
              </p>
            </div>
          </div>
          <Switch
            checked={pwaEnabled}
            onCheckedChange={setPwaEnabled}
            aria-label="enable pwa"
          />
        </div>

        {pwaEnabled && (
          <>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="pwaShortAr" className="text-sm font-bold">
                  {lang === "ar" ? "الاسم القصير (عربي)" : "Short name (AR)"}
                </Label>
                <Input
                  id="pwaShortAr"
                  value={pwaShortNameAr}
                  onChange={(e) => setPwaShortNameAr(e.target.value)}
                  placeholder={settings.site_name_ar.slice(0, 12)}
                  maxLength={12}
                  className="mt-1.5 rounded-xl"
                  dir="rtl"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {lang === "ar" ? "أقصى 12 حرف. هيظهر تحت الأيقونة." : "Max 12 chars. Shows under the icon."}
                </p>
              </div>
              <div>
                <Label htmlFor="pwaShortEn" className="text-sm font-bold">
                  {lang === "ar" ? "الاسم القصير (إنجليزي)" : "Short name (EN)"}
                </Label>
                <Input
                  id="pwaShortEn"
                  value={pwaShortNameEn}
                  onChange={(e) => setPwaShortNameEn(e.target.value)}
                  placeholder={settings.site_name_en.slice(0, 12)}
                  maxLength={12}
                  className="mt-1.5 rounded-xl"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-sm font-bold">
                  {lang === "ar" ? "لون الثيم" : "Theme color"}
                </Label>
                <div className="mt-1.5 flex items-center gap-3">
                  <input
                    type="color"
                    value={pwaThemeColor}
                    onChange={(e) => setPwaThemeColor(e.target.value)}
                    className="h-12 w-12 cursor-pointer rounded-xl border border-border/60 bg-transparent"
                  />
                  <Input
                    value={pwaThemeColor}
                    onChange={(e) => setPwaThemeColor(e.target.value)}
                    className="w-32 rounded-xl font-mono uppercase"
                    dir="ltr"
                    maxLength={7}
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {lang === "ar" ? "لون شريط العنوان في التطبيق." : "Address bar color when installed."}
                </p>
              </div>
              <div>
                <Label className="text-sm font-bold">
                  {lang === "ar" ? "لون خلفية الفتح" : "Splash background"}
                </Label>
                <div className="mt-1.5 flex items-center gap-3">
                  <input
                    type="color"
                    value={pwaBgColor}
                    onChange={(e) => setPwaBgColor(e.target.value)}
                    className="h-12 w-12 cursor-pointer rounded-xl border border-border/60 bg-transparent"
                  />
                  <Input
                    value={pwaBgColor}
                    onChange={(e) => setPwaBgColor(e.target.value)}
                    className="w-32 rounded-xl font-mono uppercase"
                    dir="ltr"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>

            {/* Icons */}
            <div className="mt-5 space-y-4">
              <p className="text-sm font-bold">
                {lang === "ar" ? "أيقونات التطبيق" : "App icons"}
              </p>
              <p className="text-xs text-muted-foreground">
                {lang === "ar"
                  ? "ارفعي صور PNG مربّعة. الأبعاد المثالية: 192×192 و 512×512."
                  : "Upload square PNG images. Ideal sizes: 192×192 and 512×512."}
              </p>

              {/* 192 */}
              <PwaIconRow
                label="192 × 192"
                hint={lang === "ar" ? "الأيقونة الأساسية للأندرويد." : "Primary Android icon."}
                url={pwaIcon192}
                uploading={uploadingPwa192}
                onPick={(e) => onPickPwa(e, "192")}
                onRemove={() => setPwaIcon192(null)}
                inputRef={pwa192InputRef}
                tUploading={t.admin.siteSettings.uploading}
                tUpload={t.admin.siteSettings.upload}
                tRemove={t.admin.siteSettings.remove}
              />
              {/* 512 */}
              <PwaIconRow
                label="512 × 512"
                hint={lang === "ar" ? "تستخدم في شاشة الفتح والمتجر." : "Used on splash and stores."}
                url={pwaIcon512}
                uploading={uploadingPwa512}
                onPick={(e) => onPickPwa(e, "512")}
                onRemove={() => setPwaIcon512(null)}
                inputRef={pwa512InputRef}
                tUploading={t.admin.siteSettings.uploading}
                tUpload={t.admin.siteSettings.upload}
                tRemove={t.admin.siteSettings.remove}
              />
              {/* Apple */}
              <PwaIconRow
                label={lang === "ar" ? "Apple Touch (180×180)" : "Apple Touch (180×180)"}
                hint={lang === "ar" ? "أيقونة iOS — مهمة جداً للآيفون." : "iOS icon — important for iPhone."}
                url={pwaAppleIcon}
                uploading={uploadingPwaApple}
                onPick={(e) => onPickPwa(e, "apple")}
                onRemove={() => setPwaAppleIcon(null)}
                inputRef={pwaAppleInputRef}
                tUploading={t.admin.siteSettings.uploading}
                tUpload={t.admin.siteSettings.upload}
                tRemove={t.admin.siteSettings.remove}
              />
            </div>

            {/* Preview */}
            <div className="mt-5 rounded-2xl border border-border/60 bg-muted/30 p-4">
              <p className="mb-3 text-xs font-bold text-muted-foreground">
                {lang === "ar" ? "معاينة" : "Preview"}
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl shadow-soft"
                  style={{ backgroundColor: pwaBgColor }}
                >
                  {pwaIcon192 || pwaIcon512 ? (
                    <img
                      src={pwaIcon192 || pwaIcon512 || ""}
                      alt="app icon"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Smartphone className="h-6 w-6" style={{ color: pwaThemeColor }} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold">
                    {(lang === "ar" ? pwaShortNameAr : pwaShortNameEn) ||
                      (lang === "ar" ? settings.site_name_ar : settings.site_name_en)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {lang === "ar" ? settings.site_name_ar : settings.site_name_en}
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-4 text-[11px] text-muted-foreground">
              {lang === "ar"
                ? "ملاحظة: تثبيت التطبيق يشتغل بس على الموقع المنشور (مش في المعاينة)."
                : "Note: Install only works on the published site (not in preview)."}
            </p>
          </>
        )}
      </Card>

      <Card className="mt-4 rounded-3xl border-border/60 bg-muted/30 p-5">
        <p className="text-sm font-bold">{t.admin.siteSettings.sitemapInfo}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t.admin.siteSettings.sitemapHint}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-xl">
            <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="me-1.5 h-3.5 w-3.5" />
              {t.admin.siteSettings.viewSitemap}
            </a>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-xl">
            <a href="/robots.txt" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="me-1.5 h-3.5 w-3.5" />
              {t.admin.siteSettings.viewRobots}
            </a>
          </Button>
        </div>
      </Card>

      <div className="mt-5 flex justify-end">
        <Button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-xl gradient-primary px-6 text-primary-foreground hover:opacity-95"
        >
          {saving ? (
            <>
              <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
              {lang === "ar" ? "بنحفظ..." : "Saving..."}
            </>
          ) : (
            t.admin.siteSettings.save
          )}
        </Button>
      </div>
    </div>
  );
}

function PwaIconRow({
  label,
  hint,
  url,
  uploading,
  onPick,
  onRemove,
  inputRef,
  tUploading,
  tUpload,
  tRemove,
}: {
  label: string;
  hint: string;
  url: string | null;
  uploading: boolean;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  tUploading: string;
  tUpload: string;
  tRemove: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border/60 p-3">
      <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-border/60 bg-muted/30">
        {url ? (
          <img src={url} alt={label} className="h-full w-full object-contain" />
        ) : (
          <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{label}</p>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/webp"
          className="hidden"
          onChange={onPick}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
              {tUploading}
            </>
          ) : (
            <>
              <Upload className="me-1.5 h-4 w-4" />
              {tUpload}
            </>
          )}
        </Button>
        {url && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-xl text-destructive hover:bg-destructive/10"
            onClick={onRemove}
          >
            <Trash2 className="me-1.5 h-4 w-4" />
            {tRemove}
          </Button>
        )}
      </div>
    </div>
  );
}

