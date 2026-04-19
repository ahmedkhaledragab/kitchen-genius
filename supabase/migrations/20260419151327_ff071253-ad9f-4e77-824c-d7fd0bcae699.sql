-- 1. Threading: parent_comment_id on community_comments
ALTER TABLE public.community_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id uuid REFERENCES public.community_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_community_comments_parent ON public.community_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_post ON public.community_comments(post_id, created_at);

-- 2. Reactions table (multi-emoji)
DO $$ BEGIN
  CREATE TYPE public.reaction_type AS ENUM ('like', 'love', 'haha', 'wow', 'sad');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.community_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction public.reaction_type NOT NULL DEFAULT 'like',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_reactions_post ON public.community_reactions(post_id);

ALTER TABLE public.community_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reactions"
  ON public.community_reactions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can react"
  ON public.community_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND NOT public.is_community_banned(auth.uid()));

CREATE POLICY "Users can update own reaction"
  ON public.community_reactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reaction"
  ON public.community_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. Sync legacy community_likes into community_reactions for the existing UI counter
-- (likes_count column already maintained by triggers; we keep it as the authoritative count)
INSERT INTO public.community_reactions (post_id, user_id, reaction, created_at)
SELECT cl.post_id, cl.user_id, 'like'::public.reaction_type, cl.created_at
FROM public.community_likes cl
ON CONFLICT (post_id, user_id) DO NOTHING;

-- 4. Hashtags (denormalized for fast tag-page queries)
CREATE TABLE IF NOT EXISTS public.community_post_hashtags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_post_hashtags_tag ON public.community_post_hashtags(tag);

ALTER TABLE public.community_post_hashtags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view hashtags"
  ON public.community_post_hashtags FOR SELECT USING (true);

CREATE POLICY "Post owner manages hashtags"
  ON public.community_post_hashtags FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = post_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = post_id AND p.user_id = auth.uid()));

CREATE POLICY "Admins manage all hashtags"
  ON public.community_post_hashtags FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Add 'mention' to notification_type enum
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'mention';

-- 6. Trigger: when a comment has a parent_comment_id, also notify the parent comment owner
CREATE OR REPLACE FUNCTION public.notify_on_comment_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _parent_owner uuid;
BEGIN
  IF NEW.parent_comment_id IS NOT NULL THEN
    SELECT user_id INTO _parent_owner
    FROM public.community_comments
    WHERE id = NEW.parent_comment_id;

    IF _parent_owner IS NOT NULL AND _parent_owner <> NEW.user_id THEN
      INSERT INTO public.notifications (user_id, actor_id, type, post_id, comment_id)
      VALUES (_parent_owner, NEW.user_id, 'comment', NEW.post_id, NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_on_comment_reply ON public.community_comments;
CREATE TRIGGER trg_notify_on_comment_reply
AFTER INSERT ON public.community_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment_reply();

-- 7. Trending hashtags helper
CREATE OR REPLACE FUNCTION public.get_trending_hashtags(_limit integer DEFAULT 10)
RETURNS TABLE(tag text, posts_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT h.tag, COUNT(DISTINCT h.post_id)::bigint AS posts_count
  FROM public.community_post_hashtags h
  JOIN public.community_posts p ON p.id = h.post_id
  WHERE p.is_hidden = false
    AND h.created_at > now() - interval '14 days'
  GROUP BY h.tag
  ORDER BY posts_count DESC, h.tag ASC
  LIMIT _limit;
$function$;

-- 8. Suggested users helper (most followed creators that the viewer isn't following)
CREATE OR REPLACE FUNCTION public.get_suggested_users(_viewer_id uuid, _limit integer DEFAULT 5)
RETURNS TABLE(id uuid, display_name text, avatar_url text, bio text, followers_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    p.id,
    p.display_name,
    p.avatar_url,
    p.bio,
    COALESCE(f.followers_count, 0) AS followers_count
  FROM public.profiles p
  LEFT JOIN (
    SELECT following_id, COUNT(*)::bigint AS followers_count
    FROM public.user_follows
    GROUP BY following_id
  ) f ON f.following_id = p.id
  WHERE p.id <> _viewer_id
    AND NOT EXISTS (
      SELECT 1 FROM public.user_follows uf
      WHERE uf.follower_id = _viewer_id AND uf.following_id = p.id
    )
    AND p.is_active = true
  ORDER BY followers_count DESC NULLS LAST, p.created_at DESC
  LIMIT _limit;
$function$;