"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Megaphone } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { submitAd, withdrawAd, type AdError } from "@/lib/ad-actions";
import { adPhase } from "@/lib/sponsored";
import { isolate } from "@/lib/bidi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SponsoredCard } from "@/components/feed/sponsored-card";
import type { ListingWithStats } from "@/types/listing";
import { BODY_MAX, HEADLINE_MAX, HEADLINE_MIN, type Ad } from "@/types/ad";

/**
 * The owner's side of promotion, on their own listing.
 *
 * Whatever state the last ad is in, the panel says it in one line and shows
 * the card exactly as Explore will — the preview follows the owner's typing,
 * so there is no guessing what people will see. Numbers are the two an owner
 * can act on: how many saw it, how many tapped through.
 */
export function ListingPromotion({
  listing,
  ad,
}: {
  listing: ListingWithStats;
  ad: Ad | null;
}) {
  const t = useTranslations("Ads");
  const locale = useLocale();
  const router = useRouter();
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<AdError | null>(null);
  const [pending, start] = useTransition();

  const phase = ad ? adPhase(ad) : null;
  const date = (iso: string | null) =>
    iso
      ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
          new Date(iso)
        )
      : "";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await submitAd(listing.id, headline, body);
      if (!res.ok) return setError(res.error);
      setHeadline("");
      setBody("");
      router.refresh();
    });
  }

  function withdraw() {
    if (!ad) return;
    setError(null);
    start(async () => {
      const res = await withdrawAd(ad.id, listing.id);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  const stats = ad && (
    <p className="text-muted-foreground text-sm">
      {t("views", { count: ad.impressions })} ·{" "}
      {t("taps", { count: ad.clicks })}
    </p>
  );

  return (
    <section
      aria-labelledby="promote-title"
      className="panel flex flex-col gap-4 rounded-lg p-5"
    >
      <div className="flex items-start gap-3">
        <span className="bg-secondary text-cyan ring-border inline-flex size-9 shrink-0 items-center justify-center rounded-lg ring-1">
          <Megaphone className="size-4" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 id="promote-title" className="font-display text-lg font-semibold">
            {phase === "pending"
              ? t("pendingTitle")
              : phase === "running"
                ? t("runningTitle", { date: date(ad!.ends_at) })
                : t("promoteTitle")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {phase === "pending"
              ? t("pendingBody")
              : phase === "running"
                ? t("runningBody")
                : t("promoteBody")}
          </p>
          {phase === "running" && stats}
        </div>
      </div>

      {(phase === "pending" || phase === "running") && ad && (
        <>
          <SponsoredCard
            preview
            item={{ id: ad.id, headline: ad.headline, body: ad.body, listing }}
          />
          <Button
            variant="outline"
            onClick={withdraw}
            disabled={pending}
            className="gap-2 self-start"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {phase === "pending" ? t("withdraw") : t("stop")}
          </Button>
        </>
      )}

      {(phase === null || phase === "ended" || phase === "rejected") && (
        <>
          {phase === "rejected" && ad && (
            <div className="border-destructive/40 bg-destructive/10 rounded-md border p-3 text-sm">
              <p className="font-medium">{t("rejectedTitle")}</p>
              <p className="text-muted-foreground mt-0.5">
                {ad.decision_note
                  ? t("rejectedNote", { note: isolate(ad.decision_note) })
                  : t("rejectedNoNote")}
              </p>
            </div>
          )}
          {phase === "ended" && ad && (
            <div className="border-border rounded-md border p-3 text-sm">
              <p className="font-medium">
                {t("endedTitle", { date: date(ad.ends_at) })}
              </p>
              {stats}
            </div>
          )}

          <form onSubmit={submit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ad-headline">{t("headlineLabel")}</Label>
              <Input
                id="ad-headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                maxLength={HEADLINE_MAX}
                placeholder={t("headlinePlaceholder")}
                aria-describedby="ad-headline-count"
                required
              />
              <span
                id="ad-headline-count"
                className="text-muted-foreground text-xs"
              >
                {headline.length}/{HEADLINE_MAX}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ad-body">{t("bodyLabel")}</Label>
              <Textarea
                id="ad-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={BODY_MAX}
                rows={3}
                placeholder={t("bodyPlaceholder")}
                aria-describedby="ad-body-count"
              />
              <span
                id="ad-body-count"
                className="text-muted-foreground text-xs"
              >
                {body.length}/{BODY_MAX}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="label-mono">{t("preview")}</span>
              <SponsoredCard
                preview
                item={{
                  id: "preview",
                  headline: headline.trim() || t("headlinePlaceholder"),
                  body: body.trim() || null,
                  listing,
                }}
              />
            </div>

            {error && (
              <p role="alert" className="text-destructive text-sm">
                {t(`error_${error}`)}
              </p>
            )}
            <Button
              type="submit"
              disabled={pending || headline.trim().length < HEADLINE_MIN}
              className="gap-2 self-start"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              {phase === null ? t("submit") : t("submitAgain")}
            </Button>
          </form>
        </>
      )}

      {(phase === "pending" || phase === "running") && error && (
        <p role="alert" className="text-destructive text-sm">
          {t(`error_${error}`)}
        </p>
      )}
    </section>
  );
}
