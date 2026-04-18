import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Sparkles,
  Heart,
  Globe2,
  ChefHat,
  Database,
  Clock,
  Shield,
  Smartphone,
} from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePageContent, type PageItem } from "@/hooks/usePageContent";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "مميزات النظام — من اللي عندك؟" },
      {
        name: "description",
        content:
          "اكتشفي مميزات تطبيق من اللي عندك؟: ذكاء اصطناعي، وصفات بمكوناتك، حفظ مفضلة، عربي وإنجليزي، وأكتر.",
      },
      { property: "og:title", content: "مميزات النظام — من اللي عندك؟" },
      {
        property: "og:description",
        content: "كل المميزات اللي بتخلي تجربة الطبخ في بيتك أسهل وأمتع.",
      },
    ],
  }),
  component: FeaturesPage,
});

const FEATURE_ICONS = [
  ChefHat,
  Sparkles,
  Database,
  Heart,
  Globe2,
  Clock,
  Smartphone,
  Shield,
];

function FeaturesPage() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const { content } = usePageContent("features");

  const heroBadge = content.hero_badge ?? (ar ? "كل المميزات" : "All features");
  const heroTitle =
    content.hero_title ?? (ar ? "ليه تختاري التطبيق ده؟ ✨" : "Why choose this app? ✨");
  const heroSub =
    content.hero_sub ??
    (ar
      ? "مميزات صُممت بحب علشان تخلي تجربة الطبخ في بيتك أسهل، أسرع، وأحلى. كل ما تحتاجيه في مكان واحد."
      : "Features crafted with love to make cooking at home easier, faster, and more fun. Everything you need in one place.");

  const defaultFeatures: PageItem[] = [
    {
      title: ar ? "وصفات بمكوناتك" : "Recipes from your ingredients",
      desc: ar
        ? "اكتبي اللي عندك في الثلاجة وفي ثواني هنطلعلك وصفات تقدري تعمليها فوراً."
        : "Type what's in your fridge and in seconds we'll suggest recipes you can cook now.",
    },
    {
      title: ar ? "ذكاء اصطناعي ذكي" : "Smart AI",
      desc: ar
        ? "بنستخدم أحدث نماذج الذكاء الاصطناعي علشان نقترح وصفات منطقية وحلوة."
        : "We use the latest AI models to suggest tasty, sensible recipes.",
    },
    {
      title: ar ? "مكتبة وصفات منتقاة" : "Curated recipe library",
      desc: ar
        ? "قاعدة وصفات بنختارها بإيد، بنحاول نقدّملك الوصفات الجاهزة الأول قبل الذكاء الاصطناعي."
        : "A hand-picked recipe library — we serve ready ones first before falling back to AI.",
    },
    {
      title: ar ? "احفظي مفضلتك" : "Save favorites",
      desc: ar
        ? "احفظي وصفاتك اللي بتحبيها وارجعيلها في أي وقت من حسابك."
        : "Bookmark recipes you love and find them anytime in your profile.",
    },
    {
      title: ar ? "عربي وإنجليزي" : "Arabic & English",
      desc: ar
        ? "التطبيق بيشتغل بلغتين بالكامل، اختاري الأنسب ليكي."
        : "Fully bilingual — pick whichever language feels right.",
    },
    {
      title: ar ? "فلاتر سريعة" : "Quick filters",
      desc: ar
        ? "وجبات سريعة، اقتصادية، صحية، أو عربية — كله بضغطة زرار."
        : "Quick, budget, healthy, or Arabic — all one click away.",
    },
    {
      title: ar ? "متجاوب مع الموبايل" : "Mobile-friendly",
      desc: ar
        ? "مصمّم لشاشة الموبايل قبل أي حاجة، استخدميه وانتي بتطبخي."
        : "Designed mobile-first — use it while you're literally cooking.",
    },
    {
      title: ar ? "حسابك في أمان" : "Your account is safe",
      desc: ar
        ? "بياناتك محفوظة بأمان وبنحترم خصوصيتك دايماً."
        : "Your data stays safe — we always respect your privacy.",
    },
  ];

  const features =
    content.features && content.features.length > 0 ? content.features : defaultFeatures;

  const ctaTitle = content.cta_title ?? (ar ? "جاهزة تجرّبي؟ 💕" : "Ready to give it a try? 💕");
  const ctaSub =
    content.cta_sub ??
    (ar
      ? "سجّلي حساب مجاني دلوقتي وابدأي تطبخي بأسهل طريقة شُفتيها."
      : "Create a free account now and start cooking the easiest way you've seen.");
  const ctaPrimary = content.cta_primary ?? {
    label: ar ? "اعملي حساب مجاني" : "Sign up free",
    href: "/auth",
  };
  const ctaSecondary = content.cta_secondary ?? {
    label: ar ? "جرّبي بدون حساب" : "Try without account",
    href: "/",
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:pt-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl gradient-hero p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-card/70 px-3 py-1 text-xs font-semibold text-primary backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            {heroBadge}
          </div>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
            <span className="gradient-text">{heroTitle}</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {heroSub}
          </p>
        </motion.div>
      </section>

      {/* Grid */}
      {content.features_title && (
        <h2 className="mt-6 text-lg font-extrabold sm:text-xl">{content.features_title}</h2>
      )}
      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => {
          const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
          return (
            <motion.div
              key={`${f.title}-${i}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
            >
              <Card className="h-full rounded-3xl border-border/60 bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-warm">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                  {f.icon ? (
                    <span className="text-xl leading-none">{f.icon}</span>
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <h3 className="mt-3 text-base font-extrabold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </Card>
            </motion.div>
          );
        })}
      </section>

      {/* CTA */}
      <Card className="mt-8 overflow-hidden rounded-3xl border-0 gradient-primary p-6 text-primary-foreground shadow-warm sm:p-8">
        <h3 className="text-xl font-black sm:text-2xl">{ctaTitle}</h3>
        <p className="mt-2 text-sm opacity-90 sm:text-base">{ctaSub}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {ctaPrimary.href && ctaPrimary.label && (
            <Button asChild className="rounded-xl bg-card text-foreground hover:bg-card/90">
              <CTALink href={ctaPrimary.href}>{ctaPrimary.label}</CTALink>
            </Button>
          )}
          {ctaSecondary.href && ctaSecondary.label && (
            <Button
              asChild
              variant="outline"
              className="rounded-xl border-card/40 bg-transparent text-primary-foreground hover:bg-card/10"
            >
              <CTALink href={ctaSecondary.href}>{ctaSecondary.label}</CTALink>
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

function CTALink({ href, children }: { href: string; children: React.ReactNode }) {
  if (href.startsWith("http")) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return <Link to={href}>{children}</Link>;
}
