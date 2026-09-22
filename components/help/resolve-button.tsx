"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2 } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { setHelpStatus } from "@/lib/help-actions";
import { Button } from "@/components/ui/button";

export function ResolveButton({
  requestId,
  status,
  giving = false,
}: {
  requestId: string;
  status: string;
  /** A give is closed by being given away, not by being solved. */
  giving?: boolean;
}) {
  const t = useTranslations("Help");
  const router = useRouter();
  const [pending, startT] = useTransition();

  if (status !== "open") {
    return (
      <span className="bg-success/15 text-success inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 font-mono text-[0.625rem] tracking-[0.14em] uppercase">
        <CheckCircle2 className="size-3.5" />
        {giving ? t("given") : t("resolved")}
      </span>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      disabled={pending}
      onClick={() =>
        startT(async () => {
          await setHelpStatus(requestId, "resolved");
          router.refresh();
        })
      }
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <CheckCircle2 className="size-4" />
      )}
      {giving ? t("markGiven") : t("markResolved")}
    </Button>
  );
}
