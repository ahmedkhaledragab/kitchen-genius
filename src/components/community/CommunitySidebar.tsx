import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { TrendingUp, UserPlus, Hash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface TrendingTag {
  tag: string;
  posts_count: number;
}

interface SuggestedUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  followers_count: number;
}

export function CommunitySidebar() {
  const { user } = useAuth();
  const { t } = useLang();
  const [tags, setTags] = useState<TrendingTag[]>([]);
  const [suggested, setSuggested] = useState<SuggestedUser[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    void supabase
      .rpc("get_trending_hashtags", { _limit: 8 })
      .then(({ data }) => setTags((data || []) as TrendingTag[]));
  }, []);

  useEffect(() => {
    if (!user) {
      setSuggested([]);
      return;
    }
    void supabase
      .rpc("get_suggested_users", { _viewer_id: user.id, _limit: 5 })
      .then(({ data }) => setSuggested((data || []) as SuggestedUser[]));
  }, [user?.id]);

  async function followUser(id: string) {
    if (!user) return;
    const { error } = await supabase
      .from("user_follows")
      .insert({ follower_id: user.id, following_id: id });
    if (error) {
      toast.error(error.message);
      return;
    }
    setFollowing((prev) => new Set(prev).add(id));
    toast.success(t.community.followed);
  }

  return (
    <aside className="space-y-4">
      <Card className="rounded-3xl p-4 shadow-soft">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold">
          <TrendingUp className="h-4 w-4 text-primary" />
          {t.community.trendingTags}
        </h3>
        {tags.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t.community.noTrending}</p>
        ) : (
          <ul className="space-y-1">
            {tags.map((tg) => (
              <li key={tg.tag}>
                <Link
                  to="/community/tag/$tag"
                  params={{ tag: tg.tag }}
                  className="flex items-center justify-between rounded-xl px-2 py-1.5 text-sm transition hover:bg-muted"
                >
                  <span className="flex items-center gap-1.5 font-semibold text-primary">
                    <Hash className="h-3.5 w-3.5" />
                    {tg.tag}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {tg.posts_count} {t.community.posts}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {user && suggested.length > 0 && (
        <Card className="rounded-3xl p-4 shadow-soft">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold">
            <UserPlus className="h-4 w-4 text-primary" />
            {t.community.suggested}
          </h3>
          <ul className="space-y-3">
            {suggested.map((u) => (
              <li key={u.id} className="flex items-center gap-2">
                <Link
                  to="/u/$userId"
                  params={{ userId: u.id }}
                  className="shrink-0"
                >
                  <Avatar className="h-9 w-9">
                    {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                    <AvatarFallback className="bg-primary/10 text-xs text-primary">
                      {(u.display_name || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    to="/u/$userId"
                    params={{ userId: u.id }}
                    className="block truncate text-xs font-bold hover:text-primary hover:underline"
                  >
                    {u.display_name || t.community.anonymous}
                  </Link>
                  <p className="text-[10px] text-muted-foreground">
                    {u.followers_count} {t.community.followers}
                  </p>
                </div>
                {following.has(u.id) ? (
                  <Button size="sm" variant="ghost" className="rounded-xl text-xs" disabled>
                    {t.community.followingBtn}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="rounded-xl text-xs"
                    onClick={() => void followUser(u.id)}
                  >
                    {t.community.follow}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </aside>
  );
}
