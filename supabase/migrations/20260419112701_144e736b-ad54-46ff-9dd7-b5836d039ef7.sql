-- Notification type enum
CREATE TYPE public.notification_type AS ENUM ('like', 'comment', 'follow');

-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,           -- recipient
  actor_id uuid NOT NULL,          -- who caused it
  type public.notification_type NOT NULL,
  post_id uuid,
  comment_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id) WHERE is_read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications"
ON public.notifications FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Trigger: like notification
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _owner uuid;
BEGIN
  SELECT user_id INTO _owner FROM public.community_posts WHERE id = NEW.post_id;
  IF _owner IS NOT NULL AND _owner <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id)
    VALUES (_owner, NEW.user_id, 'like', NEW.post_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_like
AFTER INSERT ON public.community_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

-- Trigger: comment notification
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _owner uuid;
BEGIN
  SELECT user_id INTO _owner FROM public.community_posts WHERE id = NEW.post_id;
  IF _owner IS NOT NULL AND _owner <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id, comment_id)
    VALUES (_owner, NEW.user_id, 'comment', NEW.post_id, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_comment
AFTER INSERT ON public.community_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

-- Trigger: follow notification
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.follower_id <> NEW.following_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type)
    VALUES (NEW.following_id, NEW.follower_id, 'follow');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_follow
AFTER INSERT ON public.user_follows
FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();