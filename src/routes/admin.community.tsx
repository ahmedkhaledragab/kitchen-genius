import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2, EyeOff, Eye, Ban, Check, Flag, Pin, PinOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/admin/community")({
  component: AdminCommunityPage,
});

interface AdminPost {
  id: string;
  user_id: string;
  post_type: "post" | "recipe";
  title: string | null;
  content: string;
  image_url: string | null;
  is_hidden: boolean;
  is_pinned: boolean;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author_name?: string | null;
  author_avatar?: string | null;
  author_email?: string | null;
}

interface AdminReport {
  id: string;
  reporter_id: string;
  post_id: string | null;
  comment_id: string | null;
  reason: string;
  status: "pending" | "reviewed" | "dismissed" | "actioned";
  created_at: string;
  reporter_name?: string | null;
  target_content?: string | null;
}

interface AdminBan {
  user_id: string;
  reason: string | null;
  created_at: string;
  display_name?: string | null;
  email?: string | null;
}

function AdminCommunityPage() {
  const { lang } = useLang();
  const isAr = lang === "ar";

  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [bans, setBans] = useState<AdminBan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadPosts(), loadReports(), loadBans()]);
    setLoading(false);
  }

  async function loadPosts() {
    const { data } = await supabase
      .from("community_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    const list = (data || []) as AdminPost[];
    const userIds = [...new Set(list.map((p) => p.user_id))];
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, email")
        .in("id", userIds);
      const map = Object.fromEntries((profs || []).map((p) => [p.id, p]));
      list.forEach((p) => {
        const a = map[p.user_id];
        if (a) {
          p.author_name = a.display_name;
          p.author_avatar = a.avatar_url;
          p.author_email = a.email;
        }
      });
    }
    setPosts(list);
  }

  async function loadReports() {
    const { data } = await supabase
      .from("community_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    const list = (data || []) as AdminReport[];

    const reporterIds = [...new Set(list.map((r) => r.reporter_id))];
    const postIds = list.filter((r) => r.post_id).map((r) => r.post_id!);
    const commentIds = list.filter((r) => r.comment_id).map((r) => r.comment_id!);

    const [profsRes, postsRes, commentsRes] = await Promise.all([
      reporterIds.length > 0
        ? supabase.from("profiles").select("id, display_name").in("id", reporterIds)
        : Promise.resolve({ data: [] }),
      postIds.length > 0
        ? supabase.from("community_posts").select("id, content").in("id", postIds)
        : Promise.resolve({ data: [] }),
      commentIds.length > 0
        ? supabase.from("community_comments").select("id, content").in("id", commentIds)
        : Promise.resolve({ data: [] }),
    ]);

    const profMap = Object.fromEntries((profsRes.data || []).map((p) => [p.id, p.display_name]));
    const postMap = Object.fromEntries((postsRes.data || []).map((p) => [p.id, p.content]));
    const commentMap = Object.fromEntries((commentsRes.data || []).map((c) => [c.id, c.content]));

    list.forEach((r) => {
      r.reporter_name = profMap[r.reporter_id];
      r.target_content = r.post_id ? postMap[r.post_id] : r.comment_id ? commentMap[r.comment_id] : null;
    });

    setReports(list);
  }

  async function loadBans() {
    const { data } = await supabase
      .from("community_bans")
      .select("*")
      .order("created_at", { ascending: false });
    const list = (data || []) as AdminBan[];
    const userIds = list.map((b) => b.user_id);
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", userIds);
      const map = Object.fromEntries((profs || []).map((p) => [p.id, p]));
      list.forEach((b) => {
        const p = map[b.user_id];
        if (p) {
          b.display_name = p.display_name;
          b.email = p.email;
        }
      });
    }
    setBans(list);
  }

  async function togglePostHidden(post: AdminPost) {
    const { error } = await supabase
      .from("community_posts")
      .update({ is_hidden: !post.is_hidden })
      .eq("id", post.id);
    if (error) return toast.error(error.message);
    toast.success(isAr ? "تم التحديث" : "Updated");
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, is_hidden: !p.is_hidden } : p)));
  }

  async function togglePin(post: AdminPost) {
    const { error } = await supabase
      .from("community_posts")
      .update({ is_pinned: !post.is_pinned })
      .eq("id", post.id);
    if (error) return toast.error(error.message);
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, is_pinned: !p.is_pinned } : p)));
  }

  async function deletePost(post: AdminPost) {
    if (!confirm(isAr ? "تأكيد الحذف؟" : "Confirm delete?")) return;
    const { error } = await supabase.from("community_posts").delete().eq("id", post.id);
    if (error) return toast.error(error.message);
    toast.success(isAr ? "تم الحذف" : "Deleted");
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
  }

  async function banUser(userId: string, reason: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("community_bans")
      .insert({ user_id: userId, banned_by: user.id, reason });
    if (error) return toast.error(error.message);
    toast.success(isAr ? "تم الحظر" : "Banned");
    void loadBans();
  }

  async function unbanUser(userId: string) {
    const { error } = await supabase.from("community_bans").delete().eq("user_id", userId);
    if (error) return toast.error(error.message);
    toast.success(isAr ? "تم الإلغاء" : "Unbanned");
    setBans((prev) => prev.filter((b) => b.user_id !== userId));
  }

  async function updateReportStatus(reportId: string, status: AdminReport["status"]) {
    const { error } = await supabase.from("community_reports").update({ status }).eq("id", reportId);
    if (error) return toast.error(error.message);
    setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status } : r)));
  }

  async function deleteReportTarget(report: AdminReport) {
    if (!confirm(isAr ? "حذف المحتوى المبلغ عنه؟" : "Delete reported content?")) return;
    if (report.post_id) {
      await supabase.from("community_posts").delete().eq("id", report.post_id);
    } else if (report.comment_id) {
      await supabase.from("community_comments").delete().eq("id", report.comment_id);
    }
    await updateReportStatus(report.id, "actioned");
    toast.success(isAr ? "تم الحذف" : "Deleted");
    void loadAll();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const pendingReports = reports.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold sm:text-2xl">{isAr ? "إدارة المجتمع" : "Community Moderation"}</h1>
        <p className="text-sm text-muted-foreground">
          {isAr ? "إدارة البوستات، البلاغات، والحظر" : "Manage posts, reports, and bans"}
        </p>
      </div>

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="rounded-xl">
          <TabsTrigger value="posts" className="rounded-lg">
            {isAr ? "البوستات" : "Posts"} ({posts.length})
          </TabsTrigger>
          <TabsTrigger value="reports" className="rounded-lg">
            {isAr ? "البلاغات" : "Reports"} {pendingReports > 0 && (
              <span className="ms-1.5 rounded-full bg-destructive px-1.5 text-[10px] text-destructive-foreground">
                {pendingReports}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="bans" className="rounded-lg">
            {isAr ? "المحظورين" : "Bans"} ({bans.length})
          </TabsTrigger>
        </TabsList>

        {/* POSTS */}
        <TabsContent value="posts" className="mt-4 space-y-3">
          {posts.length === 0 ? (
            <Card className="rounded-2xl p-6 text-center text-sm text-muted-foreground">
              {isAr ? "لا توجد بوستات" : "No posts yet"}
            </Card>
          ) : (
            posts.map((post) => (
              <Card
                key={post.id}
                className={`rounded-2xl p-4 ${post.is_hidden ? "border-destructive/40 bg-destructive/5" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    {post.author_avatar && <AvatarImage src={post.author_avatar} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {(post.author_name || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs">
                      <p className="font-bold">{post.author_name || "—"}</p>
                      <span className="text-muted-foreground">{post.author_email}</span>
                    </div>
                    {post.title && <p className="mt-1 text-sm font-bold">{post.title}</p>}
                    <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                      {post.content}
                    </p>
                    {post.image_url && (
                      <img src={post.image_url} alt="" className="mt-2 max-h-32 rounded-lg" />
                    )}
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>❤️ {post.likes_count}</span>
                      <span>💬 {post.comments_count}</span>
                      <span>{new Date(post.created_at).toLocaleDateString(isAr ? "ar-EG" : "en-US")}</span>
                      {post.is_hidden && (
                        <span className="rounded-full bg-destructive/20 px-2 py-0.5 font-bold text-destructive">
                          {isAr ? "مخفي" : "Hidden"}
                        </span>
                      )}
                      {post.is_pinned && (
                        <span className="rounded-full bg-primary/20 px-2 py-0.5 font-bold text-primary">
                          {isAr ? "مثبت" : "Pinned"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    onClick={() => togglePostHidden(post)}
                  >
                    {post.is_hidden ? <Eye className="me-1 h-3.5 w-3.5" /> : <EyeOff className="me-1 h-3.5 w-3.5" />}
                    {post.is_hidden ? (isAr ? "إظهار" : "Show") : (isAr ? "إخفاء" : "Hide")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    onClick={() => togglePin(post)}
                  >
                    {post.is_pinned ? <PinOff className="me-1 h-3.5 w-3.5" /> : <Pin className="me-1 h-3.5 w-3.5" />}
                    {post.is_pinned ? (isAr ? "إلغاء التثبيت" : "Unpin") : (isAr ? "تثبيت" : "Pin")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-lg text-destructive"
                    onClick={() => {
                      const reason = prompt(isAr ? "سبب الحظر (اختياري):" : "Ban reason (optional):");
                      if (reason !== null) banUser(post.user_id, reason);
                    }}
                  >
                    <Ban className="me-1 h-3.5 w-3.5" />
                    {isAr ? "حظر المستخدم" : "Ban user"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="rounded-lg"
                    onClick={() => deletePost(post)}
                  >
                    <Trash2 className="me-1 h-3.5 w-3.5" />
                    {isAr ? "حذف" : "Delete"}
                  </Button>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* REPORTS */}
        <TabsContent value="reports" className="mt-4 space-y-3">
          {reports.length === 0 ? (
            <Card className="rounded-2xl p-6 text-center text-sm text-muted-foreground">
              {isAr ? "لا توجد بلاغات" : "No reports"}
            </Card>
          ) : (
            reports.map((report) => (
              <Card key={report.id} className="rounded-2xl p-4">
                <div className="flex items-start gap-2">
                  <Flag className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold">{report.reporter_name || "—"}</span>
                      <span className="text-muted-foreground">
                        {new Date(report.created_at).toLocaleString(isAr ? "ar-EG" : "en-US")}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 font-bold ${
                          report.status === "pending"
                            ? "bg-amber-500/20 text-amber-700"
                            : report.status === "actioned"
                              ? "bg-emerald-500/20 text-emerald-700"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {report.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">
                      <strong>{isAr ? "السبب:" : "Reason:"}</strong> {report.reason}
                    </p>
                    {report.target_content && (
                      <div className="mt-2 rounded-lg bg-muted p-2 text-xs">
                        <p className="font-bold text-muted-foreground">
                          {report.post_id ? (isAr ? "البوست المبلغ عنه:" : "Reported post:") : (isAr ? "التعليق المبلغ عنه:" : "Reported comment:")}
                        </p>
                        <p className="mt-1 line-clamp-3">{report.target_content}</p>
                      </div>
                    )}
                  </div>
                </div>

                {report.status === "pending" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="rounded-lg"
                      onClick={() => deleteReportTarget(report)}
                    >
                      <Trash2 className="me-1 h-3.5 w-3.5" />
                      {isAr ? "حذف المحتوى" : "Delete content"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-lg"
                      onClick={() => updateReportStatus(report.id, "dismissed")}
                    >
                      <Check className="me-1 h-3.5 w-3.5" />
                      {isAr ? "رفض البلاغ" : "Dismiss"}
                    </Button>
                  </div>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        {/* BANS */}
        <TabsContent value="bans" className="mt-4 space-y-3">
          {bans.length === 0 ? (
            <Card className="rounded-2xl p-6 text-center text-sm text-muted-foreground">
              {isAr ? "لا يوجد محظورون" : "No bans"}
            </Card>
          ) : (
            bans.map((ban) => (
              <Card key={ban.user_id} className="rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold">{ban.display_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{ban.email}</p>
                    {ban.reason && <p className="mt-1 text-xs">{ban.reason}</p>}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {new Date(ban.created_at).toLocaleString(isAr ? "ar-EG" : "en-US")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    onClick={() => unbanUser(ban.user_id)}
                  >
                    {isAr ? "إلغاء الحظر" : "Unban"}
                  </Button>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
