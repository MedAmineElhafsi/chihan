"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Trash2, X } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { resolveReport } from "@/lib/report-actions";
import { Button } from "@/components/ui/button";
import type { Report } from "@/lib/moderation";

export function ReportRow({ report }: { report: Report }) {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [pending, startT] = useTransition();

  function resolve(action: "dismiss" | "remove") {
    startT(async () => {
      await resolveReport(report.id, action);
      router.refresh();
    });
  }

  return (
    <div className="glass flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            {report.target_type}
          </span>
          <span className="truncate font-mono text-xs text-muted-foreground">
            {report.target_id}
          </span>
        </div>
        <p className="mt-1 text-sm text-foreground/90">
          {report.reason || t("noReason")}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => resolve("dismiss")}
          disabled={pending}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
          {t("dismiss")}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="gap-1.5"
          onClick={() => resolve("remove")}
          disabled={pending}
        >
          <Trash2 className="size-4" />
          {t("remove")}
        </Button>
      </div>
    </div>
  );
}
