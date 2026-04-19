import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, ChefHat, ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MentionTextarea } from "./MentionTextarea";
import { extractHashtags } from "@/lib/community";

const postSchema = z.object({
  title: z.string().trim().max(150).optional(),
  content: z.string().trim().min(1).max(2000),
});

interface ComposerProps {
  isBanned?: boolean;
  onPosted?: () => void;
}

export function Composer({ isBanned, onPosted }: ComposerProps) {
  const { user } = useAuth();
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<"post" | "recipe">("post");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user?.id]);

  function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Max 5MB");
      return;
    }
    setImageFile(f);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(URL.createObjectURL(f));
    setOpen(true);
  }

  function clearImage() {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  }

  function reset() {
    setTitle("");
    setContent("");
    setPostType("post");
    clearImage();
    setOpen(false);
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile || !user) return null;
    const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("community-posts").upload(path, imageFile, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      toast.error(error.message);
      return null;
    }
    const { data } = supabase.storage.from("community-posts").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      toast.error(t.community.loginPrompt);
      return;
    }
    if (isBanned) {
      toast.error(t.community.banned);
      return;
    }
    const parsed = postSchema.safeParse({ title: title.trim() || undefined, content: content.trim() });
    if (!parsed.success) {
      toast.error(t.community.contentRequired);
      return;
    }
    setSubmitting(true);
    let imageUrl: string | null = null;
    if (imageFile) {
      imageUrl = await uploadImage();
      if (!imageUrl) {
        setSubmitting(false);
        return;
      }
    }
    const { data: insertedRow, error } = await supabase
      .from("community_posts")
      .insert({
        user_id: user.id,
        post_type: postType,
        title: parsed.data.title || null,
        content: parsed.data.content,
        image_url: imageUrl,
      })
      .select("id")
      .single();
    if (error || !insertedRow) {
      setSubmitting(false);
      if (error?.message.includes("is_community_banned")) toast.error(t.community.banned);
      else toast.error(error?.message || "Error");
      return;
    }

    // Insert hashtags
    const tags = extractHashtags(parsed.data.content);
    if (tags.length > 0) {
      await supabase
        .from("community_post_hashtags")
        .insert(tags.map((tag) => ({ post_id: insertedRow.id, tag })));
    }

    setSubmitting(false);
    toast.success(t.community.published);
    reset();
    onPosted?.();
  }

  if (!user) {
    return (
      <Card className="rounded-3xl p-4 text-center">
        <p className="mb-3 text-sm text-muted-foreground">{t.community.loginPrompt}</p>
        <Button asChild size="sm" className="rounded-xl gradient-primary text-primary-foreground">
          <Link to="/auth">{t.auth.login}</Link>
        </Button>
      </Card>
    );
  }

  if (isBanned) {
    return (
      <Card className="rounded-3xl border-destructive/40 bg-destructive/5 p-4 text-center text-sm text-destructive">
        {t.community.banned}
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl p-3 shadow-soft sm:p-4">
      {!open ? (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
            <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
              {(profile?.display_name || "?").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex-1 rounded-full bg-muted px-4 py-2.5 text-start text-sm text-muted-foreground transition hover:bg-muted/70"
          >
            {t.community.composePlaceholder}
          </button>
          <label className="cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={pickImage} />
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full text-emerald-600 hover:bg-muted">
              <ImagePlus className="h-5 w-5" />
            </span>
          </label>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                {(profile?.display_name || "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-bold">{profile?.display_name || t.community.anonymous}</p>
              <div className="mt-1 flex gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant={postType === "post" ? "default" : "outline"}
                  className="h-6 rounded-lg px-2 text-[10px]"
                  onClick={() => setPostType("post")}
                >
                  <Sparkles className="me-1 h-3 w-3" />
                  {t.community.typePost}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={postType === "recipe" ? "default" : "outline"}
                  className="h-6 rounded-lg px-2 text-[10px]"
                  onClick={() => setPostType("recipe")}
                >
                  <ChefHat className="me-1 h-3 w-3" />
                  {t.community.typeRecipe}
                </Button>
              </div>
            </div>
          </div>

          {postType === "recipe" && (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.community.composeTitle}
              maxLength={150}
              className="rounded-xl"
            />
          )}

          <MentionTextarea
            value={content}
            onChange={setContent}
            placeholder={t.community.composePlaceholder}
            rows={4}
            maxLength={2000}
            autoFocus
          />

          <p className="text-[11px] text-muted-foreground">{t.community.formattingHint}</p>

          {imagePreview && (
            <div className="relative">
              <img src={imagePreview} alt="preview" className="max-h-72 w-full rounded-xl object-cover" />
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="absolute end-2 top-2 h-7 w-7 rounded-full p-0"
                onClick={clearImage}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={pickImage} />
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-input px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted">
                <ImagePlus className="h-3.5 w-3.5" />
                {t.community.addImage}
              </span>
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="rounded-xl"
                onClick={reset}
                disabled={submitting}
              >
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                size="sm"
                className="rounded-xl gradient-primary px-5 text-primary-foreground"
                disabled={submitting || !content.trim()}
              >
                {submitting ? (
                  <>
                    <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />
                    {t.community.publishing}
                  </>
                ) : (
                  t.community.publish
                )}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Card>
  );
}
