import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { useLang } from "@/contexts/LanguageContext";
import {
  isInIframe,
  isPreviewHost,
  type BeforeInstallPromptEventLike,
} from "@/lib/pwa";

export function InstallPWAButton({ className }: { className?: string }) {
  const { settings } = useSiteSettings();
  const { lang } = useLang();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEventLike | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already running standalone → don't show
    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEventLike);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Don't render in preview/iframe or when PWA disabled or already installed
  if (!settings.pwa_enabled) return null;
  if (installed) return null;
  if (isPreviewHost() || isInIframe()) return null;
  if (!deferred) return null;

  const handleInstall = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
    } finally {
      setDeferred(null);
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      onClick={handleInstall}
      className={`rounded-xl gradient-primary text-primary-foreground hover:opacity-95 ${className ?? ""}`}
    >
      <Download className="me-1.5 h-4 w-4" />
      {lang === "ar" ? "ثبّتي التطبيق" : "Install app"}
    </Button>
  );
}
