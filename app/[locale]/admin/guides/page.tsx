import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Pencil, Plus } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { localeMeta, type Locale } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/moderation";
import { getAllGuides, getOpenSuggestions } from "@/lib/guides";
import { guidesReady } from "@/lib/schema-ready";
import { Button } from "@/components/ui/button";
import { GuideTopicIcon } from "@/components/guides/guide-topic";
import { SuggestionActions } from "@/components/guides/suggestion-actions";
import type { Guide } from "@/types/guide";
import { cn } from "@/lib/utils";
import { countryLabel } from "@/lib/country-label";

export default async function AdminGuidesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user || !(await isAdmin(user.id))) notFound();

  const t = await getTranslations("Guides");
  const ready = await guidesReady();
  const [guides, suggestions] = await Promise.all([
    getAllGuides(),
    getOpenSuggestions(),
  ]);
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  // One row per guide, its languages side by side.
  const bySlug = new Map<string, Guide[]>();
  for (const g of guides)
    bySlug.set(g.slug, [...(bySlug.get(g.slug) ?? []), g]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link
        href="/admin"
        className="label-mono hover:text-cyan transition-colors"
      >
        ← {t("adminBack")}
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {t("adminTitle")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("adminSubtitle")}</p>
        </div>
        {ready && (
          <Button asChild className="gap-2">
            <Link href="/admin/guides/new">
              <Plus className="size-4" aria-hidden="true" />
              {t("new")}
            </Link>
          </Button>
        )}
      </div>

      {!ready && (
        <p className="panel text-muted-foreground mt-6 rounded-md p-4 text-sm">
          {t("needsMigration")}
        </p>
      )}

      <section className="mt-8 flex flex-col gap-3">
        <h2 className="font-display text-xl font-semibold">
          {t("suggestionsTitle", { count: suggestions.length })}
        </h2>
        {suggestions.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t("suggestionsEmpty")}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {suggestions.map((s) => (
              <li
                key={s.id}
                className="panel flex flex-col gap-2 rounded-md p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p dir="auto" className="text-air font-medium">
                      {s.title}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {s.suggester_name ?? t("someone")}
                      {s.city ? ` · ${s.city}` : ""} ·{" "}
                      {dateFmt.format(new Date(s.created_at))}
                    </p>
                  </div>
                  <SuggestionActions id={s.id} />
                </div>
                {s.note && (
                  <p
                    dir="auto"
                    className="text-foreground/90 text-sm whitespace-pre-wrap"
                  >
                    {s.note}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 text-sm">
                  <Link
                    href={`/admin/guides/new?title=${encodeURIComponent(s.title)}&city=${encodeURIComponent(s.city ?? "")}`}
                    className="text-cyan hover:underline"
                  >
                    {t("suggestionWrite")}
                  </Link>
                  {s.request_id && (
                    <Link
                      href={`/help/${s.request_id}`}
                      className="text-cyan hover:underline"
                    >
                      {t("suggestionRequest")}
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 flex flex-col gap-3">
        <h2 className="font-display text-xl font-semibold">
          {t("allGuides", { count: bySlug.size })}
        </h2>
        <ul className="bg-border flex flex-col gap-px overflow-hidden rounded-md">
          {[...bySlug.entries()].map(([slug, versions]) => (
            <li key={slug} className="bg-depth-1 flex flex-col gap-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <GuideTopicIcon
                  topic={versions[0].topic}
                  className="text-cyan size-4"
                />
                <span dir="auto" className="text-air font-medium">
                  {versions[0].title}
                </span>
                <span className="text-muted-foreground text-xs">
                  /guides/{slug} ·{" "}
                  {versions[0].city ??
                    t("allOf", {
                      country: countryLabel(versions[0].country, locale),
                    })}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {versions.map((v) => (
                  <Link
                    key={v.id}
                    href={`/admin/guides/${v.id}`}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs transition-colors",
                      v.status === "published"
                        ? "border-cyan/50 text-cyan hover:bg-cyan/10"
                        : "border-border text-muted-foreground hover:text-air"
                    )}
                  >
                    <Pencil className="size-3" aria-hidden="true" />
                    {localeMeta[v.locale as Locale]?.native ?? v.locale}
                    {v.status === "draft" && ` · ${t("draft")}`}
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
