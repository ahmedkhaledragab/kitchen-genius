-- Follow system
CREATE TABLE public.user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE INDEX idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON public.user_follows(following_id);

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view follows"
ON public.user_follows
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can follow as themselves"
ON public.user_follows
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = follower_id AND follower_id <> following_id);

CREATE POLICY "Users can unfollow themselves"
ON public.user_follows
FOR DELETE
TO authenticated
USING (auth.uid() = follower_id);

-- Top creators function (signed-in users)
CREATE OR REPLACE FUNCTION public.get_top_creators(_limit integer DEFAULT 50)
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar_url text,
  bio text,
  posts_count bigint,
  likes_count bigint,
  followers_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.display_name,
    p.avatar_url,
    p.bio,
    COALESCE(stats.posts_count, 0) AS posts_count,
    COALESCE(stats.likes_count, 0) AS likes_count,
    COALESCE(f.followers_count, 0) AS followers_count
  FROM public.profiles p
  LEFT JOIN (
    SELECT user_id,
           COUNT(*)::bigint AS posts_count,
           COALESCE(SUM(likes_count), 0)::bigint AS likes_count
    FROM public.community_posts
    WHERE is_hidden = false
    GROUP BY user_id
  ) stats ON stats.user_id = p.id
  LEFT JOIN (
    SELECT following_id, COUNT(*)::bigint AS followers_count
    FROM public.user_follows
    GROUP BY following_id
  ) f ON f.following_id = p.id
  WHERE COALESCE(stats.posts_count, 0) > 0
  ORDER BY likes_count DESC, posts_count DESC, followers_count DESC
  LIMIT _limit;
$$;