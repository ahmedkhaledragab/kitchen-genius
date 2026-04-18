import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  MessageCircle,
  Facebook,
  Instagram,
  Send,
  Loader2,
  Phone,
  Globe,
  Music2,
  Twitter,
} from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePageContent, type PageItem } from "@/hooks/usePageContent";

const DEFAULT_EMAIL = "hello@menelyandak.app";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "تواصلي معانا — من اللي عندك؟" },
      {
        name: "description",
        content:
          "ابعتيلنا أي سؤال، اقتراح، أو شكوى. إحنا دايماً هنا علشانك على الإيميل والسوشيال ميديا.",
      },
      { property: "og:title", content: "تواصلي معانا — من اللي عندك؟" },
      {
        property: "og:description",
        content: "تواصلي مع فريقنا — هنرد عليكي بأسرع وقت 💕",
      },
    ],
  }),
  component: ContactPage,
});

function pickIcon(title?: string) {
  const t = (title ?? "").toLowerCase();
  if (t.includes("face")) return { Icon: Facebook, color: "text-[#1877F2] bg-[#1877F2]/10" };
  if (t.includes("insta")) return { Icon: Instagram, color: "text-[#d62976] bg-[#d62976]/10" };
  if (t.includes("whats") || t.includes("واتس"))
    return { Icon: MessageCircle, color: "text-[#25D366] bg-[#25D366]/10" };
  if (t.includes("tiktok") || t.includes("تيك"))
    return { Icon: Music2, color: "text-foreground bg-foreground/10" };
  if (t.includes("telegram") || t.includes("تيلي") || t.includes("تليجرام"))
    return { Icon: Send, color: "text-[#229ED9] bg-[#229ED9]/10" };
  if (t.includes("twitter") || t.includes("x.com") || t === "x" || t.includes("تويتر"))
    return { Icon: Twitter, color: "text-foreground bg-foreground/10" };
  if (t.includes("mail") || t.includes("إيميل") || t.includes("بريد"))
    return { Icon: Mail, color: "text-primary bg-primary/10" };
  if (t.includes("phone") || t.includes("tel") || t.includes("هاتف") || t.includes("تليفون"))
    return { Icon: Phone, color: "text-emerald-600 bg-emerald-500/10" };
  return { Icon: Globe, color: "text-muted-foreground bg-muted" };
}

function buildWhatsAppHref(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  const digits = v.replace(/\D/g, "");
  if (digits.length < 6) return null;
  return `https://wa.me/${digits}`;
}

function prettyHandle(url: string): string {
  return url
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");
}

function ContactPage() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const { content } = usePageContent("contact");
  const { settings } = useSiteSettings();
  const { user } = useAuth();

  const contactEmail = settings.contact_email || content.contact_email || DEFAULT_EMAIL;

  const heroBadge = content.hero_badge ?? (ar ? "إحنا هنا" : "We're here");
  const heroTitle = content.hero_title ?? (ar ? "تواصلي معانا 💌" : "Get in touch 💌");
  const heroSub =
    content.hero_sub ??
    (ar
      ? "أي سؤال، اقتراح، أو حتى مجرد سلام — يسعدنا نسمع منك. اختاري الطريقة اللي تناسبك."
      : "Any question, suggestion, or just a hello — we'd love to hear from you. Pick whatever works for you.");

  const formTitle = content.form_title ?? (ar ? "ابعتيلنا رسالة 💕" : "Send us a message 💕");
  const formSub =
    content.form_sub ??
    (ar ? "املي البيانات وهنرد عليكي بأقرب وقت." : "Fill in your details and we'll reply soon.");

  // Build channels from site_settings (admin-managed). Each channel only shows if its URL is set.
  const facebookUrl = settings.facebook_url?.trim() || "";
  const instagramUrl = settings.instagram_url?.trim() || "";
  const whatsappHref = settings.whatsapp_url ? buildWhatsAppHref(settings.whatsapp_url) : null;
  const tiktokUrl = settings.tiktok_url?.trim() || "";
  const telegramUrl = settings.telegram_url?.trim() || "";
  const twitterUrl = settings.twitter_url?.trim() || "";

  const autoChannels: PageItem[] = [
    { title: ar ? "الإيميل" : "Email", desc: contactEmail, icon: `mailto:${contactEmail}` },
    ...(facebookUrl
      ? [{ title: "Facebook", desc: prettyHandle(facebookUrl), icon: facebookUrl }]
      : []),
    ...(instagramUrl
      ? [{ title: "Instagram", desc: prettyHandle(instagramUrl), icon: instagramUrl }]
      : []),
    ...(whatsappHref
      ? [
          {
            title: ar ? "واتساب" : "WhatsApp",
            desc: prettyHandle(whatsappHref),
            icon: whatsappHref,
          },
        ]
      : []),
    ...(tiktokUrl
      ? [{ title: "TikTok", desc: prettyHandle(tiktokUrl), icon: tiktokUrl }]
      : []),
    ...(telegramUrl
      ? [
          {
            title: ar ? "تيليجرام" : "Telegram",
            desc: prettyHandle(telegramUrl),
            icon: telegramUrl,
          },
        ]
      : []),
    ...(twitterUrl
      ? [{ title: "Twitter", desc: prettyHandle(twitterUrl), icon: twitterUrl }]
      : []),
  ];

  // Admin can override via pages_content.channels; otherwise use auto from site_settings.
  const channels =
    content.channels && content.channels.length > 0 ? content.channels : autoChannels;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      toast.error(ar ? "املي كل الخانات يا قمر 🌸" : "Fill in all fields lovely 🌸");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error(ar ? "الإيميل مش صحيح 📧" : "Invalid email 📧");
      return;
    }
    if (trimmedPhone && !/^[\d+\-\s()]{6,20}$/.test(trimmedPhone)) {
      toast.error(ar ? "رقم الهاتف مش صحيح 📞" : "Invalid phone number 📞");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("contact_messages").insert({
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone || null,
        message: trimmedMessage,
        user_id: user?.id ?? null,
      });
      if (error) throw error;
      toast.success(
        ar
          ? "وصلتنا رسالتك بأمان 💕 هنرد عليكي في أقرب وقت"
          : "Got your message safely 💕 We'll reply soon",
      );
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch (err) {
      console.error("contact_messages insert failed", err);
      toast.error(
        ar ? "حصل خطأ، جرّبي تاني بعد لحظات 🙏" : "Something went wrong, try again 🙏",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-6 sm:pt-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl gradient-hero p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-card/70 px-3 py-1 text-xs font-semibold text-primary backdrop-blur">
            <MessageCircle className="h-3.5 w-3.5" />
            {heroBadge}
          </div>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
            <span className="gradient-text">{heroTitle}</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {heroSub}
          </p>
        </motion.div>
      </section>

      {/* Channels */}
      {content.channels_title && (
        <h2 className="mt-6 text-lg font-extrabold sm:text-xl">{content.channels_title}</h2>
      )}
      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {channels.map((c, i) => {
          const href = c.icon || ""; // we store href in `icon` field
          const { Icon, color } = pickIcon(c.title);
          const isExternal = href.startsWith("http");
          const CardInner = (
            <Card className="h-full rounded-3xl border-border/60 bg-card p-5 shadow-card transition-all group-hover:-translate-y-0.5 group-hover:shadow-warm">
              <div className={`grid h-10 w-10 place-items-center rounded-2xl ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-sm font-extrabold">{c.title}</h3>
              <p className="mt-0.5 truncate text-xs font-semibold text-foreground/70">
                {c.desc}
              </p>
            </Card>
          );
          if (!href) {
            return (
              <div key={`${c.title}-${i}`} className="group block">
                {CardInner}
              </div>
            );
          }
          return (
            <a
              key={`${c.title}-${i}`}
              href={href}
              target={isExternal ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="group block no-underline"
            >
              {CardInner}
            </a>
          );
        })}
      </section>

      {/* Form */}
      <Card className="mt-6 rounded-3xl border-border/60 bg-card p-6 shadow-card sm:p-8">
        <h2 className="text-xl font-extrabold sm:text-2xl">{formTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{formSub}</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="text-sm font-bold">{ar ? "الاسم" : "Name"}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={ar ? "اسمك الحلو" : "Your lovely name"}
              className="mt-1.5 rounded-xl"
            />
          </div>
          <div>
            <label className="text-sm font-bold">{ar ? "الإيميل" : "Email"}</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1.5 rounded-xl"
            />
          </div>
          <div>
            <label className="text-sm font-bold">
              {ar ? "رقم الهاتف" : "Phone"}{" "}
              <span className="font-normal text-muted-foreground">
                ({ar ? "اختياري" : "optional"})
              </span>
            </label>
            <Input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={ar ? "مثال: 010xxxxxxxx" : "e.g. +20 10xxxxxxxx"}
              maxLength={20}
              className="mt-1.5 rounded-xl"
            />
          </div>
          <div>
            <label className="text-sm font-bold">{ar ? "رسالتك" : "Your message"}</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={ar ? "اكتبي اللي في بالك يا قمر..." : "Tell us what's on your mind..."}
              rows={5}
              className="mt-1.5 rounded-xl"
            />
          </div>
          <Button
            type="submit"
            disabled={busy}
            className="h-12 w-full rounded-2xl gradient-primary text-base font-black text-primary-foreground shadow-warm hover:opacity-95"
          >
            {busy ? (
              <>
                <Loader2 className="me-1 h-4 w-4 animate-spin" />
                {ar ? "بنبعت..." : "Sending..."}
              </>
            ) : (
              <>
                <Send className="me-1 h-4 w-4" />
                {ar ? "ابعتي الرسالة" : "Send message"}
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
