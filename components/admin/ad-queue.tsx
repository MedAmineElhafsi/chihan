"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { decideAd } from "@/lib/ad-actions";
import { isolate } from "@/lib/bidi";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SponsoredCard } from "@/components/feed/sponsored-card";
import type { PendingAd } from "@/types/ad";

/**
 * Ads waiting to run. Each one is shown exactly as Explore would show it, so
 * approving is approving what people will see. Approval starts the week;
 * a decline goes back to the owner with the note, so write one.
 */
export function AdQueue({ items }: { items: PendingAd[] }) {
  const t = useTranslations("Admin");

  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("adsEmpty")}</p>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {items.map((item) => (
        <QueueRow key={item.ad.id} item={item} />
      ))}
    </ul>
  );
}

function QueueRow({ item }: { item: PendingAd }) {
  const t = useTranslations("Admin");
  const locale = useLocale();
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"approve" | "decline" | null>(null);
  const [failed, setFailed] = useState(false);
  const { ad, listing, ownerName } = item;

  async function decide(approve: boolean) {
    setBusy(approve ? "approve" : "decline");
    setFailed(false);
    const res = await decideAd(ad.id, approve, note);
    setBusy(null);
    if (!res.ok) return setFailed(true);
    router.refresh();
  }

  const sent = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ad.created_at));

  return (
    <li className="panel flex flex-col gap-3 rounded-lg p-4">
      <p className="text-muted-foreground text-sm">
        {t("adsFrom", {
          name: isolate(ownerName ?? "—"),
          date: isolate(sent),
        })}{" "}
        ·{" "}
        <Link
          href={`/directory/${listing.id}`}
          className="text-cyan hover:underline"
        >
          {t("adsOpenListing")}
        </Link>
      </p>
      <SponsoredCard
        preview
        item={{ id: ad.id, headline: ad.headline, body: ad.body, listing }}
      />
      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
        placeholder={t("adsNotePlaceholder")}
        aria-label={t("adsNotePlaceholder")}
      />
      {failed && (
        <p role="alert" className="text-destructive text-sm">
          {t("verifyFailed")}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={busy !== null}
          onClick={() => decide(true)}
          className="gap-1.5"
        >
          {busy === "approve" && <Loader2 className="size-3.5 animate-spin" />}
          {t("adsApprove")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy !== null}
          onClick={() => decide(false)}
          className="gap-1.5"
        >
          {busy === "decline" && <Loader2 className="size-3.5 animate-spin" />}
          {t("adsDecline")}
        </Button>
      </div>
    </li>
  );
}
