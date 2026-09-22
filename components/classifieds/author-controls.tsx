"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, RefreshCw, Trash2 } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import {
  deleteClassified,
  setClassifiedStatus,
} from "@/lib/classified-actions";
import { Button } from "@/components/ui/button";

/** What the person who posted it can do with it. */
export function AuthorControls({
  id,
  kind,
  status,
}: {
  id: string;
  kind: "job" | "housing";
  status: string;
}) {
  const t = useTranslations("Board");
  const router = useRouter();
  const [pending, start] = useTransition();

  const act = (action: "filled" | "removed" | "renew") =>
    start(async () => {
      await setClassifiedStatus(id, action);
      router.refresh();
    });

  return (
    <div className="flex flex-wrap gap-2">
      {status === "open" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => act("filled")}
          disabled={pending}
          className="gap-1.5"
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
          )}
          {t(kind === "housing" ? "markTaken" : "markFilled")}
        </Button>
      )}
      {(status === "filled" || status === "removed") && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => act("renew")}
          disabled={pending}
          className="gap-1.5"
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          {t("repost")}
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(t("deleteConfirm"))) return;
          start(async () => {
            await deleteClassified(id);
            router.push(kind === "housing" ? "/housing" : "/jobs");
          });
        }}
        className="text-muted-foreground gap-1.5"
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
        {t("delete")}
      </Button>
    </div>
  );
}
