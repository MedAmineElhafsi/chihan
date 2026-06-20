"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BadgeCheck, Loader2 } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { claimListing } from "@/lib/listing-actions";
import { Button } from "@/components/ui/button";

export function ClaimButton({ listingId }: { listingId: string }) {
  const t = useTranslations("Directory");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function claim() {
    setLoading(true);
    const res = await claimListing(listingId);
    setLoading(false);
    if (res.ok) router.refresh();
  }

  return (
    <Button variant="outline" className="gap-2" onClick={claim} disabled={loading}>
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <BadgeCheck className="size-4" />
      )}
      {t("claim")}
    </Button>
  );
}
