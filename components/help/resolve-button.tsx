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
}: {
  requestId: string;
  status: string;
}) {
  const t = useTranslations("Help");
  const router = useRouter();
  const [pending, startT] = useTransition();

  if (status !== "open") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm bg-success/15 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-success">
        <CheckCircle2 className="size-3.5" />
        {t("resolved")}
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
      {t("markResolved")}
    </Button>
  );
}
