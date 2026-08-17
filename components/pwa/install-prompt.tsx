"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, X } from "lucide-react";

import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "cihan-pwa-install-dismissed";

/** Soft install banner when the browser fires beforeinstallprompt. */
export function InstallPrompt() {
  const t = useTranslations("Pwa");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      // ignore
    }

    function onBip(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (!visible || !deferred) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      // ignore
    }
    setDeferred(null);
    setVisible(false);
  }

  function dismiss() {
    setVisible(false);
    setDeferred(null);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto panel flex max-w-md items-start gap-3 rounded-2xl border border-cyan/30 p-4 shadow-lg">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-cyan/15 text-cyan">
          <Download className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t("installTitle")}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("installBody")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" className="gap-1.5" onClick={install}>
              <Download className="size-3.5" />
              {t("installCta")}
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>
              {t("installLater")}
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground"
          aria-label={t("installLater")}
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
