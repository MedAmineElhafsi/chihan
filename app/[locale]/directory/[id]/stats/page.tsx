import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BarChart3, Check } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getListingById } from "@/lib/listings";
import {
  STAT_KINDS,
  businessPlanAvailable,
  getListingStats,
  hasBusiness,
} from "@/lib/business";
import { businessReady } from "@/lib/schema-ready";
import { BusinessPlanButton } from "@/components/business/business-plan-button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Business" });
  return { title: t("statsTitle") };
}

export default async function ListingStatsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!(await businessReady())) notFound();

  const listing = await getListingById(id);
  if (!listing) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  // Someone else's numbers are not anybody's business.
  if (listing.owner_user_id !== user.id) notFound();

  const t = await getTranslations("Business");
  const [paid, canBuy] = await Promise.all([
    hasBusiness(user.id),
    businessPlanAvailable(),
  ]);
  const stats = await getListingStats(id, 30);

  const peak = Math.max(1, ...stats.days.map((d) => d.views + d.taps));
  const dayFmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  });
  const num = new Intl.NumberFormat(locale);
  const firstDay = stats.days[0]?.day;
  const totalTaps = STAT_KINDS.filter((k) => k !== "view").reduce(
    (n, k) => n + stats.totals[k],
    0
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link
        href={`/directory/${id}`}
        className="text-muted-foreground hover:text-foreground text-sm transition-colors"
      >
        ← {listing.name}
      </Link>

      <div className="mt-3 flex flex-col gap-3">
        <span className="label-mono">{t("eyebrow")}</span>
        <h1 className="font-display text-air text-[clamp(1.75rem,4vw,2.75rem)] leading-tight font-semibold tracking-tight">
          {t("statsTitle")}
        </h1>
        <p className="text-muted-foreground max-w-xl text-sm">
          {t("statsSubtitle")}
        </p>
      </div>

      {/* The headline numbers are free; the plan buys the detail below. */}
      <dl className="mt-8 grid grid-cols-2 gap-px sm:grid-cols-4">
        {(
          [
            { key: "views", value: stats.totals.view },
            { key: "taps", value: totalTaps },
            { key: "calls", value: stats.totals.call },
            { key: "whatsapp", value: stats.totals.whatsapp },
          ] as const
        ).map(({ key, value }) => (
          <div key={key} className="panel rounded-lg p-4">
            <dt className="text-muted-foreground text-xs">{t(key)}</dt>
            <dd className="font-display mt-1 text-2xl font-semibold">
              {num.format(value)}
            </dd>
          </div>
        ))}
      </dl>

      {paid ? (
        <>
          <section className="mt-10">
            <h2 className="font-display text-lg font-semibold">
              {t("last30")}
            </h2>
            {/* Plain bars: a shape anyone can read at a glance, and no
                charting library shipped to a phone on a slow connection. */}
            <ol className="mt-4 flex h-40 items-end gap-px" aria-hidden="true">
              {stats.days.map((d) => (
                <li
                  key={d.day}
                  className="bg-secondary relative flex-1 rounded-t-sm"
                  style={{
                    height: `${Math.max(2, ((d.views + d.taps) / peak) * 100)}%`,
                  }}
                >
                  <span
                    className="bg-cyan/70 absolute inset-x-0 bottom-0 rounded-t-sm"
                    style={{
                      height: `${
                        d.views + d.taps === 0
                          ? 0
                          : (d.views / (d.views + d.taps)) * 100
                      }%`,
                    }}
                  />
                </li>
              ))}
            </ol>
            <div className="text-muted-foreground mt-2 flex justify-between text-xs">
              <span>{firstDay ? dayFmt.format(new Date(firstDay)) : ""}</span>
              <span>{t("today")}</span>
            </div>

            {/* The same numbers as a table, which is what a screen reader
                and anyone who wants the exact figure actually needs. */}
            <table className="mt-6 w-full text-sm">
              <caption className="sr-only">{t("last30")}</caption>
              <thead>
                <tr className="text-muted-foreground text-start text-xs">
                  <th scope="col" className="py-1 font-normal">
                    {t("action")}
                  </th>
                  <th scope="col" className="py-1 text-end font-normal">
                    {t("count")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {STAT_KINDS.map((kind) => (
                  <tr key={kind} className="border-border border-t">
                    <th scope="row" className="py-2 text-start font-normal">
                      {t(`kind_${kind}` as never)}
                    </th>
                    <td className="py-2 text-end font-mono">
                      {num.format(stats.totals[kind])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <div className="mt-10">
            <BusinessPlanButton manage />
          </div>
        </>
      ) : (
        <section className="panel border-cyan/25 ring-cyan/15 mt-10 rounded-lg p-5 ring-1">
          <div className="flex items-start gap-3">
            <BarChart3 className="text-cyan mt-0.5 size-5 shrink-0" />
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">
                  {t("upsellTitle")}
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  {t("upsellBody")}
                </p>
              </div>
              <ul className="flex flex-col gap-1.5 text-sm">
                {(["perk1", "perk2", "perk3"] as const).map((k) => (
                  <li key={k} className="flex items-start gap-2">
                    <Check className="text-cyan mt-0.5 size-4 shrink-0" />
                    {t(k)}
                  </li>
                ))}
              </ul>
              {canBuy ? (
                <BusinessPlanButton listingId={id} />
              ) : (
                <p className="text-muted-foreground text-sm">
                  {t("notAvailable")}
                </p>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
