import { getTranslations, setRequestLocale } from "next-intl/server";
import { Building2, Globe2, MessagesSquare, Sparkles } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { HeroGlobe } from "@/components/marketing/hero-globe";

export default async function LandingPage({
  params,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Landing");

  const features = [
    { key: "feature1", icon: Globe2 },
    { key: "feature2", icon: Building2 },
    { key: "feature3", icon: MessagesSquare },
  ] as const;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      {/* Hero */}
      <section className="grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-2 lg:gap-8">
        <div className="flex flex-col items-start gap-6 text-start">
          <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-gold" />
            {t("eyebrow")}
          </span>

          <h1 className="animate-fade-up font-display text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl [animation-delay:80ms]">
            {t("title")}
          </h1>

          <p className="animate-fade-up max-w-xl text-lg leading-relaxed text-muted-foreground text-balance [animation-delay:160ms]">
            {t("subtitle")}
          </p>

          <div className="animate-fade-up flex flex-wrap items-center gap-3 [animation-delay:240ms]">
            <Button asChild size="lg" className="glow-gold">
              <Link href="/signup">{t("ctaJoin")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#features">{t("ctaExplore")}</a>
            </Button>
          </div>
        </div>

        <div className="animate-fade-up [animation-delay:200ms]">
          <HeroGlobe />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-24 py-12 sm:py-16">
        <div className="grid gap-5 md:grid-cols-3">
          {features.map(({ key, icon: Icon }, i) => (
            <article
              key={key}
              className="glass animate-fade-up group rounded-2xl p-6 transition-colors hover:border-gold/40"
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-secondary text-gold ring-1 ring-border transition-transform duration-300 group-hover:scale-105">
                <Icon className="size-6" />
              </div>
              <h3 className="mb-2 font-display text-xl font-semibold tracking-tight">
                {t(`${key}Title`)}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t(`${key}Body`)}
              </p>
            </article>
          ))}
        </div>

        {/* Phase note */}
        <div className="mt-10 flex items-start gap-3 rounded-xl border border-dashed border-border bg-card/30 p-4 text-sm text-muted-foreground">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-gold" />
          <p>{t("phaseNote")}</p>
        </div>
      </section>
    </div>
  );
}
