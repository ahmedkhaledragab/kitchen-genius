import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Loader2, Utensils } from "lucide-react";

import { useLang } from "@/contexts/LanguageContext";
import { useKitchens } from "@/hooks/useKitchens";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/kitchens/")({
  head: () => ({
    meta: [
      { title: "المطابخ — اختاري مطبخك المفضل" },
      {
        name: "description",
        content: "تصفحي وصفات حسب المطبخ: مصري، شامي، خليجي، إيطالي، آسيوي وأكتر.",
      },
      { property: "og:title", content: "المطابخ — اختاري مطبخك المفضل" },
      {
        property: "og:description",
        content: "تصفحي وصفات حسب المطبخ من مكتبة وصفاتنا.",
      },
    ],
  }),
  component: KitchensPage,
});

function KitchensPage() {
  const { lang } = useLang();
  const { items: kitchens, loading } = useKitchens();

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:pt-10">
      <section className="relative overflow-hidden rounded-3xl gradient-hero p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-card/70 px-3 py-1 text-xs font-semibold text-primary backdrop-blur">
            <Utensils className="h-3.5 w-3.5" />
            {lang === "ar" ? "مكتبة المطابخ" : "Kitchen library"}
          </div>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
            <span className="gradient-text">
              {lang === "ar" ? "اختاري مطبخك 👩‍🍳" : "Pick a kitchen 👩‍🍳"}
            </span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
            {lang === "ar"
              ? "كل مطبخ فيه مجموعة وصفات جاهزة. اختاري واحد عشان تشوفي وصفاته."
              : "Each kitchen has its own collection of ready-made recipes."}
          </p>
        </motion.div>
      </section>

      <div className="mt-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : kitchens.length === 0 ? (
          <Card className="rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">
            {lang === "ar"
              ? "لسه مفيش مطابخ متاحة."
              : "No kitchens available yet."}
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {kitchens.map((k, i) => (
              <motion.div
                key={k.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
              >
                <Link
                  to="/kitchens/$slug"
                  params={{ slug: k.slug }}
                  className="group flex h-full flex-col items-center gap-2 rounded-3xl border border-border/60 bg-card p-5 text-center shadow-card transition hover:-translate-y-0.5 hover:border-primary hover:shadow-warm"
                >
                  <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-3xl transition group-hover:bg-primary/20">
                    {k.icon || "🍳"}
                  </span>
                  <p className="text-base font-extrabold">
                    {lang === "ar" ? k.name_ar : k.name_en}
                  </p>
                  {(lang === "ar" ? k.description_ar : k.description_en) && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {lang === "ar" ? k.description_ar : k.description_en}
                    </p>
                  )}
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
