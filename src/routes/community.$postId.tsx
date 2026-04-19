import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PostCard, type FeedPost } from "@/components/community/PostCard";
import { CommunitySidebar } from "@/components/community/CommunitySidebar";
import type { ReactionType } from "@/lib/community";

export const Route = createFileRoute("/community/$postId")({
  head: ({ params }) => ({
    meta: [
      { title: `بوست في مجتمع المطبخ` },
      { name: "description", content: "بوست من مجتمع المطبخ" },
      { property: "og:title", content: "بوست في مجتمع المطبخ" },
      { property: "og:description", content: "اقرئي وتفاعلي مع البوست في مجتمع المطبخ" },
      { property: "og:url", content: `/community/${params.postId}` },
    ],
  }),
  component: PostDetailPage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl p-6 text-center">
      <p className="text-sm text-destructive">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl p-6 text-center">
      <p className="mb-3 text-sm text-muted-foreground">Not found</p>
      <Button asChild>
        <Link to="/community">Back</Link>
      </Button>
    </div>
  ),
});

function PostDetailPage() {
  const { postId } = Route.useParams();
  const { user } = useAuth();
  const { t } = useLang();
  const router = useRouter();
  const [post, setPost] = useState<FeedPost | null>(null);
  const [related, setRelated] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBanned, setIsBanned] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ postId?: string; commentId?: string } | null>(null);
  const [reportReason, setReportReason] = useState("");

  useEffect(() => {
    void loadPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, user?.id]);

  useEffect(() => {
    if (!user) {
      setIsBanned(false);
      return;
    }
    void supabase
      .from("community_bans")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setIsBanned(!!data));
  }, [user?.id]);

  async function loadPost() {
    setLoading(true);
    const { data, error } = await supabase
      .from("community_posts")
      .select("*")
      .eq("id", postId)
      .eq("is_hidden", false)
      .maybeSingle();

    if (error || !data) {
      setPost(null);
      setLoading(false);
      return;
    }

    const p = data as unknown as FeedPost;
    const [authorRes, savedRes, reactionsRes, myReactionRes, hashtagsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("id", p.user_id)
        .maybeSingle(),
      user
        ? supabase
            .from("community_saves")
            .select("post_id")
            .eq("post_id", p.id)
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("community_reactions").select("reaction").eq("post_id", p.id),
      user
        ? supabase
            .from("community_reactions")
            .select("reaction")
            .eq("post_id", p.id)
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null as { reaction: ReactionType } | null }),
      supabase.from("community_post_hashtags").select("tag").eq("post_id", p.id),
    ]);

    const summary: Partial<Record<ReactionType, number>> = {};
    let total = 0;
    (reactionsRes.data || []).forEach((r) => {
      summary[r.reaction as ReactionType] = (summary[r.reaction as ReactionType] || 0) + 1;
      total += 1;
    });

    setPost({
      ...p,
      author: authorRes.data
        ? { display_name: authorRes.data.display_name, avatar_url: authorRes.data.avatar_url }
        : undefined,
      saved_by_me: !!savedRes.data,
      my_reaction: (myReactionRes.data?.reaction as ReactionType) ?? null,
      reaction_summary: summary,
      reaction_total: total,
    });

    // Related posts by hashtag
    const tags = (hashtagsRes.data || []).map((h) => h.tag);
    if (tags.length > 0) {
      const { data: relRows } = await supabase
        .from("community_post_hashtags")
        .select("post_id")
        .in("tag", tags)
        .neq("post_id", p.id)
        .limit(20);
      const relIds = [...new Set((relRows || []).map((r) => r.post_id))].slice(0, 3);
      if (relIds.length > 0) {
        const { data: relPosts } = await supabase
          .from("community_posts")
          .select("*")
          .in("id", relIds)
          .eq("is_hidden", false);
        setRelated((relPosts || []) as unknown as FeedPost[]);
      }
    }

    setLoading(false);
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

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center">
        <p className="mb-4 text-sm text-muted-foreground">{t.community.postNotFound}</p>
        <Button asChild className="rounded-xl">
          <Link to="/community">{t.community.backToFeed}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-3 pb-20 pt-4 sm:px-4 sm:pt-6">
      <Button
        variant="ghost"
        size="sm"
        className="mb-3 rounded-xl"
        onClick={() => router.history.back()}
      >
        <ArrowLeft className="me-1.5 h-4 w-4" />
        {t.community.backToFeed}
      </Button>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-4">
          <PostCard
            post={post}
            isBanned={isBanned}
            variant="detail"
            onMutate={(patch) => setPost((p) => (p ? { ...p, ...patch } : p))}
            onDelete={() => router.navigate({ to: "/community" })}
            onReport={(target) => setReportTarget(target)}
          />

          {related.length > 0 && (
            <Card className="rounded-3xl p-4 shadow-soft">
              <h3 className="mb-3 text-sm font-extrabold">{t.community.relatedPosts}</h3>
              <ul className="space-y-2">
                {related.map((r) => (
                  <li key={r.id}>
                    <Link
                      to="/community/$postId"
                      params={{ postId: r.id }}
                      className="block rounded-2xl bg-muted/50 px-3 py-2 text-sm hover:bg-muted"
                    >
                      <span className="line-clamp-2">{r.title || r.content}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-20">
            <CommunitySidebar />
          </div>
        </div>
      </div>

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
            <Button variant="outline" className="rounded-xl" onClick={() => setReportTarget(null)}>
              {t.common.cancel}
            </Button>
            <Button className="rounded-xl" onClick={submitReport} disabled={!reportReason.trim()}>
              {t.community.sendReport}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
