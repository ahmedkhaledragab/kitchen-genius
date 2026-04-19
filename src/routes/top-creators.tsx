import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Trophy, Heart, FileText, Users as UsersIcon } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/top-creators")({
  head: () => ({
    meta: [
      { title: "أكثر المستخدمين نشاطاً — مجتمع المطبخ" },
      {
        name: "description",
        content: "اكتشفي أكثر المستخدمين نشاطاً في مجتمع المطبخ بترتيب البوستات واللايكات.",
      },
    ],
  }),
  component: TopCreatorsPage,
});

interface Creator {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  posts_count: number;
  likes_count: number;
  followers_count: number;
}

type SortKey = "likes" | "posts" | "followers";

function TopCreatorsPage() {
  const { user, loading: authLoading } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  const isAr = lang === "ar";

  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("likes");

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_top_creators", { _limit: 100 });
    if (!error && data) {
      setCreators(
        (data as Creator[]).map((c) => ({
          ...c,
          posts_count: Number(c.posts_count),
          likes_count: Number(c.likes_count),
          followers_count: Number(c.followers_count),
        })),
      );
    }
    setLoading(false);
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const sorted = [...creators].sort((a, b) => {
    if (sort === "likes") return b.likes_count - a.likes_count || b.posts_count - a.posts_count;
    if (sort === "posts") return b.posts_count - a.posts_count || b.likes_count - a.likes_count;
    return b.followers_count - a.followers_count || b.likes_count - a.likes_count;
  });

  return (
    <div className="mx-auto max-w-2xl px-4 pb-20 pt-6">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-extrabold">
          {isAr ? "أكثر المستخدمين نشاطاً" : "Top creators"}
        </h1>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        {isAr
          ? "النجوم اللي بيخلوا المجتمع حلو 💛"
          : "The stars who keep the community alive 💛"}
      </p>

      <Tabs value={sort} onValueChange={(v) => setSort(v as SortKey)} className="mb-4">
        <TabsList className="grid w-full grid-cols-3 rounded-2xl">
          <TabsTrigger value="likes" className="rounded-xl text-xs">
            <Heart className="me-1 h-3.5 w-3.5" />
            {isAr ? "اللايكات" : "Likes"}
          </TabsTrigger>
          <TabsTrigger value="posts" className="rounded-xl text-xs">
            <FileText className="me-1 h-3.5 w-3.5" />
            {isAr ? "البوستات" : "Posts"}
          </TabsTrigger>
          <TabsTrigger value="followers" className="rounded-xl text-xs">
            <UsersIcon className="me-1 h-3.5 w-3.5" />
            {isAr ? "متابعين" : "Followers"}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {sorted.length === 0 ? (
        <Card className="rounded-3xl border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          {isAr ? "لسه مفيش نشاط في المجتمع" : "No community activity yet"}
        </Card>
      ) : (
        <div className="space-y-2">
          {sorted.map((c, idx) => (
            <Link
              key={c.id}
              to="/u/$userId"
              params={{ userId: c.id }}
              className="block"
            >
              <Card className="flex items-center gap-3 rounded-2xl p-3 shadow-soft transition hover:bg-muted/40">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">
                  {idx + 1}
                </div>
                <Avatar className="h-12 w-12">
                  {c.avatar_url && <AvatarImage src={c.avatar_url} />}
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {(c.display_name || "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {c.display_name || (isAr ? "مستخدم" : "User")}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {c.posts_count}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {c.likes_count}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <UsersIcon className="h-3 w-3" />
                      {c.followers_count}
                    </span>
                  </div>
                </div>
                <Button type="button" size="sm" variant="outline" className="rounded-xl text-xs">
                  {isAr ? "زيارة" : "View"}
                </Button>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
