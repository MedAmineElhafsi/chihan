"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/**
 * How much of the world is actually on the globe.
 *
 * It sits in the head of the results panel, above the filters, and stays
 * there when the rest of the panel is folded away — a visitor spinning the
 * globe should never have to wonder how big this place is, and folding the
 * menu is not a request to be told less about the community.
 *
 * It counts what is drawn, so the figures and the dots always agree.
 */
export function GlobeStats({
  members,
  cities,
  countries,
  className,
}: {
  members: number;
  cities: number;
  countries: number;
  className?: string;
}) {
  const t = useTranslations("Landing");

  const counters = [
    { value: members, label: t("statMembers") },
    { value: cities, label: t("statCities") },
    { value: countries, label: t("statCountries") },
  ];

  return (
    <dl className={cn("flex gap-5", className)}>
      {counters.map((c) => (
        <div key={c.label}>
          <dd className="text-cyan font-mono text-xl font-medium tabular-nums">
            {String(c.value).padStart(2, "0")}
          </dd>
          <dt className="label-mono mt-1">{c.label}</dt>
        </div>
      ))}
    </dl>
  );
}
