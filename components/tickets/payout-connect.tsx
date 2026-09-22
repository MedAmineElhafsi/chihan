"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, Loader2 } from "lucide-react";

import { connectPayouts } from "@/lib/ticket-actions";
import { Button } from "@/components/ui/button";

/**
 * Where an organiser's ticket money lands.
 *
 * Stripe asks for the bank details on its own pages — Cîhan never sees
 * them, and never holds the money on the way through.
 */
export function PayoutConnect({
  started,
  ready,
}: {
  /** An account exists but its questions are not finished. */
  started: boolean;
  /** Stripe says this account can take money. */
  ready: boolean;
}) {
  const t = useTranslations("Tickets");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function connect() {
    setError(null);
    start(async () => {
      const res = await connectPayouts();
      if (res.ok) {
        window.location.href = res.url;
        return;
      }
      setError(t(`error_${res.error}` as never));
    });
  }

  if (ready) {
    return <p className="text-muted-foreground text-sm">{t("payoutsReady")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-sm">
        {started ? t("payoutsUnfinished") : t("payoutsIntro")}
      </p>
      <Button
        type="button"
        onClick={connect}
        disabled={pending}
        className="w-fit gap-2"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ExternalLink className="size-4" />
        )}
        {started ? t("payoutsFinish") : t("payoutsConnect")}
      </Button>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
