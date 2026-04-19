import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Heart, MessageCircle, UserPlus, Check, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NotificationRow {
  id: string;
  actor_id: string;
  type: "like" | "comment" | "follow";
  post_id: string | null;
  is_read: boolean;
  created_at: string;
}

interface ActorProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function NotificationsBell() {
  const { user } = useAuth();
  const { lang } = useLang();
  const isAr = lang === "ar";

  const [items, setItems] = useState<NotificationRow[]>([]);
  const [actors, setActors] = useState<Record<string, ActorProfile>>({});
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const unread = items.filter((i) => !i.is_read).length;

  useEffect(() => {
    if (!user) return;
    void load();
    // realtime subscribe
    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void load();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("id, actor_id, type, post_id, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    const list = (data || []) as NotificationRow[];
    setItems(list);

    const actorIds = Array.from(new Set(list.map((n) => n.actor_id)));
    if (actorIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", actorIds);
      const map: Record<string, ActorProfile> = {};
      (profs || []).forEach((p) => {
        map[p.id] = p as ActorProfile;
      });
      setActors(map);
    }
    setLoading(false);
  }

  async function markAllRead() {
    if (!user || unread === 0) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setItems((arr) => arr.map((i) => ({ ...i, is_read: true })));
  }

  async function handleOpen(o: boolean) {
    setOpen(o);
    if (o && unread > 0) {
      // mark read shortly after open
      setTimeout(() => {
        void markAllRead();
      }, 800);
    }
  }

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="relative rounded-xl px-2"
          aria-label={isAr ? "الإشعارات" : "Notifications"}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -end-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={isAr ? "start" : "end"}
        className="w-80 rounded-2xl p-0"
      >
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-extrabold">
            {isAr ? "الإشعارات" : "Notifications"}
          </p>
          {unread > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 rounded-lg text-[11px]"
              onClick={markAllRead}
            >
              <Check className="me-1 h-3 w-3" />
              {isAr ? "تعليم الكل كمقروء" : "Mark all read"}
            </Button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              {isAr ? "لسه مفيش إشعارات 🌸" : "No notifications yet 🌸"}
            </p>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <NotificationItem
                  key={n.id}
                  n={n}
                  actor={actors[n.actor_id]}
                  isAr={isAr}
                  onClick={() => setOpen(false)}
                />
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NotificationItem({
  n,
  actor,
  isAr,
  onClick,
}: {
  n: NotificationRow;
  actor?: ActorProfile;
  isAr: boolean;
  onClick: () => void;
}) {
  const name = actor?.display_name || (isAr ? "مستخدم" : "Someone");
  const Icon = n.type === "like" ? Heart : n.type === "comment" ? MessageCircle : UserPlus;
  const text =
    n.type === "like"
      ? isAr
        ? "لايّك بوستك ❤️"
        : "liked your post ❤️"
      : n.type === "comment"
        ? isAr
          ? "علّق على بوستك 💬"
          : "commented on your post 💬"
        : isAr
          ? "بدأ يتابعك ✨"
          : "started following you ✨";

  const target = n.type === "follow"
    ? { to: "/u/$userId" as const, params: { userId: n.actor_id } }
    : { to: "/community" as const };

  const time = new Date(n.created_at).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <li>
      <Link
        {...target}
        onClick={onClick}
        className={`flex items-start gap-3 px-3 py-2.5 transition hover:bg-muted/50 ${
          !n.is_read ? "bg-primary/5" : ""
        }`}
      >
        <div className="relative">
          <Avatar className="h-9 w-9">
            {actor?.avatar_url && <AvatarImage src={actor.avatar_url} />}
            <AvatarFallback className="bg-primary/10 text-xs text-primary">
              {name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-1 -end-1 grid h-4 w-4 place-items-center rounded-full bg-primary text-primary-foreground">
            <Icon className="h-2.5 w-2.5" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs leading-snug">
            <span className="font-bold">{name}</span>{" "}
            <span className="text-muted-foreground">{text}</span>
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{time}</p>
        </div>
        {!n.is_read && (
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
        )}
      </Link>
    </li>
  );
}
