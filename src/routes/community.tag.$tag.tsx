import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Hash, Loader2, ArrowLeft } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PostCard, type FeedPost } from "@/components/community/PostCard";
import { CommunitySidebar } from "@/components/community/CommunitySidebar";
import type { ReactionType } from "@/lib/community";

export const Route = createFileRoute("/community/tag/$tag")({
  head: ({ params }) => ({
    meta: [
      { title: `#${params.tag} — مجتمع المطبخ` },
      { name: "description", content: `بوستات بالهاشتاج #${params.tag}` },
      { property: "og:title", content: `#${params.tag}` },
    ],
  }),
  component: TagPage,
});

function TagPage() {
  const { tag } = Route.useParams();
  const { user } = useAuth();
  const { t } = useLang();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag, user?.id]);

  async function load() {
    setLoading(true);
    const { data: tagRows } = await supabase
      .from("community_post_hashtags")
      .select("post_id")
      .eq("tag", tag.toLowerCase())
      .limit(50);
    const ids = [...new Set((tagRows || []).map((r) => r.post_id))];
    if (ids.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const { data: postsData } = await supabase
      .from("community_posts")
      .select("*")
      .in("id", ids)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false });

    const list = (postsData || []) as unknown as FeedPost[];
    const userIds = [...new Set(list.map((p) => p.user_id))];

    const [profilesRes, savesRes, reactionsRes, myReactionRes] = await Promise.all([
      userIds.length
        ? supabase.from("profiles").select("id, display_name, avatar_url").in("id", userIds)
        : Promise.resolve({ data: [] as { id: string; display_name: string | null; avatar_url: string | null }[] }),
      user && ids.length
        ? supabase.from("community_saves").select("post_id").eq("user_id", user.id).in("post_id", ids)
        : Promise.resolve({ data: [] as { post_id: string }[] }),
      supabase.from("community_reactions").select("post_id, reaction").in("post_id", ids),
      user
        ? supabase
            .from("community_reactions")
            .select("post_id, reaction")
            .eq("user_id", user.id)
            .in("post_id", ids)
        : Promise.resolve({ data: [] as { post_id: string; reaction: ReactionType }[] }),
    ]);

    const authors = Object.fromEntries(
      (profilesRes.data || []).map((p) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url }]),
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

  function patchPost(id: string, patch: Partial<FeedPost>) {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  return (
    <div className="mx-auto max-w-6xl px-3 pb-20 pt-4 sm:px-4 sm:pt-6">
      <Button asChild variant="ghost" size="sm" className="mb-3 rounded-xl">
        <Link to="/community">
          <ArrowLeft className="me-1.5 h-4 w-4" />
          {t.community.backToFeed}
        </Link>
      </Button>

      <div className="mb-5 flex items-center gap-2">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Hash className="h-6 w-6" />
        </span>
        <h1 className="text-2xl font-extrabold">{t.community.tagPageTitle.replace("{tag}", tag)}</h1>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : posts.length === 0 ? (
            <Card className="rounded-3xl p-8 text-center text-sm text-muted-foreground">
              {t.community.tagPageEmpty}
            </Card>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onMutate={(patch) => patchPost(post.id, patch)}
                onDelete={() => setPosts((prev) => prev.filter((p) => p.id !== post.id))}
                onReport={() => {}}
              />
            ))
          )}
        </div>
        <div className="hidden lg:block">
          <div className="sticky top-20">
            <CommunitySidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
