"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Send } from "lucide-react";

import { settleSeller } from "@/lib/shop-actions";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

/** Sending a maker what they are owed. */
export function SettleButton({
  sellerId,
  amount,
}: {
  sellerId: string;
  /** Already formatted for the reader. */
  amount: string;
}) {
  const t = useTranslations("Bazar");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function send() {
    setError(null);
    start(async () => {
      const res = await settleSeller(sellerId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        className="gap-1.5"
        disabled={pending}
        onClick={send}
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="size-3.5" aria-hidden="true" />
        )}
        {t("settleSend", { amount })}
      </Button>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
