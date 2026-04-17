import { Heart, Sparkles } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";

export function Footer() {
  const { lang } = useLang();
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-12 border-t border-border/60 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row">
        <p className="text-xs text-muted-foreground">
          © {year} {lang === "ar" ? "من اللي عندك؟" : "What's in your kitchen?"} ·{" "}
          {lang === "ar" ? "كل الحقوق محفوظة" : "All rights reserved"}
        </p>

        <a
          href="https://www.facebook.com/share/1B99gicE7g/"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3.5 py-1.5 text-xs font-semibold shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary transition-transform group-hover:rotate-12" />
          <span className="text-muted-foreground">
            {lang === "ar" ? "صُنع بـ" : "Crafted with"}
          </span>
          <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500 animate-pulse" />
          <span className="text-muted-foreground">
            {lang === "ar" ? "بواسطة" : "by"}
          </span>
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text font-extrabold text-transparent">
            Manar Elsheikh
          </span>
        </a>
      </div>
    </footer>
  );
}
