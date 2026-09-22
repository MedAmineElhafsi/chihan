"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Ticket } from "lucide-react";

import { buyTickets } from "@/lib/ticket-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Buying a place at an event.
 *
 * The price shown here is only a label: what is actually charged, and
 * whether there is anything left, is decided on the server. Stripe takes
 * the card on its own page and pays the organiser directly.
 */
export function TicketButton({
  eventId,
  priceCents,
  capacity,
  sold,
  currency,
  isOrganiser,
  canBuy,
  className,
}: {
  eventId: string;
  priceCents: number;
  capacity: number;
  sold: number;
  currency: string;
  isOrganiser: boolean;
  canBuy: boolean;
  className?: string;
}) {
  const t = useTranslations("Tickets");
  const locale = useLocale();
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const left = Math.max(0, capacity - sold);
  const price = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: priceCents % 100 === 0 ? 0 : 2,
  }).format(priceCents / 100);

  function buy() {
    setError(null);
    start(async () => {
      const res = await buyTickets(eventId, qty);
      if (res.ok) {
        window.location.href = res.url;
        return;
      }
      setError(t(`error_${res.error}` as never));
    });
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium">
          <Ticket className="text-cyan size-4 shrink-0" />
          {price}
        </span>

        {left === 0 ? (
          <span className="text-muted-foreground bg-secondary rounded-md px-2 py-1 text-xs font-medium">
            {t("soldOut")}
          </span>
        ) : isOrganiser ? (
          <span className="text-muted-foreground text-xs">
            {t("soldOf", { sold, capacity })}
          </span>
        ) : (
          <>
            <select
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              aria-label={t("quantity")}
              className="border-input bg-card/40 h-8 rounded-md border px-2 text-sm"
            >
              {Array.from({ length: Math.min(10, left) }, (_, i) => i + 1).map(
                (n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                )
              )}
            </select>
            <Button
              type="button"
              size="sm"
              disabled={!canBuy || pending}
              onClick={buy}
              className="glow h-8"
            >
              {pending && <Loader2 className="size-3.5 animate-spin" />}
              {t("buy")}
            </Button>
            <span className="text-muted-foreground text-xs">
              {t("left", { left })}
            </span>
          </>
        )}
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
