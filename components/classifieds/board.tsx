import { getTranslations } from "next-intl/server";
import { Briefcase, House, Plus } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getClassifieds } from "@/lib/classifieds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  HOUSING_TYPES,
  JOB_TYPES,
  type ClassifiedKind,
} from "@/types/classified";
import { ClassifiedCard } from "./classified-card";
import { SafetyNotes } from "./safety-notes";

/** Both boards are the same board; only the words and the fields differ. */
export async function ClassifiedsBoard({
  kind,
  viewerId,
  verified,
  params,
}: {
  kind: ClassifiedKind;
  viewerId: string;
  verified: boolean;
  params: { city?: string; type?: string; mine?: string };
}) {
  const t = await getTranslations("Board");
  const mine = params.mine === "1";
  const items = await getClassifieds(
    kind,
    { city: params.city, type: params.type, mine },
    viewerId
  );
  const base = kind === "housing" ? "/housing" : "/jobs";
  const types = kind === "housing" ? HOUSING_TYPES : JOB_TYPES;

  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = {
      city: params.city,
      type: params.type,
      mine: params.mine,
      ...over,
    };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `${base}?${s}` : base;
  };
  const chip = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-sm transition-colors",
      active
        ? "border-cyan bg-cyan/15 text-cyan"
        : "border-border bg-depth-0/40 text-muted-foreground hover:text-air"
    );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-3">
        <span className="label-mono">{t("eyebrow")}</span>
        <h1 className="font-display text-air text-[clamp(2rem,5vw,3.25rem)] leading-[0.95] font-semibold tracking-tight">
          {t(kind === "housing" ? "housingTitle" : "jobsTitle")}
        </h1>
        <p className="text-muted-foreground max-w-xl">
          {t(kind === "housing" ? "housingSubtitle" : "jobsSubtitle")}
        </p>
      </div>

      {/* The two boards, side by side wherever you are. */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link href="/jobs" className={chip(kind === "job")}>
          <Briefcase className="size-4" aria-hidden="true" />
          {t("jobsTab")}
        </Link>
        <Link href="/housing" className={chip(kind === "housing")}>
          <House className="size-4" aria-hidden="true" />
          {t("housingTab")}
        </Link>
        <Button asChild className="ms-auto gap-2">
          <Link href={`${base}/new`}>
            <Plus className="size-4" aria-hidden="true" />
            {t(kind === "housing" ? "postHousing" : "postJob")}
          </Link>
        </Button>
      </div>

      <SafetyNotes kind={kind} className="mt-6" />

      {!verified && (
        <p className="panel text-muted-foreground mt-4 rounded-md p-4 text-sm">
          {t("onlyVerifiedPost")}
        </p>
      )}

      <div className="border-border mt-6 flex flex-col gap-3 border-b pb-5">
        <form action="" method="get" className="flex items-end gap-2">
          <label className="flex flex-col gap-2">
            <span className="label-mono">{t("cityLabel")}</span>
            <Input
              name="city"
              defaultValue={params.city ?? ""}
              className="w-48"
              aria-label={t("cityLabel")}
            />
          </label>
          {params.type && (
            <input type="hidden" name="type" value={params.type} />
          )}
          <Button type="submit" variant="outline">
            {t("show")}
          </Button>
        </form>
        <div className="flex flex-wrap gap-2">
          <Link href={qs({ type: undefined })} className={chip(!params.type)}>
            {t("allTypes")}
          </Link>
          {types.map((x) => (
            <Link
              key={x}
              href={qs({ type: x })}
              className={chip(params.type === x)}
            >
              {t(`${kind === "housing" ? "housing" : "job"}_${x}` as never)}
            </Link>
          ))}
          <Link
            href={qs({ mine: mine ? undefined : "1" })}
            className={cn(chip(mine), "ms-auto")}
          >
            {t("mine")}
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground py-20 text-center">
          {mine ? t("emptyMine") : t("empty")}
        </p>
      ) : (
        <div className="bg-border mt-6 grid gap-px sm:grid-cols-2">
          {items.map((item) => (
            <ClassifiedCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
