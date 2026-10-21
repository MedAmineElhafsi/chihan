"use client";

import { useTranslations } from "next-intl";

/**
 * How much of the world is actually on the globe.
 *
 * These are the same three numbers the hero shows, kept on screen after the
 * hero curtain lifts. Before this they went with it — which is the moment a
 * visitor starts spinning the globe and wondering how big this place really
 * is, and the moment they could no longer be told.
 *
 * They count what is drawn: a member appears here once their profile is
 * public and has a location, so the figure and the dots always agree.
 */
export function GlobeStats({
  members,
  cities,
  countries,
}: {
  members: number;
  cities: number;
  countries: number;
}) {
  const t = useTranslations("Landing");

  const counters = [
    { value: members, label: t("statMembers") },
    { value: cities, label: t("statCities") },
    { value: countries, label: t("statCountries") },
  ];

  // No heading: the results panel on the other side of the globe is already
  // titled "On the globe", and two things on one screen under the same name
  // is worse than none. The labels carry it.
  return (
    <dl className="panel flex gap-5 rounded-md px-4 py-3">
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
