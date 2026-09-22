"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Sparkles } from "lucide-react";

import {
  openBusinessPortal,
  startBusinessCheckout,
} from "@/lib/business-actions";
import { Button } from "@/components/ui/button";

/** Buying the business plan, or changing the card behind one. */
export function BusinessPlanButton({
  listingId,
  manage = false,
}: {
  listingId?: string;
  /** Someone who already pays: this opens Stripe's own billing page. */
  manage?: boolean;
}) {
  const t = useTranslations("Business");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function go() {
    setError(null);
    start(async () => {
      const res = manage
        ? await openBusinessPortal()
        : await startBusinessCheckout(listingId);
      if (res.ok) {
        window.location.href = res.url;
        return;
      }
      setError(t(`error_${res.error}` as never));
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        onClick={go}
        disabled={pending}
        variant={manage ? "outline" : "default"}
        className={manage ? "w-fit gap-2" : "glow w-fit gap-2"}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          !manage && <Sparkles className="size-4" />
        )}
        {manage ? t("manage") : t("subscribe")}
      </Button>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
