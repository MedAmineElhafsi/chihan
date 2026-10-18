"use client";

import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, ShoppingBag } from "lucide-react";

import { buyProduct } from "@/lib/shop-actions";
import { Button } from "@/components/ui/button";

/**
 * Buying a download.
 *
 * The checkbox is not decoration. In the EU a buyer may change their mind
 * for fourteen days, and the only way that right ends for a file delivered
 * straight away is if they said, before buying, that they wanted it now and
 * understood what they were giving up. So the button stays disabled until
 * they do, and the moment they said it is written on the order.
 */
export function BuyButton({
  productId,
  price,
  canBuy,
}: {
  productId: string;
  /** Already formatted for the reader — "€6". */
  price: string;
  /** False for the maker's own work, or somebody not signed in. */
  canBuy: boolean;
}) {
  const t = useTranslations("Bazar");
  const id = useId();
  const [waived, setWaived] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function buy() {
    setError(null);
    start(async () => {
      const res = await buyProduct(productId, waived);
      if (res.ok) {
        window.location.href = res.url;
        return;
      }
      setError(t(`error_${res.error}` as never));
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <label
        htmlFor={id}
        className="text-muted-foreground flex cursor-pointer items-start gap-2.5 text-sm"
      >
        <input
          id={id}
          type="checkbox"
          checked={waived}
          onChange={(e) => setWaived(e.target.checked)}
          className="border-input accent-cyan mt-0.5 size-4 shrink-0 rounded"
        />
        <span>{t("waiver")}</span>
      </label>

      <Button
        type="button"
        size="lg"
        onClick={buy}
        disabled={!canBuy || !waived || pending}
        className="glow w-full gap-2 sm:w-auto"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <ShoppingBag className="size-4" aria-hidden="true" />
        )}
        {t("buy", { price })}
      </Button>

      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
