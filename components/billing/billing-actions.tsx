"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { createCheckout, createPortal } from "@/lib/billing-actions";
import { PRICING } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BillingActions({
  isPremium,
  configured,
}: {
  isPremium: boolean;
  configured: boolean;
}) {
  const t = useTranslations("Pricing");
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [pending, startT] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function checkout() {
    setError(null);
    startT(async () => {
      const res = await createCheckout(interval);
      if (res.ok) window.location.assign(res.url);
      else setError(res.error);
    });
  }

  function manage() {
    setError(null);
    startT(async () => {
      const res = await createPortal();
      if (res.ok) window.location.assign(res.url);
      else setError(res.error);
    });
  }

  if (isPremium) {
    return (
      <div className="mt-6 flex flex-col gap-2">
        <Button
          onClick={manage}
          disabled={pending}
          variant="outline"
          className="w-full gap-2"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {t("manage")}
        </Button>
        {error && <p className="text-center text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      <div className="flex gap-1 rounded-full border border-border p-1">
        {(["monthly", "yearly"] as const).map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setInterval(i)}
            className={cn(
              "flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              interval === i
                ? "bg-gold/15 text-gold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {i === "monthly" ? t("monthly") : t("yearly")}
          </button>
        ))}
      </div>
      <Button
        onClick={checkout}
        disabled={pending || !configured}
        className="w-full gap-2 glow-gold"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {t("upgradeCta")} ·{" "}
        {interval === "monthly" ? PRICING.monthly : PRICING.yearly}
      </Button>
      {!configured && (
        <p className="text-center text-xs text-muted-foreground">
          {t("comingSoon")}
        </p>
      )}
      {error && <p className="text-center text-xs text-destructive">{error}</p>}
    </div>
  );
}
