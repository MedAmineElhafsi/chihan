"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, TriangleAlert, X } from "lucide-react";

import { Link, useRouter } from "@/i18n/navigation";
import { decideClassified } from "@/lib/classified-actions";
import { Button } from "@/components/ui/button";
import type { Classified } from "@/types/classified";

/**
 * Posts the board held back: the wording that stopped them, how many
 * members reported them, and the two decisions an administrator can make.
 */
export function HeldQueue({
  items,
}: {
  items: Array<Classified & { reports: number }>;
}) {
  const t = useTranslations("Board");
  const router = useRouter();
  const [pending, start] = useTransition();

  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("heldEmpty")}</p>;
  }

  const decide = (id: string, decision: "release" | "remove") =>
    start(async () => {
      await decideClassified(id, decision);
      router.refresh();
    });

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.id} className="panel flex flex-col gap-3 rounded-md p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`${item.kind === "housing" ? "/housing" : "/jobs"}/${item.id}`}
                dir="auto"
                className="text-air hover:text-cyan font-medium"
              >
                {item.title}
              </Link>
              <p className="text-muted-foreground text-xs">
                {[
                  item.city,
                  t(item.kind === "housing" ? "housingTab" : "jobsTab"),
                ]
                  .filter(Boolean)
                  .join(" · ")}
                {item.reports > 0 &&
                  ` · ${t("reportedBy", { count: item.reports })}`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => decide(item.id, "release")}
                className="gap-1.5"
              >
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" aria-hidden="true" />
                )}
                {t("release")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => decide(item.id, "remove")}
                className="text-destructive gap-1.5"
              >
                <X className="size-3.5" aria-hidden="true" />
                {t("removeIt")}
              </Button>
            </div>
          </div>

          {item.flags.length > 0 && (
            <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
              <TriangleAlert
                className="text-destructive size-3.5"
                aria-hidden="true"
              />
              {item.flags.map((f) => t(`flagShort_${f}` as never)).join(" · ")}
            </p>
          )}
          <p
            dir="auto"
            className="text-foreground/90 line-clamp-3 text-sm whitespace-pre-wrap"
          >
            {item.description}
          </p>
        </li>
      ))}
    </ul>
  );
}
