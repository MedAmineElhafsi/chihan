"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, X } from "lucide-react";

import { decideProduct } from "@/lib/shop-actions";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * The verdict on a submission.
 *
 * Turning something away asks for a reason, because the maker is told, and
 * "no" with nothing after it is how people stop submitting.
 */
export function ReviewActions({ productId }: { productId: string }) {
  const t = useTranslations("Bazar");
  const router = useRouter();
  const [note, setNote] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function decide(approve: boolean) {
    setError(null);
    start(async () => {
      const res = await decideProduct(productId, approve, note);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  if (asking) {
    return (
      <div className="flex flex-col gap-2">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("reviewNotePlaceholder")}
          maxLength={1000}
          autoFocus
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-destructive"
            disabled={pending || !note.trim()}
            onClick={() => decide(false)}
          >
            {pending && <Loader2 className="size-3.5 animate-spin" />}
            {t("reviewHold")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setAsking(false)}
            disabled={pending}
          >
            {t("reviewCancel")}
          </Button>
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="gap-1.5"
          disabled={pending}
          onClick={() => decide(true)}
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="size-3.5" aria-hidden="true" />
          )}
          {t("reviewList")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={pending}
          onClick={() => setAsking(true)}
        >
          <X className="size-3.5" aria-hidden="true" />
          {t("reviewHold")}
        </Button>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
