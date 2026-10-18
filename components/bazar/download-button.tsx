"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Download, Loader2 } from "lucide-react";

import { takeDownload } from "@/lib/shop-actions";
import { Button } from "@/components/ui/button";

/**
 * Taking a free download.
 *
 * No account and no form — somebody who followed a link into this page
 * from a WhatsApp group taps once and has the file. The link is signed for
 * them at the moment they ask, so nothing shareable leaks out of here.
 */
export function DownloadButton({
  productId,
  fileName,
}: {
  productId: string;
  /** What the saved file should be called. */
  fileName: string;
}) {
  const t = useTranslations("Bazar");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function take() {
    setError(null);
    start(async () => {
      const res = await takeDownload(productId);
      if (!res.ok) {
        setError(t(`error_${res.error}` as never));
        return;
      }
      // An anchor rather than a navigation: the page stays where it is, so
      // a reader can take the other sizes too.
      const a = document.createElement("a");
      a.href = res.url;
      a.download = fileName;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setDone(true);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="lg"
        onClick={take}
        disabled={pending}
        className="glow w-full gap-2 sm:w-auto"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : done ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Download className="size-4" aria-hidden="true" />
        )}
        {done ? t("downloadedAgain") : t("download")}
      </Button>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
