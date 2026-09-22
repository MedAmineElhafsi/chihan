import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  CalendarCheck,
  ExternalLink,
  HandHeart,
  MapPin,
  Pencil,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import { localeMeta, type Locale } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/moderation";
import { getGuide } from "@/lib/guides";
import { preview } from "@/lib/og";
import { countryLabel } from "@/lib/country-label";
import { GuideBody } from "@/components/guides/guide-body";
import { GuideTopicIcon } from "@/components/guides/guide-topic";
import { ShareButton } from "@/components/share/share-button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const guide = await getGuide(slug, locale);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.summary ?? undefined,
    ...preview({
      title: guide.title,
      description: guide.summary ?? guide.title,
      locale,
      type: "article",
    }),
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  const admin = user ? await isAdmin(user.id) : false;
  const guide = await getGuide(slug, locale, { includeDrafts: admin });
  if (!guide) notFound();

  const t = await getTranslations("Guides");
  const reviewed = guide.reviewed_on
    ? new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
        new Date(`${guide.reviewed_on}T12:00:00Z`)
      )
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/guides"
        className="label-mono hover:text-cyan transition-colors"
      >
        ← {t("back")}
      </Link>

      <article className="mt-5 flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-cyan/10 text-cyan inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 font-mono text-[0.625rem] tracking-[0.14em] uppercase">
            <GuideTopicIcon topic={guide.topic} className="size-3.5" />
            {t(`topic_${guide.topic}` as never)}
          </span>
          <span className="text-muted-foreground inline-flex items-center gap-1 text-sm">
            <MapPin className="text-cyan size-3.5" aria-hidden="true" />
            {guide.city ??
              t("allOf", { country: countryLabel(guide.country, locale) })}
          </span>
          {guide.status === "draft" && (
            <span className="bg-secondary text-muted-foreground rounded-sm px-2 py-1 font-mono text-[0.625rem] tracking-[0.14em] uppercase">
              {t("draft")}
            </span>
          )}
          <span className="ms-auto flex items-center gap-2">
            {admin && (
              <Link
                href={`/admin/guides/${guide.id}`}
                className="text-muted-foreground hover:text-air inline-flex items-center gap-1 text-sm"
              >
                <Pencil className="size-3.5" aria-hidden="true" />
                {t("edit")}
              </Link>
            )}
            <ShareButton path={`/guides/${guide.slug}`} title={guide.title} />
          </span>
        </div>

        <GuideBody guide={guide} readerLocale={locale} />

        <div className="rule-t text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-2 pt-4 text-sm">
          {reviewed && (
            <span className="flex items-center gap-1.5">
              <CalendarCheck className="text-cyan size-4" aria-hidden="true" />
              {t("reviewed", { date: reviewed })}
            </span>
          )}
          {guide.languages.length > 1 && (
            <span className="flex flex-wrap items-center gap-x-2">
              {t("alsoIn")}
              {guide.languages
                .filter((l) => l !== guide.locale)
                .map((l) => (
                  <Link
                    key={l}
                    href={`/guides/${guide.slug}`}
                    locale={l as Locale}
                    className="text-cyan hover:underline"
                  >
                    {localeMeta[l as Locale]?.native ?? l}
                  </Link>
                ))}
            </span>
          )}
        </div>
      </article>

      {guide.links.length > 0 && (
        <section className="mt-8 flex flex-col gap-3">
          <h2 className="font-display text-air text-xl font-semibold">
            {t("sources")}
          </h2>
          <ul className="flex flex-col gap-2">
            {guide.links.map((l) => (
              <li key={l.url}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="panel hover:border-cyan/40 flex items-center justify-between gap-3 rounded-md p-3.5 text-sm transition-colors"
                >
                  <span className="min-w-0">
                    <span dir="auto" className="text-air block font-medium">
                      {l.label || l.url}
                    </span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {l.url.replace(/^https:\/\//, "")}
                    </span>
                  </span>
                  <ExternalLink
                    className="text-cyan size-4 shrink-0"
                    aria-hidden="true"
                  />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel mt-8 flex flex-wrap items-center justify-between gap-4 rounded-lg p-5">
        <div>
          <h2 className="font-display text-air text-lg font-semibold">
            {t("stuckTitle")}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">{t("stuckBody")}</p>
        </div>
        <Link
          href="/help"
          className="border-cyan/40 text-cyan hover:bg-cyan/10 inline-flex items-center gap-2 rounded-sm border px-4 py-2 font-mono text-xs tracking-[0.14em] uppercase transition-colors"
        >
          <HandHeart className="size-4" aria-hidden="true" />
          {t("stuckCta")}
        </Link>
      </section>
    </div>
  );
}
