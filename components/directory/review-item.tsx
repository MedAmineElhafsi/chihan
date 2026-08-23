"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CornerDownRight, Loader2 } from "lucide-react";

import { replyToReview } from "@/lib/professional-actions";
import { useRouter } from "@/i18n/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ReportButton } from "@/components/moderation/report-button";
import type { Review } from "@/types/listing";
import { Stars } from "./stars";

/**
 * A review carries its writer's name and face. That makes it worth trusting
 * and worth answering — so the person reviewed gets one public reply, and
 * anyone can report a review that is not honest.
 */
export function ReviewItem({
  review,
  listingId,
  isOwner,
  date,
}: {
  review: Review;
  listingId: string;
  isOwner: boolean;
  date: string;
}) {
  const t = useTranslations("Directory");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState(review.reply ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    const res = await replyToReview(review.id, body, listingId);
    setSaving(false);
    if (!res.ok) {
      setError(t("replyFailed"));
      return;
    }
    setOpen(false);
    router.refresh();
  }

  const initial = (review.author_name ?? "?").slice(0, 1).toUpperCase();

  return (
    <li className="flex flex-col gap-2 border-b border-border/60 pb-4 last:border-0">
      <div className="flex items-center gap-2.5">
        <Avatar className="size-8">
          {review.author_avatar && (
            <AvatarImage src={review.author_avatar} alt="" />
          )}
          <AvatarFallback className="text-xs">{initial}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">
            {review.author_name ?? t("anonymous")}
          </div>
          <div className="text-xs text-muted-foreground">{date}</div>
        </div>
        <ReportButton targetType="review" targetId={review.id} />
      </div>

      <Stars value={review.rating} />

      {review.body && (
        <p className="text-sm leading-relaxed text-foreground/90">
          {review.body}
        </p>
      )}

      {review.reply && !open && (
        <div className="mt-1 flex gap-2 rounded-md border-s-2 border-cyan/50 bg-secondary/40 p-3">
          <CornerDownRight className="mt-0.5 size-3.5 shrink-0 text-cyan" />
          <div className="flex flex-col gap-1">
            <span className="label-mono text-cyan">{t("ownerReply")}</span>
            <p className="text-sm leading-relaxed text-foreground/90">
              {review.reply}
            </p>
          </div>
        </div>
      )}

      {isOwner && !open && (
        <button
          onClick={() => setOpen(true)}
          className="self-start font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-cyan"
        >
          {review.reply ? t("editReply") : t("replyCta")}
        </button>
      )}

      {isOwner && open && (
        <div className="flex flex-col gap-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("replyPlaceholder")}
            rows={3}
            maxLength={1000}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={submit} disabled={saving}>
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              {t("replySave")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setBody(review.reply ?? "");
              }}
            >
              {t("cancel")}
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
