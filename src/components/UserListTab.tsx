import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, UserPlus, UserCheck } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface UserItem {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function UserListTab({
  ownerId,
  mode,
  emptyText,
}: {
  ownerId: string;
  mode: "followers" | "following";
  emptyText: string;
}) {
  const { user } = useAuth();
  const { lang } = useLang();
  const isAr = lang === "ar";

  const [users, setUsers] = useState<UserItem[]>([]);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId, mode]);

  async function load() {
    setLoading(true);

    // 1) Get the relevant user_id list from user_follows
    const idCol = mode === "followers" ? "following_id" : "follower_id";
    const otherCol = mode === "followers" ? "follower_id" : "following_id";

    const { data: rels } = await supabase
      .from("user_follows")
      .select(`${otherCol}, created_at`)
      .eq(idCol, ownerId)
      .order("created_at", { ascending: false })
      .limit(200);

    const ids = ((rels as Array<Record<string, string>> | null) || [])
      .map((r) => r[otherCol])
      .filter(Boolean);

    if (ids.length === 0) {
      setUsers([]);
      setFollowingSet(new Set());
      setLoading(false);
      return;
    }

    // 2) Fetch profile info
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", ids);

    // Preserve order from rels
    const map = new Map((profs || []).map((p) => [p.id, p as UserItem]));
    const ordered = ids.map((id) => map.get(id)).filter((x): x is UserItem => !!x);
    setUsers(ordered);

    // 3) Fetch which of these the *current* user follows (for button state)
    if (user) {
      const { data: mine } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", user.id)
        .in("following_id", ids);
      setFollowingSet(new Set((mine || []).map((r) => r.following_id)));
    }

    setLoading(false);
  }

  async function toggleFollow(targetId: string) {
    if (!user || targetId === user.id) return;
    setBusyId(targetId);
    try {
      if (followingSet.has(targetId)) {
        const { error } = await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", targetId);
        if (error) throw error;
        setFollowingSet((s) => {
          const n = new Set(s);
          n.delete(targetId);
          return n;
        });
      } else {
        const { error } = await supabase
          .from("user_follows")
          .insert({ follower_id: user.id, following_id: targetId });
        if (error) throw error;
        setFollowingSet((s) => new Set(s).add(targetId));
      }
    } catch (e) {
      console.error(e);
      toast.error(isAr ? "حصل خطأ، حاولي تاني" : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <Card className="rounded-3xl border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        {emptyText}
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {users.map((u) => {
        const isFollowing = followingSet.has(u.id);
        const isSelf = user?.id === u.id;
        return (
          <Card
            key={u.id}
            className="flex items-center gap-3 rounded-2xl p-3 shadow-soft"
          >
            <Link to="/u/$userId" params={{ userId: u.id }} className="flex flex-1 items-center gap-3 min-w-0">
              <Avatar className="h-11 w-11">
                {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                <AvatarFallback className="bg-primary/10 text-primary">
                  {(u.display_name || "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">
                  {u.display_name || (isAr ? "مستخدم" : "User")}
                </p>
              </div>
            </Link>
            {!isSelf && (
              <Button
                type="button"
                size="sm"
                variant={isFollowing ? "outline" : "default"}
                className="shrink-0 rounded-xl text-xs"
                onClick={() => toggleFollow(u.id)}
                disabled={busyId === u.id}
              >
                {busyId === u.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isFollowing ? (
                  <>
                    <UserCheck className="me-1 h-3.5 w-3.5" />
                    {isAr ? "متابَع" : "Following"}
                  </>
                ) : (
                  <>
                    <UserPlus className="me-1 h-3.5 w-3.5" />
                    {isAr ? "متابعة" : "Follow"}
                  </>
                )}
              </Button>
            )}
          </Card>
        );
      })}
    </div>
  );
}
