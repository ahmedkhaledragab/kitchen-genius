import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Admin theme toggle — thin wrapper around the global ThemeToggle so the
 * admin shell stays in sync with the user-wide preference (persisted to
 * profiles.preferred_theme for logged-in admins).
 */
export function AdminThemeToggle() {
  return <ThemeToggle size="icon" />;
}
