import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Inbox,
  Mail,
  Phone,
  Search,
  Loader2,
  Trash2,
  Reply,
  CheckCircle2,
  Archive,
  RefreshCw,
  UserCircle2,
  ShieldCheck,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ar as arLocale } from "date-fns/locale";

import { useLang } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/messages")({
  component: AdminMessagesPage,
});

type MessageStatus = "new" | "read" | "replied" | "archived";

type AccountProfile = {
  id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  is_active: boolean;
};

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: MessageStatus;
  admin_notes: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_META: Record<
  MessageStatus,
  { ar: string; en: string; className: string }
> = {
  new: {
    ar: "جديدة",
    en: "New",
    className: "bg-primary/15 text-primary border-primary/30",
  },
  read: {
    ar: "مقروءة",
    en: "Read",
    className: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  },
  replied: {
    ar: "تم الرد",
    en: "Replied",
    className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  },
  archived: {
    ar: "مؤرشفة",
    en: "Archived",
    className: "bg-muted text-muted-foreground border-border",
  },
};

function AdminMessagesPage() {
  const { lang } = useLang();
  const ar = lang === "ar";

  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, AccountProfile>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MessageStatus | "all">(
    "all",
  );
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ContactMessage | null>(
    null,
  );

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      toast.error(ar ? "فشل تحميل الرسائل" : "Failed to load messages");
      setLoading(false);
      return;
    }
    const list = (data ?? []) as ContactMessage[];
    setMessages(list);

    // Fetch linked account profiles
    const userIds = Array.from(
      new Set(list.map((m) => m.user_id).filter((id): id is string => !!id)),
    );
    if (userIds.length > 0) {
      const { data: profs, error: profErr } = await supabase
        .from("profiles")
        .select("id, display_name, email, phone, avatar_url, created_at, is_active")
        .in("id", userIds);
      if (!profErr && profs) {
        const map: Record<string, AccountProfile> = {};
        (profs as AccountProfile[]).forEach((p) => {
          map[p.id] = p;
        });
        setProfiles(map);
      }
    } else {
      setProfiles({});
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
    // realtime subscription for new messages
    const channel = supabase
      .channel("contact_messages_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contact_messages" },
        () => fetchMessages(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return messages.filter((m) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.phone ?? "").toLowerCase().includes(q) ||
        m.message.toLowerCase().includes(q)
      );
    });
  }, [messages, search, statusFilter]);

  const counts = useMemo(() => {
    const base = { all: messages.length, new: 0, read: 0, replied: 0, archived: 0 };
    for (const m of messages) base[m.status]++;
    return base;
  }, [messages]);

  const updateStatus = async (id: string, status: MessageStatus) => {
    const { error } = await supabase
      .from("contact_messages")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast.error(ar ? "فشل التحديث" : "Update failed");
    } else {
      toast.success(ar ? "اتحدّثت الحالة" : "Status updated");
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status } : m)),
      );
      if (selected?.id === id) setSelected({ ...selected, status });
    }
  };

  const openMessage = async (m: ContactMessage) => {
    setSelected(m);
    setNotes(m.admin_notes ?? "");
    if (m.status === "new") await updateStatus(m.id, "read");
  };

  const saveNotes = async () => {
    if (!selected) return;
    setSavingNotes(true);
    const { error } = await supabase
      .from("contact_messages")
      .update({ admin_notes: notes })
      .eq("id", selected.id);
    setSavingNotes(false);
    if (error) {
      toast.error(ar ? "فشل حفظ الملاحظات" : "Failed to save notes");
    } else {
      toast.success(ar ? "اتحفظت الملاحظات" : "Notes saved");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === selected.id ? { ...m, admin_notes: notes } : m,
        ),
      );
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase
      .from("contact_messages")
      .delete()
      .eq("id", confirmDelete.id);
    if (error) {
      toast.error(ar ? "فشل الحذف" : "Delete failed");
    } else {
      toast.success(ar ? "اتحذفت الرسالة" : "Message deleted");
      setMessages((prev) => prev.filter((m) => m.id !== confirmDelete.id));
      if (selected?.id === confirmDelete.id) setSelected(null);
    }
    setConfirmDelete(null);
  };

  const replyMailto = (m: ContactMessage) => {
    const subject = encodeURIComponent(
      ar ? `رد على رسالتك` : `Re: Your message`,
    );
    const body = encodeURIComponent(
      `\n\n---\n${ar ? "رسالتك الأصلية:" : "Your original message:"}\n${m.message}`,
    );
    window.location.href = `mailto:${m.email}?subject=${subject}&body=${body}`;
    if (m.status !== "replied") updateStatus(m.id, "replied");
  };

  const formatTime = (iso: string) => {
    try {
      return formatDistanceToNow(new Date(iso), {
        addSuffix: true,
        locale: ar ? arLocale : undefined,
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Inbox className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-extrabold sm:text-2xl">
              {ar ? "الرسائل الواردة" : "Inbox"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {ar
                ? "كل الرسائل اللي بتيجي من نموذج التواصل"
                : "All messages from the contact form"}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchMessages}
          disabled={loading}
          className="rounded-full"
        >
          <RefreshCw className={`me-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {ar ? "تحديث" : "Refresh"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {(
          [
            { key: "all", label: ar ? "الكل" : "All" },
            { key: "new", label: ar ? "جديدة" : "New" },
            { key: "read", label: ar ? "مقروءة" : "Read" },
            { key: "replied", label: ar ? "تم الرد" : "Replied" },
            { key: "archived", label: ar ? "مؤرشفة" : "Archived" },
          ] as const
        ).map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setStatusFilter(s.key)}
            className={[
              "rounded-2xl border p-3 text-start transition",
              statusFilter === s.key
                ? "border-primary bg-primary/5 shadow-soft"
                : "border-border/60 bg-card hover:bg-muted/50",
            ].join(" ")}
          >
            <p className="text-xs font-semibold text-muted-foreground">
              {s.label}
            </p>
            <p className="mt-1 text-lg font-black">
              {counts[s.key as keyof typeof counts]}
            </p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card className="rounded-2xl border-border/60 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground start-3" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={ar ? "ابحثي بالاسم، الإيميل، أو نص الرسالة" : "Search name, email, message"}
              className="rounded-xl ps-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as MessageStatus | "all")}
          >
            <SelectTrigger className="rounded-xl sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? "كل الحالات" : "All statuses"}</SelectItem>
              <SelectItem value="new">{STATUS_META.new[ar ? "ar" : "en"]}</SelectItem>
              <SelectItem value="read">{STATUS_META.read[ar ? "ar" : "en"]}</SelectItem>
              <SelectItem value="replied">{STATUS_META.replied[ar ? "ar" : "en"]}</SelectItem>
              <SelectItem value="archived">{STATUS_META.archived[ar ? "ar" : "en"]}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* List */}
      {loading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-3xl border-dashed p-10 text-center">
          <Inbox className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">
            {ar ? "مفيش رسائل هنا لسه" : "No messages here yet"}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => {
            const meta = STATUS_META[m.status];
            const acc = m.user_id ? profiles[m.user_id] : null;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => openMessage(m)}
                className="block w-full text-start"
              >
                <Card
                  className={[
                    "rounded-2xl border-border/60 p-4 transition hover:shadow-soft",
                    m.status === "new" ? "ring-1 ring-primary/30" : "",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-extrabold">{m.name}</p>
                        <Badge variant="outline" className={`text-[10px] ${meta.className}`}>
                          {meta[ar ? "ar" : "en"]}
                        </Badge>
                        {acc ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-700"
                          >
                            <ShieldCheck className="me-0.5 h-3 w-3" />
                            {ar ? "حساب مسجّل" : "Registered"}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            {ar ? "زائر" : "Guest"}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {m.email}
                        {m.phone ? ` · ${m.phone}` : ""}
                      </p>
                      <p className="mt-2 line-clamp-2 text-xs text-foreground/80">
                        {m.message}
                      </p>
                    </div>
                    <p className="shrink-0 text-[10px] text-muted-foreground">
                      {formatTime(m.created_at)}
                    </p>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-3xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  <span>{selected.name}</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${STATUS_META[selected.status].className}`}
                  >
                    {STATUS_META[selected.status][ar ? "ar" : "en"]}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <a
                    href={`mailto:${selected.email}`}
                    className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {selected.email}
                  </a>
                  {selected.phone && (
                    <a
                      href={`tel:${selected.phone}`}
                      className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {selected.phone}
                    </a>
                  )}
                  <span>· {formatTime(selected.created_at)}</span>
                </div>

                <Card className="rounded-2xl bg-muted/40 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {selected.message}
                  </p>
                </Card>

                {/* Account info — only when message was sent by a logged-in user */}
                {selected.user_id && (() => {
                  const acc = profiles[selected.user_id];
                  return (
                    <Card className="rounded-2xl border-emerald-500/30 bg-emerald-500/5 p-4">
                      <div className="mb-3 flex items-center gap-1.5 text-xs font-extrabold text-emerald-700">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {ar ? "بيانات الحساب المسجّل" : "Registered account info"}
                      </div>
                      {acc ? (
                        <div className="flex items-start gap-3">
                          {acc.avatar_url ? (
                            <img
                              src={acc.avatar_url}
                              alt={acc.display_name ?? "user"}
                              className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-emerald-500/30"
                            />
                          ) : (
                            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-700">
                              <UserCircle2 className="h-7 w-7" />
                            </span>
                          )}
                          <div className="min-w-0 flex-1 space-y-1.5 text-xs">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-extrabold">
                                {acc.display_name || (ar ? "بدون اسم" : "No name")}
                              </p>
                              {!acc.is_active && (
                                <Badge
                                  variant="outline"
                                  className="border-destructive/40 bg-destructive/10 text-[10px] text-destructive"
                                >
                                  {ar ? "محظور" : "Banned"}
                                </Badge>
                              )}
                            </div>
                            {acc.email && (
                              <a
                                href={`mailto:${acc.email}`}
                                className="flex items-center gap-1.5 font-semibold text-primary hover:underline"
                              >
                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{acc.email}</span>
                              </a>
                            )}
                            {acc.phone && (
                              <a
                                href={`tel:${acc.phone}`}
                                className="flex items-center gap-1.5 font-semibold text-primary hover:underline"
                              >
                                <Phone className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate" dir="ltr">{acc.phone}</span>
                              </a>
                            )}
                            <p className="flex items-center gap-1.5 text-muted-foreground">
                              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                              {ar ? "اشترك" : "Joined"} {formatTime(acc.created_at)}
                            </p>
                            <p className="text-[10px] text-muted-foreground/80" dir="ltr">
                              ID: {acc.id}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {ar
                            ? "الحساب اتحذف أو مش متاح."
                            : "Account no longer available."}
                        </p>
                      )}
                    </Card>
                  );
                })()}

                <div>
                  <label className="text-xs font-bold">
                    {ar ? "ملاحظات داخلية (للأدمن فقط)" : "Internal notes (admin only)"}
                  </label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder={ar ? "اكتبي ملاحظاتك هنا..." : "Write your notes..."}
                    className="mt-1.5 rounded-xl"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={saveNotes}
                    disabled={savingNotes || notes === (selected.admin_notes ?? "")}
                    className="mt-2 rounded-full"
                  >
                    {savingNotes && <Loader2 className="me-1 h-3.5 w-3.5 animate-spin" />}
                    {ar ? "حفظ الملاحظات" : "Save notes"}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => replyMailto(selected)}
                    className="rounded-full gradient-primary text-primary-foreground"
                  >
                    <Reply className="me-1.5 h-4 w-4" />
                    {ar ? "رد بالإيميل" : "Reply via email"}
                  </Button>
                  {selected.status !== "replied" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => updateStatus(selected.id, "replied")}
                      className="rounded-full"
                    >
                      <CheckCircle2 className="me-1.5 h-4 w-4" />
                      {ar ? "علّمها كـ تم الرد" : "Mark as replied"}
                    </Button>
                  )}
                  {selected.status !== "archived" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => updateStatus(selected.id, "archived")}
                      className="rounded-full"
                    >
                      <Archive className="me-1.5 h-4 w-4" />
                      {ar ? "أرشفة" : "Archive"}
                    </Button>
                  )}
                </div>
              </div>

              <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setConfirmDelete(selected)}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="me-1.5 h-4 w-4" />
                  {ar ? "حذف" : "Delete"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelected(null)}
                  className="rounded-full"
                >
                  {ar ? "إغلاق" : "Close"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {ar ? "متأكدة إنك عايزة تحذفي الرسالة؟" : "Delete this message?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {ar
                ? "الإجراء ده مش هينفع تراجعي عنه."
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">
              {ar ? "إلغاء" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {ar ? "احذفي" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
