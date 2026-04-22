import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Composer } from "@/components/community/Composer";
import { PostCard, type FeedPost } from "@/components/community/PostCard";
import { CommunitySidebar } from "@/components/community/CommunitySidebar";
import type { ReactionType } from "@/lib/community";
import { SEO } from "@/components/SEO";

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

function CommunityPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBanned, setIsBanned] = useState(false);
  const [feedTab, setFeedTab] = useState<"all" | "following" | "trending">("all");
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [reportTarget, setReportTarget] = useState<{ postId?: string; commentId?: string } | null>(null);
  const [reportReason, setReportReason] = useState("");

  useEffect(() => {
    void loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const list = (postsData || []) as unknown as FeedPost[];
    const userIds = [...new Set(list.map((p) => p.user_id))];
    const ids = list.map((p) => p.id);

    const [profilesRes, savesRes, reactionsRes, myReactionRes] = await Promise.all([
      userIds.length
        ? supabase.from("profiles").select("id, display_name, avatar_url").in("id", userIds)
        : Promise.resolve({ data: [] as { id: string; display_name: string | null; avatar_url: string | null }[] }),
      user && ids.length
        ? supabase.from("community_saves").select("post_id").eq("user_id", user.id).in("post_id", ids)
        : Promise.resolve({ data: [] as { post_id: string }[] }),
      ids.length
        ? supabase.from("community_reactions").select("post_id, reaction").in("post_id", ids)
        : Promise.resolve({ data: [] as { post_id: string; reaction: ReactionType }[] }),
      user && ids.length
        ? supabase
            .from("community_reactions")
            .select("post_id, reaction")
            .eq("user_id", user.id)
            .in("post_id", ids)
        : Promise.resolve({ data: [] as { post_id: string; reaction: ReactionType }[] }),
    ]);

    const authors = Object.fromEntries(
      (profilesRes.data || []).map((p) => [
        p.id,
        { display_name: p.display_name, avatar_url: p.avatar_url },
      ]),
    );
    const savedSet = new Set((savesRes.data || []).map((r) => r.post_id));

    const summaries: Record<string, Partial<Record<ReactionType, number>>> = {};
    const totals: Record<string, number> = {};
    (reactionsRes.data || []).forEach((r) => {
      summaries[r.post_id] = summaries[r.post_id] || {};
      summaries[r.post_id][r.reaction] = (summaries[r.post_id][r.reaction] || 0) + 1;
      totals[r.post_id] = (totals[r.post_id] || 0) + 1;
    });
    const myReactions: Record<string, ReactionType> = {};
    (myReactionRes.data || []).forEach((r) => {
      myReactions[r.post_id] = r.reaction;
    });

    setPosts(
      list.map((p) => ({
        ...p,
        author: authors[p.user_id],
        saved_by_me: savedSet.has(p.id),
        my_reaction: myReactions[p.id] ?? null,
        reaction_summary: summaries[p.id] || {},
        reaction_total: totals[p.id] || 0,
      })),
    );
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

  function patchPost(id: string, patch: Partial<FeedPost>) {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  let visiblePosts = posts;
  if (feedTab === "following") {
    visiblePosts = posts.filter((p) => followingIds.has(p.user_id) || p.user_id === user?.id);
  } else if (feedTab === "trending") {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    visiblePosts = posts
      .filter((p) => new Date(p.created_at).getTime() >= sevenDaysAgo && (p.reaction_total ?? 0) > 0)
      .slice()
      .sort((a, b) => (b.reaction_total ?? 0) - (a.reaction_total ?? 0));
  }

  return (
    <div className="mx-auto max-w-6xl px-3 pb-20 pt-4 sm:px-4 sm:pt-6">
      <div className="mb-5 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.community.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.community.subtitle}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        {/* MAIN COLUMN */}
        <div className="min-w-0 space-y-4">
          <Composer isBanned={isBanned} onPosted={loadPosts} />

          <Tabs
            value={feedTab}
            onValueChange={(v) => setFeedTab(v as "all" | "following" | "trending")}
          >
            <TabsList className="grid w-full grid-cols-3 rounded-2xl">
              <TabsTrigger value="all" className="rounded-xl text-xs sm:text-sm">
                {t.community.tabAll}
              </TabsTrigger>
              <TabsTrigger value="following" className="rounded-xl text-xs sm:text-sm">
                {t.community.tabFollowing}
              </TabsTrigger>
              <TabsTrigger value="trending" className="rounded-xl text-xs sm:text-sm">
                {t.community.tabTrending}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : feedTab === "following" && !user ? (
            <Card className="rounded-3xl p-8 text-center text-sm text-muted-foreground">
              {t.community.followingLoginPrompt}
            </Card>
          ) : visiblePosts.length === 0 ? (
            <Card className="rounded-3xl p-8 text-center text-sm text-muted-foreground">
              {feedTab === "following"
                ? t.community.followingEmpty
                : feedTab === "trending"
                  ? t.community.trendingEmpty
                  : t.community.empty}
            </Card>
          ) : (
            <div className="space-y-4">
              {visiblePosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  isBanned={isBanned}
                  onMutate={(patch) => patchPost(post.id, patch)}
                  onDelete={() => setPosts((prev) => prev.filter((p) => p.id !== post.id))}
                  onReport={(target) => setReportTarget(target)}
                />
              ))}
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <div className="hidden lg:block">
          <div className="sticky top-20">
            <CommunitySidebar />
          </div>
        </div>
      </div>

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

      {/* Hidden link to satisfy router (visited from sidebar) */}
      <Link to="/community" className="hidden" aria-hidden />
    </div>
  );
}
