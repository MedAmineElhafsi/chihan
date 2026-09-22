"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, X } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { resolveSuggestion } from "@/lib/guide-actions";
import { Button } from "@/components/ui/button";

/** Mark a member's suggestion written, or set it aside. */
export function SuggestionActions({ id }: { id: string }) {
  const t = useTranslations("Guides");
  const router = useRouter();
  const [pending, start] = useTransition();
  const act = (status: "done" | "dismissed") =>
    start(async () => {
      await resolveSuggestion(id, status);
      router.refresh();
    });
  return (
    <div className="flex gap-1.5">
      <Button
        size="sm"
        variant="outline"
        onClick={() => act("done")}
        disabled={pending}
        className="gap-1.5"
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Check className="size-3.5" aria-hidden="true" />
        )}
        {t("suggestionDone")}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => act("dismissed")}
        disabled={pending}
        className="text-muted-foreground gap-1.5"
      >
        <X className="size-3.5" aria-hidden="true" />
        {t("suggestionDismiss")}
      </Button>
    </div>
  );
}
