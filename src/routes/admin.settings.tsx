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
} from "lucide-react";
import { toast } from "sonner";

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
    prefix: "logo" | "favicon" | "og"
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

      {/* Sitemap info */}
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
