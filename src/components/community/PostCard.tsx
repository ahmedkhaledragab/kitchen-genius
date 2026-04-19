import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bookmark, Flag, Trash2, Share2, Pin, MoreHorizontal, Link2, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RichContent } from "./RichContent";
import { ReactionPicker } from "./ReactionPicker";
import { CommentThread, type CommentNode } from "./CommentThread";
import {
  REACTION_EMOJI,
  REACTIONS_ORDER,
  timeAgo,
  type ReactionType,
} from "@/lib/community";

export interface PostAuthor {
  display_name: string | null;
  avatar_url: string | null;
}

export interface FeedPost {
  id: string;
  user_id: string;
  post_type: "post" | "recipe";
  title: string | null;
  content: string;
  image_url: string | null;
  is_pinned: boolean;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author?: PostAuthor;
  saved_by_me?: boolean;
  my_reaction?: ReactionType | null;
  reaction_summary?: Partial<Record<ReactionType, number>>;
  reaction_total?: number;
}

interface PostCardProps {
  post: FeedPost;
  isBanned?: boolean;
  onMutate?: (next: Partial<FeedPost>) => void;
  onDelete?: () => void;
  onReport: (target: { postId?: string; commentId?: string }) => void;
  variant?: "feed" | "detail";
}

export function PostCard({ post, isBanned, onMutate, onDelete, onReport, variant = "feed" }: PostCardProps) {
  const { user, isAdmin } = useAuth();
  const { t, lang } = useLang();
  const [showComments, setShowComments] = useState(variant === "detail");
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const isMine = user?.id === post.user_id;
  const totalReactions =
    post.reaction_total ??
    Object.values(post.reaction_summary || {}).reduce<number>((acc, n) => acc + (n || 0), 0);

  useEffect(() => {
    if (variant === "detail") void loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id, variant]);

  async function loadComments() {
    const { data } = await supabase
      .from("community_comments")
      .select("id, user_id, content, created_at, parent_comment_id, post_id")
      .eq("post_id", post.id)
      .eq("is_hidden", false)
      .order("created_at", { ascending: true });
    const list = (data || []) as CommentNode[];
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
    setComments(list);
    setLoadedOnce(true);
  }

  function toggleComments() {
    if (!showComments && !loadedOnce) void loadComments();
    setShowComments(!showComments);
  }

  async function setReaction(next: ReactionType | null) {
    if (!user) {
      toast.error(t.community.loginPrompt);
      return;
    }
    const prev = post.my_reaction ?? null;
    if (prev === next) return;

    // optimistic
    const summary = { ...(post.reaction_summary || {}) };
    if (prev) summary[prev] = Math.max(0, (summary[prev] || 1) - 1);
    if (next) summary[next] = (summary[next] || 0) + 1;
    const newTotal =
      (post.reaction_total ?? totalReactions) + (next ? (prev ? 0 : 1) : prev ? -1 : 0);
    onMutate?.({
      my_reaction: next,
      reaction_summary: summary,
      reaction_total: Math.max(0, newTotal),
      likes_count: Math.max(0, newTotal),
    });

    if (next === null) {
      await supabase.from("community_reactions").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else if (prev === null) {
      await supabase.from("community_reactions").insert({
        post_id: post.id,
        user_id: user.id,
        reaction: next,
      });
    } else {
      await supabase
        .from("community_reactions")
        .update({ reaction: next })
        .eq("post_id", post.id)
        .eq("user_id", user.id);
    }
  }

  async function toggleSave() {
    if (!user) {
      toast.error(t.community.loginPrompt);
      return;
    }
    if (post.saved_by_me) {
      await supabase.from("community_saves").delete().eq("post_id", post.id).eq("user_id", user.id);
      onMutate?.({ saved_by_me: false });
    } else {
      const { error } = await supabase
        .from("community_saves")
        .insert({ post_id: post.id, user_id: user.id });
      if (error) return;
      onMutate?.({ saved_by_me: true });
      toast.success(t.community.savedToast);
    }
  }

  async function handleDelete() {
    if (!confirm(t.community.confirmDelete)) return;
    const { error } = await supabase.from("community_posts").delete().eq("id", post.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t.community.deleted);
    onDelete?.();
  }

  async function handleShare() {
    const url = `${window.location.origin}/community/${post.id}`;
    const shareData = {
      title: post.title || post.author?.display_name || t.community.title,
      text: post.content.slice(0, 120),
      url,
    };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        toast.success(t.community.linkCopied);
      }
    } catch {
      // user cancelled
    }
  }

  async function copyLink() {
    const url = `${window.location.origin}/community/${post.id}`;
    await navigator.clipboard.writeText(url);
    toast.success(t.community.linkCopied);
  }

  // Top reactions for badges (max 3)
  const topReactions = REACTIONS_ORDER.filter((r) => (post.reaction_summary?.[r] || 0) > 0).slice(0, 3);

  return (
    <Card className="overflow-hidden rounded-3xl shadow-soft">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4">
        <Link
          to="/u/$userId"
          params={{ userId: post.user_id }}
          className="shrink-0 transition hover:opacity-80"
        >
          <Avatar className="h-10 w-10">
            {post.author?.avatar_url && <AvatarImage src={post.author.avatar_url} />}
            <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
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
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link
              to="/community/$postId"
              params={{ postId: post.id }}
              className="hover:underline"
            >
              {timeAgo(post.created_at, lang)}
            </Link>
            <span aria-hidden>·</span>
            <span>🌍</span>
          </div>
        </div>
        {post.is_pinned && <Pin className="h-4 w-4 text-primary" />}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={copyLink}>
              <Copy className="me-2 h-4 w-4" />
              {t.community.copyLink}
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/community/$postId" params={{ postId: post.id }}>
                <Link2 className="me-2 h-4 w-4" />
                {t.community.openPost}
              </Link>
            </DropdownMenuItem>
            {!isMine && user && (
              <DropdownMenuItem onClick={() => onReport({ postId: post.id })}>
                <Flag className="me-2 h-4 w-4" />
                {t.community.report}
              </DropdownMenuItem>
            )}
            {(isMine || isAdmin) && (
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="me-2 h-4 w-4" />
                {t.community.delete}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        {post.title && <h3 className="mb-1 text-base font-extrabold">{post.title}</h3>}
        <RichContent text={post.content} className="text-sm leading-relaxed" />
      </div>

      {post.image_url && (
        <Link to="/community/$postId" params={{ postId: post.id }} className="block">
          <img
            src={post.image_url}
            alt=""
            className="max-h-[480px] w-full object-cover"
            loading="lazy"
          />
        </Link>
      )}

      {/* Stats row */}
      {(totalReactions > 0 || post.comments_count > 0) && (
        <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            {topReactions.length > 0 && (
              <span className="flex -space-x-1">
                {topReactions.map((r) => (
                  <span
                    key={r}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-background text-xs ring-1 ring-border"
                  >
                    {REACTION_EMOJI[r]}
                  </span>
                ))}
              </span>
            )}
            {totalReactions > 0 && <span className="ms-1.5">{totalReactions}</span>}
          </div>
          {post.comments_count > 0 && (
            <button type="button" onClick={toggleComments} className="hover:underline">
              {post.comments_count} {t.community.comment}
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 border-t border-border/50 px-2 py-1">
        <ReactionPicker
          current={post.my_reaction ?? null}
          count={0}
          onPick={(r) => void setReaction(r)}
          label={post.my_reaction ? t.community.reactionLabels[post.my_reaction] : t.community.like}
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="flex-1 rounded-xl"
          onClick={toggleComments}
        >
          <span className="me-1.5">💬</span>
          <span className="text-xs font-semibold">{t.community.comment}</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="flex-1 rounded-xl"
          onClick={handleShare}
        >
          <Share2 className="me-1.5 h-4 w-4" />
          <span className="text-xs font-semibold">{t.community.share}</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={`rounded-xl ${post.saved_by_me ? "text-primary" : ""}`}
          onClick={toggleSave}
          aria-label={t.community.save}
        >
          <Bookmark className={`h-4 w-4 ${post.saved_by_me ? "fill-current" : ""}`} />
        </Button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="border-t border-border/50 bg-muted/30 px-4 py-3">
          <CommentThread
            postId={post.id}
            comments={comments}
            onReload={loadComments}
            onReport={(commentId) => onReport({ commentId })}
            isBanned={isBanned}
          />
        </div>
      )}
    </Card>
  );
}
