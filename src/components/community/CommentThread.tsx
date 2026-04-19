import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Send, Trash2, MessageCircle, Flag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MentionTextarea } from "./MentionTextarea";
import { RichContent } from "./RichContent";
import { timeAgo } from "@/lib/community";
import { cn } from "@/lib/utils";

export interface CommentAuthor {
  display_name: string | null;
  avatar_url: string | null;
}

export interface CommentNode {
  id: string;
  user_id: string;
  parent_comment_id: string | null;
  post_id: string;
  content: string;
  created_at: string;
  author?: CommentAuthor;
  replies?: CommentNode[];
}

interface CommentThreadProps {
  postId: string;
  comments: CommentNode[];
  onReload: () => void;
  onReport: (commentId: string) => void;
  isBanned?: boolean;
}

/** Two-level threaded comments. Replies to replies are flattened to one level. */
export function CommentThread({ postId, comments, onReload, onReport, isBanned }: CommentThreadProps) {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [topDraft, setTopDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Build tree: replies attach to their parent (or top-level if parent missing)
  const map = new Map<string, CommentNode>();
  comments.forEach((c) => map.set(c.id, { ...c, replies: [] }));
  const roots: CommentNode[] = [];
  map.forEach((c) => {
    if (c.parent_comment_id && map.has(c.parent_comment_id)) {
      map.get(c.parent_comment_id)!.replies!.push(c);
    } else {
      roots.push(c);
    }
  });

  async function submit(parentId: string | null, text: string) {
    if (!user) {
      toast.error(t.community.loginPrompt);
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;
    setSubmitting(true);
    const { error } = await supabase.from("community_comments").insert({
      post_id: postId,
      user_id: user.id,
      content: trimmed.slice(0, 500),
      parent_comment_id: parentId,
    });
    setSubmitting(false);
    if (error) {
      if (error.message.includes("is_community_banned")) toast.error(t.community.banned);
      else toast.error(error.message);
      return;
    }
    if (parentId) {
      setReplyTo(null);
      setDraft("");
    } else {
      setTopDraft("");
    }
    onReload();
  }

  async function deleteComment(id: string) {
    if (!confirm(t.community.confirmDelete)) return;
    const { error } = await supabase.from("community_comments").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    onReload();
  }

  function CommentItem({ comment, depth }: { comment: CommentNode; depth: number }) {
    const mine = user?.id === comment.user_id;
    return (
      <div className={cn("flex gap-2", depth > 0 && "ms-9")}>
        <Link
          to="/u/$userId"
          params={{ userId: comment.user_id }}
          className="shrink-0 transition hover:opacity-80"
        >
          <Avatar className="h-8 w-8">
            {comment.author?.avatar_url && <AvatarImage src={comment.author.avatar_url} />}
            <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
              {(comment.author?.display_name || "?").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="rounded-2xl bg-muted/60 px-3 py-2">
            <Link
              to="/u/$userId"
              params={{ userId: comment.user_id }}
              className="text-xs font-bold hover:text-primary hover:underline"
            >
              {comment.author?.display_name || t.community.anonymous}
            </Link>
            <RichContent text={comment.content} className="text-sm leading-relaxed" />
          </div>
          <div className="mt-0.5 flex items-center gap-3 px-2 text-[11px] text-muted-foreground">
            <span>{timeAgo(comment.created_at, lang)}</span>
            {depth === 0 && user && !isBanned && (
              <button
                type="button"
                onClick={() => {
                  setReplyTo(replyTo === comment.id ? null : comment.id);
                  setDraft("");
                }}
                className="font-semibold hover:text-primary"
              >
                <MessageCircle className="me-1 inline h-3 w-3" />
                {t.community.reply}
              </button>
            )}
            {mine && (
              <button
                type="button"
                onClick={() => deleteComment(comment.id)}
                className="font-semibold hover:text-destructive"
              >
                <Trash2 className="inline h-3 w-3" />
              </button>
            )}
            {!mine && user && (
              <button
                type="button"
                onClick={() => onReport(comment.id)}
                className="font-semibold hover:text-destructive"
                aria-label={t.community.report}
              >
                <Flag className="inline h-3 w-3" />
              </button>
            )}
          </div>

          {replyTo === comment.id && depth === 0 && (
            <form
              className="mt-2 space-y-2"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                void submit(comment.id, draft);
              }}
            >
              <MentionTextarea
                value={draft}
                onChange={setDraft}
                placeholder={t.community.replyTo.replace("{name}", comment.author?.display_name || "")}
                rows={2}
                maxLength={500}
                autoFocus
                onEnterSubmit={() => void submit(comment.id, draft)}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="rounded-xl"
                  onClick={() => {
                    setReplyTo(null);
                    setDraft("");
                  }}
                >
                  {t.common.cancel}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="rounded-xl"
                  disabled={submitting || !draft.trim()}
                >
                  <Send className="me-1 h-3.5 w-3.5" />
                  {t.community.sendComment}
                </Button>
              </div>
            </form>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2 space-y-2">
              {comment.replies.map((r) => (
                <CommentItem key={r.id} comment={r} depth={1} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {roots.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground">{t.community.noComments}</p>
      ) : (
        roots.map((c) => <CommentItem key={c.id} comment={c} depth={0} />)
      )}

      {user && !isBanned && (
        <form
          className="flex gap-2 pt-2"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            void submit(null, topDraft);
          }}
        >
          <div className="flex-1">
            <MentionTextarea
              value={topDraft}
              onChange={setTopDraft}
              placeholder={t.community.writeComment}
              rows={1}
              maxLength={500}
              onEnterSubmit={() => void submit(null, topDraft)}
            />
          </div>
          <Button type="submit" size="sm" className="rounded-xl" disabled={submitting || !topDraft.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}
    </div>
  );
}
