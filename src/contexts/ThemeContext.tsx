import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = "app-theme";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function readInitial(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>("light");
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const initial = readInitial();
    setThemeState(initial);
    applyTheme(initial);
    setHydrated(true);
  }, []);

  // When user logs in, load their preferred theme from profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("preferred_theme")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const t = (data as { preferred_theme?: Theme } | null)?.preferred_theme;
        if (t === "dark" || t === "light") {
          setThemeState(t);
          applyTheme(t);
          if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, t);
        }
      });
  }, [user]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, t);
    if (user) {
      supabase
        .from("profiles")
        .update({ preferred_theme: t })
        .eq("id", user.id)
        .then(() => {});
    }
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  // Avoid SSR/CSR mismatch flicker
  void hydrated;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
