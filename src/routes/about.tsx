import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChefHat, Heart, Sparkles, Leaf, Globe2 } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePageContent, type PageItem } from "@/hooks/usePageContent";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "من نحن — قصة من اللي عندك؟" },
      {
        name: "description",
        content:
          "تعرفي على فكرة تطبيق من اللي عندك؟ — مساعدك في المطبخ يحوّل مكوناتك لوصفات حلوة في ثواني.",
      },
      { property: "og:title", content: "من نحن — قصة من اللي عندك؟" },
      {
        property: "og:description",
        content: "كل اللي تحبي تعرفيه عن مهمتنا، رؤيتنا، والفريق ورا التطبيق.",
      },
    ],
  }),
  component: AboutPage,
});

const VALUE_ICONS = [Sparkles, Heart, Leaf, Globe2];

function AboutPage() {
  const { lang } = useLang();
  const { settings } = useSiteSettings();
  const { content } = usePageContent("about");
  const siteName = lang === "ar" ? settings.site_name_ar : settings.site_name_en;
  const ar = lang === "ar";

  const heroBadge = content.hero_badge ?? (ar ? "حكايتنا" : "Our story");
  const heroTitle =
    content.hero_title ?? (ar ? `إزاي بدأت ${siteName}؟` : `How ${siteName} started`);
  const heroSub =
    content.hero_sub ??
    (ar
      ? "كل يوم بنفتح الثلاجة ونسأل نفس السؤال: \"هطبخ إيه النهاردة؟\". الفكرة بدأت من هنا — إن أي حد يقدر يلاقي وصفة حلوة من المكونات اللي عنده فعلاً، من غير ما يدوّر ساعات على الإنترنت."
      : 'We open the fridge every day and ask the same question: "What should I cook today?" That\'s where the idea started — anyone should be able to find a tasty recipe from what they already have, without scrolling the internet for hours.');

  const missionTitle = content.mission_title ?? (ar ? "مهمتنا 💛" : "Our mission 💛");
  const missionBody =
    content.mission_body ??
    (ar
      ? "نخلي كل شخص يحس إنه شيف صغير في مطبخه، حتى لو معندوش غير 3 مكونات بس. بنخلط بين قاعدة وصفات منتقاة بإيد وذكاء اصطناعي ذكي، علشان النتيجة تكون وصفات تقدري تعمليها فعلاً، مش مجرد كلام."
      : "Make everyone feel like a little chef in their own kitchen, even with just 3 ingredients. We blend a hand-curated recipe library with smart AI so you get recipes you can actually cook, not just read.");

  const valuesTitle = content.values_title ?? (ar ? "اللي بنؤمن بيه" : "What we believe in");

  const defaultValues: PageItem[] = [
    {
      title: ar ? "ذكاء اصطناعي بسيط" : "Simple AI",
      desc: ar
        ? "تكنولوجيا متطورة بشكل سهل ولطيف يفهمك من أول كلمة."
        : "Powerful AI in a friendly, simple wrapper that gets you instantly.",
    },
    {
      title: ar ? "بحبّ المطبخ" : "Made with love",
      desc: ar
        ? "مصمّم بحب علشان مطبخك يبقى أحلى مكان في البيت."
        : "Crafted with love so your kitchen feels like the best place at home.",
    },
    {
      title: ar ? "بنقلّل الهدر" : "Less food waste",
      desc: ar
        ? "بنساعدك تستفيدي من كل اللي عندك في الثلاجة بدل ما يتلف."
        : "Use what you already have instead of letting it go to waste.",
    },
    {
      title: ar ? "عربي وإنجليزي" : "Arabic & English",
      desc: ar
        ? "التطبيق بلغتين علشان يكون قريب من قلبك ومن مطبخك."
        : "Two languages so we feel close to your heart and your kitchen.",
    },
  ];

  const values = content.values && content.values.length > 0 ? content.values : defaultValues;

  const ctaTitle = content.cta_title ?? (ar ? "جرّبي بنفسك دلوقتي 🍳" : "Try it yourself now 🍳");
  const ctaSub =
    content.cta_sub ??
    (ar ? "اكتبي 3 مكونات بس وشوفي السحر بيحصل." : "Type just 3 ingredients and watch the magic happen.");
  const ctaPrimary = content.cta_primary ?? {
    label: ar ? "يلا نطبخ" : "Let's cook",
    href: "/",
  };
  const ctaSecondary = content.cta_secondary ?? {
    label: ar ? "اعرفي مميزاتنا" : "See our features",
    href: "/features",
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
            <ChefHat className="h-3.5 w-3.5" />
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

      {/* Mission */}
      <Card className="mt-6 rounded-3xl border-border/60 bg-card p-6 shadow-card sm:p-8">
        <h2 className="text-xl font-extrabold sm:text-2xl">{missionTitle}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {missionBody}
        </p>
      </Card>

      {/* Values grid */}
      <section className="mt-6">
        <h2 className="text-lg font-extrabold sm:text-xl">{valuesTitle}</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {values.map((v, i) => {
            const Icon = VALUE_ICONS[i % VALUE_ICONS.length];
            return (
              <motion.div
                key={`${v.title}-${i}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Card className="h-full rounded-3xl border-border/60 bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-warm">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                    {v.icon ? (
                      <span className="text-xl leading-none">{v.icon}</span>
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <h3 className="mt-3 text-base font-extrabold">{v.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {v.desc}
                  </p>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <Card className="mt-8 overflow-hidden rounded-3xl border-0 gradient-accent p-6 text-accent-foreground shadow-warm sm:p-8">
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
              className="rounded-xl border-card/40 bg-transparent text-accent-foreground hover:bg-card/10"
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
