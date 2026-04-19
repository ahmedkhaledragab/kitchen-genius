import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { useLang } from "@/contexts/LanguageContext";

interface Props {
  className?: string;
  size?: "sm" | "icon";
}

/**
 * Unified light/dark theme toggle. Uses the global ThemeContext, which:
 * - Persists to localStorage for guests
 * - Persists to profiles.preferred_theme for logged-in users
 */
export function ThemeToggle({ className, size = "sm" }: Props) {
  const { theme, toggleTheme } = useTheme();
  const { lang } = useLang();

  const label = lang === "ar" ? "تبديل الوضع" : "Toggle theme";

  if (size === "icon") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        aria-label={label}
        className={className ?? "h-9 w-9"}
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      aria-label={label}
      className={className ?? "rounded-xl px-2"}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
