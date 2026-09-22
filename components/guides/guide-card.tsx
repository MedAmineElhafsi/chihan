import { getLocale, getTranslations } from "next-intl/server";
import { MapPin } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { localeMeta, type Locale } from "@/i18n/routing";
import type { Guide } from "@/types/guide";
import { countryLabel } from "@/lib/country-label";
import { GuideTopicIcon } from "./guide-topic";

/** A guide on the list: what it answers, where it holds, in which languages. */
export async function GuideCard({ guide }: { guide: Guide }) {
  const t = await getTranslations("Guides");
  const locale = await getLocale();
  return (
    <Link
      href={`/guides/${guide.slug}`}
      className="group bg-depth-1 hover:bg-depth-2 relative flex flex-col gap-3 p-5 transition-colors duration-300"
    >
      <span className="bg-cyan absolute inset-x-0 top-0 h-px scale-x-0 transition-transform duration-500 group-hover:scale-x-100" />
      <span className="text-cyan inline-flex items-center gap-1.5 font-mono text-[0.625rem] tracking-[0.14em] uppercase">
        <GuideTopicIcon topic={guide.topic} className="size-3.5" />
        {t(`topic_${guide.topic}` as never)}
      </span>
      <h3
        dir="auto"
        className="font-display text-air text-lg leading-snug font-semibold tracking-tight"
      >
        {guide.title}
      </h3>
      {guide.summary && (
        <p
          dir="auto"
          className="text-muted-foreground line-clamp-2 text-sm leading-relaxed"
        >
          {guide.summary}
        </p>
      )}
      <div className="text-muted-foreground mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-2 text-xs">
        <span className="flex items-center gap-1">
          <MapPin className="text-cyan size-3" aria-hidden="true" />
          {guide.city ??
            t("allOf", { country: countryLabel(guide.country, locale) })}
        </span>
        <span>
          {guide.languages
            .map((l) => localeMeta[l as Locale]?.native ?? l)
            .join(" · ")}
        </span>
      </div>
    </Link>
  );
}
