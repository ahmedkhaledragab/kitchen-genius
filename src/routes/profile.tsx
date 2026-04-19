import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, LogOut, User as UserIcon, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { useFavorites } from "@/hooks/useFavorites";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RecipeCard } from "@/components/RecipeCard";
import { RecipeDetail } from "@/components/RecipeDetail";
import type { Recipe } from "@/lib/recipe";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "حسابي — من اللي عندك؟" },
      { name: "description", content: "صفحة بروفايل المستخدم ووصفاته المحفوظة." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const { items, isFavorite, toggle, refresh } = useFavorites();
  const [openRecipe, setOpenRecipe] = useState<Recipe | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, phone, avatar_url, bio")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setDisplayName(data?.display_name ?? "");
        setPhone(data?.phone ?? "");
        setAvatarUrl(data?.avatar_url ?? null);
        setBio((data as { bio?: string | null } | null)?.bio ?? "");
      });
  }, [user]);

  if (!user) return null;

  const savedRecipes: Recipe[] = items
    .map((it) => (it.recipe_snapshot as Recipe | null) ?? null)
    .filter((r): r is Recipe => !!r);

  const onAvatarPick = async (file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("الصورة كبيرة شوية يا حلوة (أقصى 5MB) 🌸");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", user.id);
      if (updErr) throw updErr;
      setAvatarUrl(url);
      toast.success(t.profile.saved);
    } catch (e) {
      console.error(e);
      toast.error(t.profile.saveError);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim() || null,
          phone: phone.trim() || null,
          bio: bio.trim() || null,
        })
        .eq("id", user.id);
      if (error) throw error;
      toast.success(t.profile.saved);
    } catch (e) {
      console.error(e);
      toast.error(t.profile.saveError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-6">
      <Card className="rounded-3xl border-border/60 bg-card p-6 shadow-card">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="relative grid h-16 w-16 place-items-center overflow-hidden rounded-2xl gradient-primary text-primary-foreground transition hover:opacity-90"
            aria-label={t.profile.changeAvatar}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <UserIcon className="h-7 w-7" />
            )}
            <span className="absolute bottom-0 end-0 grid h-5 w-5 place-items-center rounded-tl-lg bg-background text-foreground">
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onAvatarPick(f);
              e.target.value = "";
            }}
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-extrabold">{displayName || user.email}</h1>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => signOut()}
            className="rounded-xl"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{t.profile.logout}</span>
          </Button>
        </div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mt-3 w-full rounded-xl border border-dashed border-border text-xs"
        >
          <Link to="/u/$userId" params={{ userId: user.id }}>
            <ExternalLink className="me-1 h-3.5 w-3.5" />
            {t.profile.viewPublic}
          </Link>
        </Button>
      </Card>

      <Card className="mt-4 rounded-3xl border-border/60 bg-card p-6 shadow-card">
        <h2 className="mb-4 text-lg font-extrabold">{t.profile.personalInfo}</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold">{t.profile.displayName}</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
              className="mt-1 rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs font-semibold">{t.auth.email}</label>
            <Input value={user.email ?? ""} disabled className="mt-1 rounded-xl" dir="ltr" />
          </div>
          <div>
            <label className="text-xs font-semibold">{t.profile.phoneOptional}</label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={20}
              className="mt-1 rounded-xl"
              placeholder={t.profile.phonePlaceholder}
              dir="ltr"
            />
          </div>
          <div>
            <label className="text-xs font-semibold">{t.profile.bio}</label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={300}
              rows={3}
              className="mt-1 rounded-xl"
              placeholder={t.profile.bioPlaceholder}
            />
            <p className="mt-1 text-[10px] text-muted-foreground">{bio.length}/300</p>
          </div>
          <Button
            type="button"
            onClick={save}
            disabled={saving}
            className="h-11 w-full rounded-xl gradient-primary text-primary-foreground hover:opacity-95"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t.profile.saveChanges}
          </Button>
        </div>
      </Card>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-extrabold">{t.profile.mySaved}</h2>
        {savedRecipes.length === 0 ? (
          <Card className="rounded-3xl border-dashed border-border bg-muted/40 p-8 text-center">
            <p className="text-sm text-muted-foreground">{t.profile.empty}</p>
            <Button
              asChild
              className="mt-4 rounded-xl gradient-primary text-primary-foreground hover:opacity-95"
            >
              <Link to="/">{t.profile.goHome}</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {savedRecipes.map((r, i) => (
              <RecipeCard
                key={i}
                recipe={r}
                index={i}
                onOpen={() => setOpenRecipe(r)}
                onToggleFavorite={() => {
                  toggle(r);
                  setTimeout(refresh, 200);
                }}
                isFavorite={isFavorite(r)}
              />
            ))}
          </div>
        )}
      </section>

      <RecipeDetail
        recipe={openRecipe}
        onClose={() => setOpenRecipe(null)}
        onToggleFavorite={
          openRecipe
            ? () => {
                toggle(openRecipe);
                setTimeout(refresh, 200);
              }
            : undefined
        }
        isFavorite={openRecipe ? isFavorite(openRecipe) : false}
        canFavorite={true}
      />
    </div>
  );
}
