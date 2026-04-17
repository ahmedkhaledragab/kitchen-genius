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

  const uploadFile = async (file: File, prefix: "logo" | "favicon"): Promise<string | null> => {
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

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .update({
        site_name_ar: nameAr.trim() || settings.site_name_ar,
        site_name_en: nameEn.trim() || settings.site_name_en,
        tagline_ar: taglineAr.trim() || null,
        tagline_en: taglineEn.trim() || null,
        logo_url: logoUrl,
        favicon_url: faviconUrl,
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
