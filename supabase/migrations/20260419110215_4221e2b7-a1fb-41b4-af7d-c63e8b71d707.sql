
-- Community posts table
CREATE TYPE public.community_post_type AS ENUM ('recipe', 'post');
CREATE TYPE public.report_status AS ENUM ('pending', 'reviewed', 'dismissed', 'actioned');

CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_type public.community_post_type NOT NULL DEFAULT 'post',
  title text,
  content text NOT NULL,
  image_url text,
  recipe_data jsonb,
  is_hidden boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_community_posts_created ON public.community_posts(created_at DESC) WHERE is_hidden = false;
CREATE INDEX idx_community_posts_user ON public.community_posts(user_id);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

-- Community comments
CREATE TABLE public.community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_community_comments_post ON public.community_comments(post_id, created_at);
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

-- Community likes
CREATE TABLE public.community_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX idx_community_likes_user ON public.community_likes(user_id);
ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;

-- Community saves
CREATE TABLE public.community_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX idx_community_saves_user ON public.community_saves(user_id);
ALTER TABLE public.community_saves ENABLE ROW LEVEL SECURITY;

-- Reports
CREATE TABLE public.community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.community_comments(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status public.report_status NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((post_id IS NOT NULL) OR (comment_id IS NOT NULL))
);

CREATE INDEX idx_community_reports_status ON public.community_reports(status, created_at DESC);
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;

-- User bans (community-specific)
CREATE TABLE public.community_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  banned_by uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.community_bans ENABLE ROW LEVEL SECURITY;

-- Helper function: is user banned from community
CREATE OR REPLACE FUNCTION public.is_community_banned(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.community_bans WHERE user_id = _user_id)
$$;

-- ===== RLS POLICIES =====

-- community_posts policies
CREATE POLICY "Anyone can view non-hidden posts"
  ON public.community_posts FOR SELECT
  USING (is_hidden = false OR user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated non-banned users can create posts"
  ON public.community_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT public.is_community_banned(auth.uid())
  );

CREATE POLICY "Users can update own posts"
  ON public.community_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON public.community_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any post"
  ON public.community_posts FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any post"
  ON public.community_posts FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- community_comments policies
CREATE POLICY "Anyone can view non-hidden comments"
  ON public.community_comments FOR SELECT
  USING (is_hidden = false OR user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated non-banned users can comment"
  ON public.community_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT public.is_community_banned(auth.uid())
  );

CREATE POLICY "Users can update own comments"
  ON public.community_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.community_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all comments"
  ON public.community_comments FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- community_likes policies
CREATE POLICY "Anyone can view likes"
  ON public.community_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like"
  ON public.community_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND NOT public.is_community_banned(auth.uid()));

CREATE POLICY "Users can unlike own"
  ON public.community_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- community_saves policies
CREATE POLICY "Users view own saves"
  ON public.community_saves FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save"
  ON public.community_saves FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave"
  ON public.community_saves FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- community_reports policies
CREATE POLICY "Authenticated users can report"
  ON public.community_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users view own reports"
  ON public.community_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage reports"
  ON public.community_reports FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- community_bans policies
CREATE POLICY "Anyone authenticated can check bans (limited)"
  ON public.community_bans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage bans"
  ON public.community_bans FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- ===== TRIGGERS =====

-- Update timestamps
CREATE TRIGGER update_community_posts_updated_at
  BEFORE UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_community_comments_updated_at
  BEFORE UPDATE ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_community_reports_updated_at
  BEFORE UPDATE ON public.community_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Increment / decrement likes counter
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_update_post_likes_count
  AFTER INSERT OR DELETE ON public.community_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

-- Increment / decrement comments counter
CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_update_post_comments_count
  AFTER INSERT OR DELETE ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();

-- Storage bucket for community post images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('community-posts', 'community-posts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view community images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'community-posts');

CREATE POLICY "Authenticated users upload community images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'community-posts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own community images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'community-posts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
