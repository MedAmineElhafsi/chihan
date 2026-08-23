"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Trash2 } from "lucide-react";

import { Link, useRouter } from "@/i18n/navigation";
import { deleteReview, saveReview } from "@/lib/listing-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarInput } from "./stars";

export function ReviewForm({
  listingId,
  isAuthenticated,
  mayReview,
  isOwner,
  initialRating,
  initialBody,
  hasReview,
}: {
  listingId: string;
  isAuthenticated: boolean;
  /** False until you have actually dealt with this person. */
  mayReview: boolean;
  isOwner: boolean;
  initialRating: number;
  initialBody: string;
  hasReview: boolean;
}) {
  const t = useTranslations("Directory");
  const router = useRouter();
  const [rating, setRating] = useState(initialRating);
  const [body, setBody] = useState(initialBody);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border bg-card/30 p-4 text-sm text-muted-foreground">
        {t("signInToReview")}
        <Button asChild size="sm" variant="outline">
          <Link href="/login">{t("signIn")}</Link>
        </Button>
      </div>
    );
  }

  // You cannot review yourself, and you cannot review someone you have never
  // dealt with — the database enforces both; this only explains why.
  if (isOwner) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card/30 p-4 text-sm text-muted-foreground">
        {t("ownerCannotReview")}
      </p>
    );
  }

  if (!mayReview) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card/30 p-4 text-sm text-muted-foreground">
        {t("needsDealing")}
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (rating < 1) {
      setError(t("ratingRequired"));
      return;
    }
    setLoading(true);
    const res = await saveReview({ listingId, rating, body });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  async function remove() {
    setLoading(true);
    await deleteReview(listingId);
    setRating(0);
    setBody("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card/40 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">
          {hasReview ? t("editReview") : t("ratingLabel")}
        </span>
        <StarInput value={rating} onChange={setRating} disabled={loading} />
      </div>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t("reviewPlaceholder")}
        maxLength={800}
        disabled={loading}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={loading} className="gap-2">
          {loading && <Loader2 className="size-4 animate-spin" />}
          {hasReview ? t("updateReview") : t("submitReview")}
        </Button>
        {hasReview && (
          <Button
            type="button"
            variant="ghost"
            onClick={remove}
            disabled={loading}
            className="gap-1.5 text-muted-foreground"
          >
            <Trash2 className="size-4" />
            {t("deleteReview")}
          </Button>
        )}
      </div>
    </form>
  );
}
