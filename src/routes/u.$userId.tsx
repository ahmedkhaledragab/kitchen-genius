import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Share2, Heart, MessageCircle, ChefHat, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/u/$userId")({
  component: PublicProfilePage,
});

interface ProfileData {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

interface UserPost {
  id: string;
  post_type: "post" | "recipe";
  title: string | null;
  content: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

function PublicProfilePage() {
  const { userId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const isAr = lang === "ar";

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [stats, setStats] = useState({ posts: 0, recipes: 0, likes: 0 });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, user]);

  async function load() {
    setLoading(true);
    setNotFound(false);

    const { data: prof } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, bio, created_at")
      .eq("id", userId)
      .maybeSingle();

    if (!prof) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setProfile(prof as ProfileData);

    const { data: postsData } = await supabase
      .from("community_posts")
      .select("id, post_type, title, content, image_url, likes_count, comments_count, created_at")
      .eq("user_id", userId)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(50);

    const list = (postsData || []) as UserPost[];
    setPosts(list);

    const totalLikes = list.reduce((sum, p) => sum + (p.likes_count || 0), 0);
    const recipesCount = list.filter((p) => p.post_type === "recipe").length;
    setStats({
      posts: list.length,
      recipes: recipesCount,
      likes: totalLikes,
    });

    setLoading(false);
  }

  async function handleShare() {
    const url = `${window.location.origin}/u/${userId}`;
    const name = profile?.display_name || (isAr ? "مستخدم" : "User");
    const shareText = isAr
      ? `شوفي بروفايل ${name} في مجتمع المطبخ 🍳`
      : `Check out ${name}'s profile on Kitchen Community 🍳`;

    if (navigator.share) {
      try {
        await navigator.share({ title: name, text: shareText, url });
        return;
      } catch {
        // user cancelled, fallback below
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success(isAr ? "تم نسخ الرابط 💕" : "Link copied 💕");
    } catch {
      toast.error(isAr ? "تعذر النسخ" : "Could not copy");
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <Card className="rounded-3xl p-8">
          <p className="text-sm text-muted-foreground">
            {isAr ? "البروفايل ده مش موجود" : "Profile not found"}
          </p>
          <Button asChild className="mt-4 rounded-xl">
            <Link to="/community">{isAr ? "رجوع للمجتمع" : "Back to community"}</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const joinDate = new Date(profile.created_at).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "long",
  });
  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-20 pt-4">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="mb-2 rounded-xl text-muted-foreground hover:text-foreground"
      >
        <Link to="/community">
          <BackIcon className="me-1 h-4 w-4" />
          {isAr ? "المجتمع" : "Community"}
        </Link>
      </Button>

      {/* Profile header */}
      <Card className="overflow-hidden rounded-3xl shadow-soft">
        <div className="h-20 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />
        <div className="px-6 pb-6">
          <div className="-mt-10 flex items-end justify-between">
            <Avatar className="h-20 w-20 border-4 border-card shadow-md">
              {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                {(profile.display_name || "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={handleShare}
            >
              <Share2 className="me-1 h-3.5 w-3.5" />
              {isAr ? "مشاركة" : "Share"}
            </Button>
          </div>

          <div className="mt-3">
            <h1 className="text-xl font-extrabold">
              {profile.display_name || (isAr ? "مستخدم" : "User")}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isAr ? "انضم في" : "Joined"} {joinDate}
            </p>
            {profile.bio && (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{profile.bio}</p>
            )}
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <StatBox icon="📝" value={stats.posts} label={isAr ? "بوست" : "Posts"} />
            <StatBox icon="🍳" value={stats.recipes} label={isAr ? "وصفة" : "Recipes"} />
            <StatBox icon="❤️" value={stats.likes} label={isAr ? "إعجاب" : "Likes"} />
          </div>
        </div>
      </Card>

      {/* Posts list */}
      <h2 className="mb-2 mt-6 text-base font-extrabold">
        {isAr ? "كل البوستات" : "All posts"}
      </h2>

      {posts.length === 0 ? (
        <Card className="rounded-3xl border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          {isAr ? "لسه ما نشرش حاجة" : "No posts yet"}
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <Card key={post.id} className="overflow-hidden rounded-2xl shadow-soft">
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      post.post_type === "recipe"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {post.post_type === "recipe"
                      ? isAr
                        ? "وصفة"
                        : "Recipe"
                      : isAr
                        ? "بوست"
                        : "Post"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(post.created_at).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                {post.title && (
                  <p className="mt-2 text-sm font-bold">
                    {post.post_type === "recipe" && (
                      <ChefHat className="me-1 inline h-3.5 w-3.5 text-primary" />
                    )}
                    {post.title}
                  </p>
                )}
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {post.content}
                </p>
              </div>
              {post.image_url && (
                <img
                  src={post.image_url}
                  alt=""
                  className="max-h-64 w-full object-cover"
                  loading="lazy"
                />
              )}
              <div className="flex items-center gap-4 border-t px-4 py-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5" />
                  {post.likes_count}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {post.comments_count}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatBox({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-muted/40 p-3 text-center">
      <p className="text-lg">{icon}</p>
      <p className="text-base font-extrabold leading-none">{value}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
