import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BookOpenCheck, MapPin } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOwnProfile } from "@/lib/profiles";
import { getGuides, guidesEnabled } from "@/lib/guides";
import { LAUNCH_CITY, LAUNCH_COUNTRY } from "@/lib/constants";
import { preview } from "@/lib/og";
import { countryLabel } from "@/lib/country-label";
import { cn } from "@/lib/utils";
import { GUIDE_TOPICS, type GuideTopic } from "@/types/guide";
import { GuideCard } from "@/components/guides/guide-card";
import { GuideTopicIcon } from "@/components/guides/guide-topic";
import { SuggestGuideButton } from "@/components/guides/suggest-guide-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Guides" });
  return {
    title: t("title"),
    description: t("subtitle"),
    ...preview({ title: t("shareTitle"), description: t("subtitle"), locale }),
  };
}

export default async function GuidesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ city?: string; topic?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await guidesEnabled())) notFound();

  const sp = await searchParams;
  const t = await getTranslations("Guides");
  const user = await getCurrentUser();
  const profile = user ? await getOwnProfile(user.id) : null;

  const city = (sp.city ?? "").trim() || profile?.city || LAUNCH_CITY;
  const country = profile?.country || LAUNCH_COUNTRY;
  const topic = (GUIDE_TOPICS as readonly string[]).includes(sp.topic ?? "")
    ? (sp.topic as GuideTopic)
    : undefined;

  const guides = await getGuides(
    { city, country },
    locale,
    topic ? [topic] : undefined
  );
  const total = guides.city.length + guides.country.length;

  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { city: sp.city, topic, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/guides?${s}` : "/guides";
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
        <span className="label-mono">
          {city} — {t("count", { count: total })}
        </span>
        <h1 className="font-display text-air text-[clamp(2rem,5vw,3.25rem)] leading-[0.95] font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground max-w-xl">{t("subtitle")}</p>
      </div>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
        {/* A plain GET form: the city is part of the address, so a list for
            Hamburg can be shared as a link. */}
        <form action="" method="get" className="flex items-end gap-2">
          <label className="flex flex-col gap-2">
            <span className="label-mono">{t("cityLabel")}</span>
            <Input
              name="city"
              defaultValue={city}
              className="w-48"
              aria-label={t("cityLabel")}
            />
          </label>
          {topic && <input type="hidden" name="topic" value={topic} />}
          <Button type="submit" variant="outline">
            {t("show")}
          </Button>
        </form>
        {user && <SuggestGuideButton defaultCity={city} />}
      </div>

      <div className="border-border mt-6 flex flex-wrap gap-2 border-b pb-5">
        <Link href={qs({ topic: undefined })} className={chip(!topic)}>
          {t("allTopics")}
        </Link>
        {GUIDE_TOPICS.map((tp) => (
          <Link
            key={tp}
            href={qs({ topic: tp })}
            className={chip(topic === tp)}
          >
            <GuideTopicIcon topic={tp} className="size-3.5" />
            {t(`topic_${tp}` as never)}
          </Link>
        ))}
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <BookOpenCheck className="text-cyan size-8" aria-hidden="true" />
          <p className="text-air max-w-sm text-balance">
            {t("empty", { city })}
          </p>
          <p className="text-muted-foreground max-w-sm text-sm text-balance">
            {t("emptyBody")}
          </p>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-10">
          {guides.city.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="font-display text-air flex items-center gap-2 text-xl font-semibold">
                <MapPin className="text-cyan size-5" aria-hidden="true" />
                {t("inCity", { city })}
              </h2>
              <div className="bg-border grid gap-px sm:grid-cols-2">
                {guides.city.map((g) => (
                  <GuideCard key={g.slug} guide={g} />
                ))}
                {/* An odd card would leave half a row painted in the hairline
                    colour; this fills it with the cards' own background. */}
                {guides.city.length % 2 === 1 && (
                  <div
                    className="bg-depth-1 hidden sm:block"
                    aria-hidden="true"
                  />
                )}
              </div>
            </section>
          )}
          {guides.country.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="font-display text-air text-xl font-semibold">
                {t("allOf", { country: countryLabel(country, locale) })}
              </h2>
              <div className="bg-border grid gap-px sm:grid-cols-2">
                {guides.country.map((g) => (
                  <GuideCard key={g.slug} guide={g} />
                ))}
                {guides.country.length % 2 === 1 && (
                  <div
                    className="bg-depth-1 hidden sm:block"
                    aria-hidden="true"
                  />
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
