"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ExploreClient } from "./explore-client";
import type { GlobePoint } from "@/lib/globe";
import { cn } from "@/lib/utils";

/**
 * Immersive home: the globe *is* the page. A hero curtain sits over it and
 * dissolves the moment the visitor engages — the product introduces itself,
 * then gets out of the way.
 */
export function GlobeHome({
  points,
  stats,
}: {
  points: GlobePoint[];
  stats: { members: number; places: number; countries: number };
}) {
  const t = useTranslations("Landing");
  const [entered, setEntered] = useState(false);

  const counters = [
    { value: stats.members, label: t("statMembers") },
    { value: stats.places, label: t("statPlaces") },
    { value: stats.countries, label: t("statCountries") },
  ];

  return (
    <div className="relative h-[calc(100dvh-3.5rem)] w-full overflow-hidden">
      {/* The globe, always live underneath. While the curtain is up it has no
          chrome and sits off-centre so the hero copy has clean space. */}
      <div className="absolute inset-0">
        <ExploreClient
          points={points}
          chrome={entered}
          offsetRight={!entered}
        />
      </div>

      {/* Hero curtain */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-20 transition-all duration-1000 ease-out",
          entered ? "opacity-0" : "opacity-100"
        )}
        aria-hidden={entered}
      >
        {/* Readability scrim — tight to the text side so the globe stays vivid */}
        <div className="absolute inset-0 bg-gradient-to-r from-depth-0 from-20% via-depth-0/70 via-45% to-transparent to-70%" />

        <div className="relative flex h-full items-center">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-7 px-6 sm:px-10">
            <div className="animate-rise flex items-center gap-3">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-cyan opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-cyan" />
              </span>
              <span className="label-mono">{t("eyebrow")}</span>
            </div>

            <h1 className="animate-rise max-w-3xl font-display text-[clamp(2.5rem,7.5vw,6rem)] font-semibold leading-[0.9] tracking-[-0.045em] text-balance [animation-delay:100ms]">
              <span className="block text-air">{t("titleLine1")}</span>
              <span className="block text-signal">{t("titleLine2")}</span>
            </h1>

            <p className="animate-rise max-w-md text-lg leading-relaxed text-muted-foreground text-balance [animation-delay:200ms]">
              {t("subtitle")}
            </p>

            <dl className="animate-rise flex gap-px overflow-hidden rounded-md border border-border bg-border [animation-delay:300ms]">
              {counters.map((c) => (
                <div key={c.label} className="bg-depth-1/90 px-5 py-4">
                  <dt className="label-mono">{c.label}</dt>
                  <dd className="mt-1.5 font-mono text-2xl font-medium tabular-nums text-cyan">
                    {String(c.value).padStart(2, "0")}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="animate-rise pointer-events-auto flex flex-wrap items-center gap-3 [animation-delay:400ms]">
              <Button size="lg" onClick={() => setEntered(true)}>
                {t("ctaExplore")}
                <ArrowUpRight />
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/signup">{t("ctaJoin")}</Link>
              </Button>
            </div>

            <p className="animate-rise label-mono [animation-delay:500ms]">
              {t("dragHint")}
            </p>
          </div>
        </div>
      </div>

      {/* Re-open the intro once dismissed */}
      {entered && (
        <button
          onClick={() => setEntered(false)}
          className="absolute bottom-5 start-5 z-20 rounded-sm border border-border bg-depth-1/80 px-3 py-2 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur transition-colors hover:border-cyan hover:text-cyan"
        >
          {t("aboutCihan")}
        </button>
      )}
    </div>
  );
}
