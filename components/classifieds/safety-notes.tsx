import { getTranslations } from "next-intl/server";
import { ShieldAlert, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ClassifiedKind } from "@/types/classified";

/**
 * The three rules, on every board and above every contact button. They are
 * short on purpose: a newcomer reading their fourth language of the day
 * will read three lines, not a page.
 */
export async function SafetyNotes({
  kind,
  className,
}: {
  kind: ClassifiedKind;
  className?: string;
}) {
  const t = await getTranslations("Board");
  const keys =
    kind === "housing"
      ? ["viewFirst", "noDeposit", "contactHere"]
      : ["noFee", "noDocuments", "contactHere"];
  return (
    <section
      className={cn(
        "border-cyan/25 bg-cyan/5 flex flex-col gap-2 rounded-md border p-4",
        className
      )}
    >
      <h2 className="text-air flex items-center gap-2 text-sm font-medium">
        <ShieldAlert className="text-cyan size-4" aria-hidden="true" />
        {t("safetyTitle")}
      </h2>
      <ul className="text-muted-foreground flex list-disc flex-col gap-1 ps-5 text-sm">
        {keys.map((k) => (
          <li key={k}>{t(`safety_${k}` as never)}</li>
        ))}
      </ul>
    </section>
  );
}

/** What was found in this post's own words, said plainly. */
export async function FlagWarnings({ flags }: { flags: string[] }) {
  const t = await getTranslations("Board");
  if (flags.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2">
      {flags.map((f) => (
        <li
          key={f}
          className="border-destructive/40 bg-destructive/10 text-foreground/90 flex items-start gap-2 rounded-md border p-3 text-sm"
        >
          <TriangleAlert
            className="text-destructive mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          {t(`flag_${f}` as never)}
        </li>
      ))}
    </ul>
  );
}
