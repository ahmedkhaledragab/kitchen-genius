import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Heart, MessageCircle, Bookmark, Flag, Trash2, ImagePlus, X, Send, Loader2, ChefHat, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "مجتمع المطبخ — شاركي وصفاتك" },
      { name: "description", content: "انضمي لمجتمع المطبخ، شاركي وصفاتك واتفاعلي مع غيرك من محبي الطبخ." },
      { property: "og:title", content: "مجتمع المطبخ" },
      { property: "og:description", content: "شاركي وصفاتك وتفاعلي مع المجتمع." },
    ],
  }),
  component: CommunityPage,
});

interface PostAuthor {
  display_name: string | null;
  avatar_url: string | null;
}

interface CommunityPost {
  id: string;
  user_id: string;
  post_type: "post" | "recipe";
  title: string | null;
  content: string;
  image_url: string | null;
  recipe_data: unknown;
  is_pinned: boolean;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author?: PostAuthor;
  liked_by_me?: boolean;
  saved_by_me?: boolean;
}

interface CommunityComment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: PostAuthor;
}

const postSchema = z.object({
  title: z.string().trim().max(150).optional(),
  content: z.string().trim().min(1).max(2000),
});

function timeAgo(iso: string, lang: "ar" | "en", t: ReturnType<typeof useLang>["t"]): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return t.community.now;
  if (diff < 3600) return `${Math.floor(diff / 60)} ${t.community.minutes} ${t.community.ago}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ${t.community.hours} ${t.community.ago}`;
  return `${Math.floor(diff / 86400)} ${t.community.days} ${t.community.ago}`;
}

function CommunityPage() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBanned, setIsBanned] = useState(false);

  // composer state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<"post" | "recipe">("post");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // expanded comments
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, CommunityComment[]>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});

  // feed tab
  const [feedTab, setFeedTab] = useState<"all" | "following">("all");
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  // report dialog
  const [reportTarget, setReportTarget] = useState<{ postId?: string; commentId?: string } | null>(null);
  const [reportReason, setReportReason] = useState("");

  useEffect(() => {
    void loadPosts();
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setIsBanned(false);
      setFollowingIds(new Set());
      return;
    }
    void supabase
      .from("community_bans")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setIsBanned(!!data));

    void supabase
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", user.id)
      .then(({ data }) => {
        setFollowingIds(new Set((data || []).map((r) => r.following_id)));
      });
  }, [user?.id]);

  async function loadPosts() {
    setLoading(true);
    const { data: postsData, error } = await supabase
      .from("community_posts")
      .select("*")
      .eq("is_hidden", false)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      toast.error(t.common.error);
      setLoading(false);
      return;
    }

    const list = (postsData || []) as CommunityPost[];
    const userIds = [...new Set(list.map((p) => p.user_id))];

    // load authors
    let authors: Record<string, PostAuthor> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);
      authors = Object.fromEntries(
        (profiles || []).map((p) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url }]),
      );
    }

    // load my likes & saves
    let likedSet = new Set<string>();
    let savedSet = new Set<string>();
    if (user && list.length > 0) {
      const ids = list.map((p) => p.id);
      const [likesRes, savesRes] = await Promise.all([
        supabase.from("community_likes").select("post_id").eq("user_id", user.id).in("post_id", ids),
        supabase.from("community_saves").select("post_id").eq("user_id", user.id).in("post_id", ids),
      ]);
      likedSet = new Set((likesRes.data || []).map((r) => r.post_id));
      savedSet = new Set((savesRes.data || []).map((r) => r.post_id));
    }

    setPosts(
      list.map((p) => ({
        ...p,
        author: authors[p.user_id],
        liked_by_me: likedSet.has(p.id),
        saved_by_me: savedSet.has(p.id),
      })),
    );
    setLoading(false);
  }

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Max 5MB");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
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

    const { error } = await supabase.from("community_posts").insert({
      user_id: user.id,
      post_type: postType,
      title: parsed.data.title || null,
      content: parsed.data.content,
      image_url: imageUrl,
    });

    setSubmitting(false);

    if (error) {
      if (error.message.includes("is_community_banned")) {
        toast.error(t.community.banned);
      } else {
        toast.error(error.message);
      }
      return;
    }

    toast.success(t.community.published);
    setTitle("");
    setContent("");
    setPostType("post");
    clearImage();
    void loadPosts();
  }

  async function toggleLike(post: CommunityPost) {
    if (!user) {
      toast.error(t.community.loginPrompt);
      return;
    }
    if (post.liked_by_me) {
      await supabase.from("community_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, liked_by_me: false, likes_count: Math.max(0, p.likes_count - 1) } : p,
        ),
      );
    } else {
      const { error } = await supabase.from("community_likes").insert({ post_id: post.id, user_id: user.id });
      if (error) return;
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, liked_by_me: true, likes_count: p.likes_count + 1 } : p)),
      );
    }
  }

  async function toggleSave(post: CommunityPost) {
    if (!user) {
      toast.error(t.community.loginPrompt);
      return;
    }
    if (post.saved_by_me) {
      await supabase.from("community_saves").delete().eq("post_id", post.id).eq("user_id", user.id);
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, saved_by_me: false } : p)));
    } else {
      const { error } = await supabase.from("community_saves").insert({ post_id: post.id, user_id: user.id });
      if (error) return;
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, saved_by_me: true } : p)));
    }
  }

  async function deletePost(post: CommunityPost) {
    if (!confirm(t.community.confirmDelete)) return;
    const { error } = await supabase.from("community_posts").delete().eq("id", post.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t.community.deleted);
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
  }

  async function loadComments(postId: string) {
    const { data } = await supabase
      .from("community_comments")
      .select("id, user_id, content, created_at")
      .eq("post_id", postId)
      .eq("is_hidden", false)
      .order("created_at", { ascending: true });

    const list = (data || []) as CommunityComment[];
    const userIds = [...new Set(list.map((c) => c.user_id))];
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);
      const map = Object.fromEntries(
        (profs || []).map((p) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url }]),
      );
      list.forEach((c) => (c.author = map[c.user_id]));
    }
    setComments((prev) => ({ ...prev, [postId]: list }));
  }

  function toggleComments(postId: string) {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
    } else {
      setExpandedPostId(postId);
      if (!comments[postId]) void loadComments(postId);
    }
  }

  async function submitComment(postId: string) {
    if (!user) {
      toast.error(t.community.loginPrompt);
      return;
    }
    const text = (commentDraft[postId] || "").trim();
    if (!text || text.length > 500) return;

    const { error } = await supabase
      .from("community_comments")
      .insert({ post_id: postId, user_id: user.id, content: text });
    if (error) {
      if (error.message.includes("is_community_banned")) toast.error(t.community.banned);
      else toast.error(error.message);
      return;
    }
    setCommentDraft((prev) => ({ ...prev, [postId]: "" }));
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p)));
    void loadComments(postId);
  }

  async function submitReport() {
    if (!user || !reportTarget || !reportReason.trim()) return;
    const { error } = await supabase.from("community_reports").insert({
      reporter_id: user.id,
      post_id: reportTarget.postId || null,
      comment_id: reportTarget.commentId || null,
      reason: reportReason.trim().slice(0, 500),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t.community.reportSent);
    setReportTarget(null);
    setReportReason("");
  }

  return (
    <div className="mx-auto max-w-2xl px-3 pb-20 pt-4 sm:px-4 sm:pt-6">
      <div className="mb-5 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.community.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.community.subtitle}</p>
      </div>

      {/* Composer */}
      {user ? (
        isBanned ? (
          <Card className="mb-6 rounded-3xl border-destructive/40 bg-destructive/5 p-4 text-center text-sm text-destructive">
            {t.community.banned}
          </Card>
        ) : (
          <Card className="mb-6 rounded-3xl p-4 shadow-soft">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={postType === "post" ? "default" : "outline"}
                  className="rounded-xl"
                  onClick={() => setPostType("post")}
                >
                  <Sparkles className="me-1.5 h-3.5 w-3.5" />
                  {t.community.typePost}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={postType === "recipe" ? "default" : "outline"}
                  className="rounded-xl"
                  onClick={() => setPostType("recipe")}
                >
                  <ChefHat className="me-1.5 h-3.5 w-3.5" />
                  {t.community.typeRecipe}
                </Button>
              </div>

              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.community.composeTitle}
                maxLength={150}
                className="rounded-xl"
              />
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t.community.composePlaceholder}
                maxLength={2000}
                rows={3}
                className="rounded-xl resize-none"
              />

              {imagePreview && (
                <div className="relative">
                  <img src={imagePreview} alt="preview" className="max-h-64 w-full rounded-xl object-cover" />
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

              <div className="flex items-center justify-between">
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={onPickImage} />
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-input px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted">
                    <ImagePlus className="h-3.5 w-3.5" />
                    {t.community.addImage}
                  </span>
                </label>
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
            </form>
          </Card>
        )
      ) : (
        <Card className="mb-6 rounded-3xl p-4 text-center">
          <p className="mb-3 text-sm text-muted-foreground">{t.community.loginPrompt}</p>
          <Button asChild size="sm" className="rounded-xl gradient-primary text-primary-foreground">
            <Link to="/auth">{t.auth.login}</Link>
          </Button>
        </Card>
      )}

      {/* Feed */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : posts.length === 0 ? (
        <Card className="rounded-3xl p-8 text-center text-sm text-muted-foreground">{t.community.empty}</Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id} className="overflow-hidden rounded-3xl shadow-soft">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 pt-4">
                <Link
                  to="/u/$userId"
                  params={{ userId: post.user_id }}
                  className="shrink-0 transition hover:opacity-80"
                  aria-label={post.author?.display_name || t.community.anonymous}
                >
                  <Avatar className="h-10 w-10">
                    {post.author?.avatar_url && <AvatarImage src={post.author.avatar_url} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                      {(post.author?.display_name || t.community.anonymous).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    to="/u/$userId"
                    params={{ userId: post.user_id }}
                    className="block truncate text-sm font-bold hover:text-primary hover:underline"
                  >
                    {post.author?.display_name || t.community.anonymous}
                  </Link>
                  <p className="text-xs text-muted-foreground">{timeAgo(post.created_at, lang, t)}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    post.post_type === "recipe" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {post.post_type === "recipe" ? t.community.typeRecipe : t.community.typePost}
                </span>
                {user?.id === post.user_id && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 rounded-full p-0 text-destructive"
                    onClick={() => deletePost(post)}
                    aria-label={t.community.delete}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Body */}
              <div className="px-4 py-3">
                {post.title && <h3 className="mb-1 text-base font-extrabold">{post.title}</h3>}
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.content}</p>
              </div>

              {post.image_url && (
                <img src={post.image_url} alt="" className="max-h-96 w-full object-cover" loading="lazy" />
              )}

              {/* Actions */}
              <div className="flex items-center gap-1 border-t border-border/50 px-2 py-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={`flex-1 rounded-xl ${post.liked_by_me ? "text-rose-500" : ""}`}
                  onClick={() => toggleLike(post)}
                >
                  <Heart className={`me-1.5 h-4 w-4 ${post.liked_by_me ? "fill-current" : ""}`} />
                  <span className="text-xs">{post.likes_count}</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="flex-1 rounded-xl"
                  onClick={() => toggleComments(post.id)}
                >
                  <MessageCircle className="me-1.5 h-4 w-4" />
                  <span className="text-xs">{post.comments_count}</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={`flex-1 rounded-xl ${post.saved_by_me ? "text-primary" : ""}`}
                  onClick={() => toggleSave(post)}
                >
                  <Bookmark className={`h-4 w-4 ${post.saved_by_me ? "fill-current" : ""}`} />
                </Button>
                {user && user.id !== post.user_id && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="rounded-xl text-muted-foreground"
                    onClick={() => setReportTarget({ postId: post.id })}
                    aria-label={t.community.report}
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Comments */}
              {expandedPostId === post.id && (
                <div className="border-t border-border/50 bg-muted/30 px-4 py-3">
                  <div className="space-y-3">
                    {(comments[post.id] || []).length === 0 ? (
                      <p className="text-center text-xs text-muted-foreground">{t.community.noComments}</p>
                    ) : (
                      (comments[post.id] || []).map((c) => (
                        <div key={c.id} className="flex gap-2">
                          <Link
                            to="/u/$userId"
                            params={{ userId: c.user_id }}
                            className="shrink-0 transition hover:opacity-80"
                          >
                            <Avatar className="h-7 w-7">
                              {c.author?.avatar_url && <AvatarImage src={c.author.avatar_url} />}
                              <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                                {(c.author?.display_name || "?").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </Link>
                          <div className="flex-1 rounded-2xl bg-background px-3 py-1.5">
                            <Link
                              to="/u/$userId"
                              params={{ userId: c.user_id }}
                              className="text-xs font-bold hover:text-primary hover:underline"
                            >
                              {c.author?.display_name || t.community.anonymous}
                            </Link>
                            <p className="text-sm">{c.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {user && !isBanned && (
                    <div className="mt-3 flex gap-2">
                      <Input
                        value={commentDraft[post.id] || ""}
                        onChange={(e) => setCommentDraft((prev) => ({ ...prev, [post.id]: e.target.value }))}
                        placeholder={t.community.writeComment}
                        maxLength={500}
                        className="rounded-xl"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void submitComment(post.id);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-xl"
                        onClick={() => submitComment(post.id)}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Report dialog */}
      <Dialog open={!!reportTarget} onOpenChange={(o) => !o && setReportTarget(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>{t.community.reportReason}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder={t.community.reportPlaceholder}
            maxLength={500}
            rows={4}
            className="rounded-xl"
          />
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setReportTarget(null)}>
              {t.common.cancel}
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              onClick={submitReport}
              disabled={!reportReason.trim()}
            >
              {t.community.sendReport}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
