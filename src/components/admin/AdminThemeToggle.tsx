import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLang } from "@/contexts/LanguageContext";

const STORAGE_KEY = "admin-theme";

function applyTheme(dark: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", dark);
}

/**
 * Light/dark toggle scoped to the admin shell. Persists to localStorage.
 * Safe to mount alongside the public theme — both write the same `dark` class
 * on <html>, but the storage key here keeps the admin's last choice independent.
 */
export function AdminThemeToggle() {
  const { lang } = useLang();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const initial = stored
      ? stored === "dark"
      : window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
    setDark(initial);
    applyTheme(initial);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    applyTheme(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={lang === "ar" ? "تبديل الوضع" : "Toggle theme"}
      className="h-9 w-9"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
