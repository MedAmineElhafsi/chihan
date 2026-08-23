"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ReelComposer } from "./reel-composer";

/**
 * Reels lead the page; making one is a deliberate act behind a button. An
 * always-open composer pushed the actual reels below the fold, which is the
 * wrong way round for a page people come to watch.
 */
export function NewReelButton({ userId }: { userId: string }) {
  const t = useTranslations("Reels");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="w-full gap-2">
        <Plus className="size-4" />
        {t("newReel")}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="label-mono text-cyan">{t("newReel")}</span>
        <button
          onClick={() => setOpen(false)}
          aria-label={t("close")}
          className="rounded-sm p-1 text-muted-foreground transition-colors hover:text-cyan"
        >
          <X className="size-4" />
        </button>
      </div>
      <ReelComposer userId={userId} />
    </div>
  );
}
