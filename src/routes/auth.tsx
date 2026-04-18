import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import authHero from "@/assets/auth-hero.jpg";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — من اللي عندك؟" },
      { name: "description", content: "سجل دخول علشان تحفظ وصفاتك المفضلة." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useLang();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              display_name: name || email.split("@")[0],
              phone: phone.trim() || null,
            },
          },
        });
        if (error) {
          toast.error(error.message);
        } else {
          toast.success("أهلاً بيكي في المطبخ يا قمر 💕🍳");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) toast.error(error.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) toast.error(result.error.message ?? t.common.error);
    setBusy(false);
  };

  return (
    <div className="mx-auto flex max-w-md flex-col items-stretch px-4 pt-6 pb-20">
      <Link
        to="/"
        className="mx-auto mb-5 block aspect-[16/9] w-full max-w-sm overflow-hidden rounded-3xl shadow-card ring-1 ring-border/60"
      >
        <img
          src={authHero}
          alt=""
          width={1280}
          height={720}
          className="h-full w-full object-cover"
        />
      </Link>

      <Card className="rounded-3xl border-border/60 bg-card p-6 shadow-card">
        <h1 className="text-center text-2xl font-extrabold">{t.auth.welcome}</h1>
        <p className="mt-1 text-center text-sm leading-relaxed text-muted-foreground">
          {t.auth.welcomeSub}
        </p>

        <Button
          type="button"
          variant="outline"
          onClick={google}
          disabled={busy}
          className="mt-5 h-11 w-full rounded-xl border-border bg-background hover:bg-secondary"
        >
          <svg className="me-1 h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 10.2v3.9h5.5c-.24 1.42-1.7 4.16-5.5 4.16-3.31 0-6.01-2.74-6.01-6.12S8.69 6.02 12 6.02c1.88 0 3.14.8 3.86 1.49l2.63-2.53C16.84 3.46 14.66 2.5 12 2.5 6.76 2.5 2.5 6.76 2.5 12s4.26 9.5 9.5 9.5c5.48 0 9.1-3.85 9.1-9.27 0-.62-.07-1.1-.16-1.57H12z"
            />
          </svg>
          {t.auth.google}
        </Button>

        <div className="my-5 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          <span>أو</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <>
              <div>
                <label className="text-xs font-semibold">{t.auth.name}</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 rounded-xl"
                  placeholder={t.auth.name}
                />
              </div>
              <div>
                <label className="text-xs font-semibold">{t.profile.phoneOptional}</label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={20}
                  className="mt-1 rounded-xl"
                  placeholder={t.profile.phonePlaceholder}
                  dir="ltr"
                />
              </div>
            </>
          )}
          <div>
            <label className="text-xs font-semibold">{t.auth.email}</label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 rounded-xl"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-xs font-semibold">{t.auth.password}</label>
            <Input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 rounded-xl"
              placeholder="••••••••"
            />
          </div>
          <Button
            type="submit"
            disabled={busy}
            className="h-11 w-full rounded-xl gradient-primary text-primary-foreground hover:opacity-95"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signup" ? t.auth.signup : t.auth.login}
          </Button>
        </form>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-border/60 bg-secondary/40 p-3 text-center text-[11px] font-semibold leading-tight text-foreground/80">
            {t.auth.perks.recipes}
          </div>
          <div className="rounded-2xl border border-border/60 bg-secondary/40 p-3 text-center text-[11px] font-semibold leading-tight text-foreground/80">
            {t.auth.perks.favorites}
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {mode === "signin" ? t.auth.noAccount : t.auth.hasAccount}{" "}
          <button
            type="button"
            className="font-bold text-primary hover:underline"
            onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
          >
            {mode === "signin" ? t.auth.createOne : t.auth.signInLink}
          </button>
        </p>
      </Card>
    </div>
  );
}
