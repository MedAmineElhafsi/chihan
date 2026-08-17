import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowUpRight, Building2, Globe2, MessagesSquare } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { getGlobePoints } from "@/lib/globe";
import { NetworkField } from "@/components/visuals/network-field";

export default async function LandingPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Landing");

  // Real numbers — the landing reads like a live instrument, not a brochure.
  const points = await getGlobePoints();
  const people = points.filter((p) => p.kind === "person").length;
  const places = points.filter((p) => p.kind === "listing").length;
  const countries = new Set(points.map((p) => p.country).filter(Boolean)).size;

  const stats = [
    { value: people, label: t("statMembers") },
    { value: places, label: t("statPlaces") },
    { value: countries, label: t("statCountries") },
  ];

  const features = [
    { key: "feature1", icon: Globe2, href: "/explore" },
    { key: "feature2", icon: Building2, href: "/directory" },
    { key: "feature3", icon: MessagesSquare, href: "/people" },
  ] as const;

  return (
    <>
      {/* ───────────────────────── HERO ───────────────────────── */}
      <section className="relative min-h-[calc(100dvh-4rem)] overflow-hidden">
        {/* Bioluminescent plate */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div
            className="animate-drift absolute inset-0 bg-cover bg-center opacity-40 mix-blend-screen"
            style={{ backgroundImage: "url(/textures/biolum-a.png)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/60" />
        </div>

        <div className="mx-auto grid max-w-7xl grid-cols-12 gap-6 px-4 pb-20 pt-16 sm:px-6 lg:pt-24">
          {/* Left rail — instrument readout */}
          <div className="col-span-12 lg:col-span-7">
            <div className="animate-rise flex items-center gap-3">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-cyan opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-cyan" />
              </span>
              <span className="label-mono">{t("eyebrow")}</span>
            </div>

            <h1 className="animate-rise mt-8 font-display text-[clamp(2.75rem,8vw,6.5rem)] font-semibold leading-[0.92] tracking-[-0.045em] text-balance [animation-delay:100ms]">
              <span className="block text-air">{t("titleLine1")}</span>
              <span className="block text-signal">{t("titleLine2")}</span>
            </h1>

            <p className="animate-rise mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground text-balance [animation-delay:200ms]">
              {t("subtitle")}
            </p>

            <div className="animate-rise mt-10 flex flex-wrap items-center gap-3 [animation-delay:300ms]">
              <Button asChild size="lg">
                <Link href="/explore">
                  {t("ctaExplore")}
                  <ArrowUpRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/signup">{t("ctaJoin")}</Link>
              </Button>
            </div>

            {/* Live counters */}
            <dl className="animate-rise mt-16 grid max-w-lg grid-cols-3 gap-px overflow-hidden rounded-md border border-border bg-border [animation-delay:400ms]">
              {stats.map((s) => (
                <div key={s.label} className="bg-depth-1/80 px-4 py-5">
                  <dt className="label-mono">{s.label}</dt>
                  <dd className="mt-2 font-mono text-3xl font-medium tabular-nums text-cyan">
                    {String(s.value).padStart(2, "0")}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Right — the network, breathing */}
          <div className="relative col-span-12 hidden lg:col-span-5 lg:block">
            <div className="animate-rise absolute inset-0 [animation-delay:250ms]">
              <div className="relative size-full">
                <NetworkField className="absolute inset-0 size-full opacity-80" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,var(--depth-1)_75%)]" />
              </div>
            </div>
          </div>
        </div>

        {/* Coordinate strip */}
        <div className="absolute inset-x-0 bottom-0 hidden border-t border-border bg-depth-0/60 backdrop-blur lg:block">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
            <span className="label-mono">{t("coordinates")}</span>
            <span className="label-mono">{t("scrollHint")}</span>
          </div>
        </div>
      </section>

      {/* ──────────────────────── FEATURES ──────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="flex items-end justify-between gap-6 border-b border-border pb-6">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-air sm:text-4xl">
            {t("sectionTitle")}
          </h2>
          <span className="label-mono hidden sm:block">{t("sectionIndex")}</span>
        </div>

        <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-3">
          {features.map(({ key, icon: Icon, href }, i) => (
            <Link
              key={key}
              href={href}
              className="group relative flex flex-col gap-5 bg-depth-1 p-8 transition-colors duration-300 hover:bg-depth-2"
            >
              {/* Top hairline that lights up */}
              <span className="absolute inset-x-0 top-0 h-px scale-x-0 bg-cyan transition-transform duration-500 group-hover:scale-x-100" />

              <div className="flex items-center justify-between">
                <span className="label-mono">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <ArrowUpRight className="size-4 -translate-x-1 translate-y-1 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:text-cyan group-hover:opacity-100" />
              </div>

              <Icon className="size-7 text-cyan transition-transform duration-500 group-hover:scale-110" />

              <h3 className="font-display text-xl font-semibold tracking-tight text-air">
                {t(`${key}Title`)}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t(`${key}Body`)}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ───────────────────────── CTA ───────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-28 sm:px-6">
        <div className="panel relative overflow-hidden rounded-lg px-8 py-16 text-center sm:px-16">
          <div
            className="animate-drift pointer-events-none absolute inset-0 bg-cover bg-center opacity-25 mix-blend-screen"
            style={{ backgroundImage: "url(/textures/biolum-b.png)" }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-depth-1 via-depth-1/40 to-transparent" />

          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-[clamp(1.75rem,4vw,3rem)] font-semibold leading-tight tracking-tight text-balance text-air">
              {t("ctaTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-md text-muted-foreground">
              {t("ctaBody")}
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link href="/signup">
                {t("ctaJoin")}
                <ArrowUpRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
