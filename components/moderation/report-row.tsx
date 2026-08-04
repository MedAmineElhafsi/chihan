"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Ban, ExternalLink, Loader2, Trash2, X } from "lucide-react";

import { Link, useRouter } from "@/i18n/navigation";
import { resolveReport } from "@/lib/report-actions";
import { Button } from "@/components/ui/button";
import type { Report } from "@/lib/moderation";
import { cn } from "@/lib/utils";

function targetHref(report: Report): string | null {
  if (report.target_type === "profile") return `/u/${report.target_id}`;
  if (report.target_type === "listing")
    return `/directory/${report.target_id}`;
  if (report.target_type === "post") return `/feed`;
  return null;
}

export function ReportRow({ report }: { report: Report }) {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [pending, startT] = useTransition();
  const isOpen = report.status === "open";
  const href = targetHref(report);
  const when = new Date(report.created_at).toLocaleString();

  function resolve(action: "dismiss" | "remove" | "ban") {
    startT(async () => {
      await resolveReport(report.id, action);
      router.refresh();
    });
  }

  return (
    <div className="glass flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            {report.target_type}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              report.status === "open" && "bg-gold/15 text-gold",
              report.status === "dismissed" &&
                "bg-secondary text-muted-foreground",
              report.status === "actioned" &&
                "bg-kurd-red/15 text-kurd-red"
            )}
          >
            {report.status}
          </span>
          {href ? (
            <Link
              href={href}
              className="inline-flex items-center gap-1 truncate text-xs font-medium text-gold hover:underline"
            >
              <ExternalLink className="size-3 shrink-0" />
              {t("targetLink")}
            </Link>
          ) : (
            <span className="truncate font-mono text-xs text-muted-foreground">
              {report.target_id}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-foreground/90">
          {report.reason || t("noReason")}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{when}</p>
      </div>
      {isOpen && (
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => resolve("dismiss")}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <X className="size-4" />
            )}
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
          {report.target_type === "profile" && (
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={() => resolve("ban")}
              disabled={pending}
            >
              <Ban className="size-4" />
              {t("ban")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
