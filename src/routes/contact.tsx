import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, MessageCircle, Facebook, Instagram, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const CONTACT_EMAIL = "hello@menelyandak.app";

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

function ContactPage() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error(ar ? "املي كل الخانات يا قمر 🌸" : "Fill in all fields lovely 🌸");
      return;
    }
    setBusy(true);
    // Open mailto with pre-filled content (no backend needed)
    const subject = encodeURIComponent(
      ar ? `رسالة من ${name}` : `Message from ${name}`,
    );
    const body = encodeURIComponent(
      `${ar ? "الاسم" : "Name"}: ${name}\n${ar ? "الإيميل" : "Email"}: ${email}\n\n${message}`,
    );
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    setTimeout(() => {
      setBusy(false);
      toast.success(
        ar
          ? "فتحنالك برنامج الإيميل، ابعتي الرسالة وهنرد عليكي بسرعة 💕"
          : "Opened your email app — send and we'll reply soon 💕",
      );
    }, 600);
  };

  const channels = [
    {
      icon: Mail,
      title: ar ? "الإيميل" : "Email",
      value: CONTACT_EMAIL,
      href: `mailto:${CONTACT_EMAIL}`,
      color: "text-primary bg-primary/10",
    },
    {
      icon: Facebook,
      title: "Facebook",
      value: "facebook.com/share/1B99gicE7g",
      href: "https://www.facebook.com/share/1B99gicE7g/",
      color: "text-[#1877F2] bg-[#1877F2]/10",
    },
    {
      icon: Instagram,
      title: "Instagram",
      value: "@naria.oo",
      href: "https://www.instagram.com/naria.oo",
      color: "text-[#d62976] bg-[#d62976]/10",
    },
  ];

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
            {ar ? "إحنا هنا" : "We're here"}
          </div>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
            <span className="gradient-text">
              {ar ? "تواصلي معانا 💌" : "Get in touch 💌"}
            </span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {ar
              ? "أي سؤال، اقتراح، أو حتى مجرد سلام — يسعدنا نسمع منك. اختاري الطريقة اللي تناسبك."
              : "Any question, suggestion, or just a hello — we'd love to hear from you. Pick whatever works for you."}
          </p>
        </motion.div>
      </section>

      {/* Channels */}
      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {channels.map((c) => (
          <a
            key={c.title}
            href={c.href}
            target={c.href.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="group"
          >
            <Card className="h-full rounded-3xl border-border/60 bg-card p-5 shadow-card transition-all group-hover:-translate-y-0.5 group-hover:shadow-warm">
              <div className={`grid h-10 w-10 place-items-center rounded-2xl ${c.color}`}>
                <c.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-sm font-extrabold">{c.title}</h3>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.value}</p>
            </Card>
          </a>
        ))}
      </section>

      {/* Form */}
      <Card className="mt-6 rounded-3xl border-border/60 bg-card p-6 shadow-card sm:p-8">
        <h2 className="text-xl font-extrabold sm:text-2xl">
          {ar ? "ابعتيلنا رسالة 💕" : "Send us a message 💕"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {ar
            ? "املي البيانات وهنرد عليكي بأقرب وقت."
            : "Fill in your details and we'll reply soon."}
        </p>

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
            <label className="text-sm font-bold">{ar ? "رسالتك" : "Your message"}</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                ar ? "اكتبي اللي في بالك يا قمر..." : "Tell us what's on your mind..."
              }
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
