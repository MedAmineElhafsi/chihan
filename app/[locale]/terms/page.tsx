import { getTranslations, setRequestLocale } from "next-intl/server";
import { Info } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { BINDING_LOCALE, TERMS_UPDATED } from "@/lib/legal";

/**
 * The rules, in the order somebody meets them: what this is, who may join,
 * how to behave, then each part of the service that involves money or
 * strangers meeting, then what happens when something goes wrong.
 */
const SECTIONS = [
  "who",
  "join",
  "notAgency",
  "conduct",
  "verification",
  "helpBuddies",
  "board",
  "tickets",
  "bazar",
  "yourContent",
  "moderation",
  "paid",
  "liability",
  "changes",
  "law",
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Legal" });
  return { title: t("termsTitle") };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Legal");
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "long" });

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-ink text-3xl font-semibold tracking-tight">
        {t("termsTitle")}
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        {t("termsUpdated", {
          date: dateFmt.format(new Date(TERMS_UPDATED)),
        })}
      </p>

      {/* A clause that drifted in translation should not be the one that
          decides an argument. */}
      {locale !== BINDING_LOCALE && (
        <div className="border-border bg-depth-1 mt-8 flex items-start gap-3 rounded-lg border p-4">
          <Info
            className="text-brand mt-0.5 size-5 shrink-0"
            aria-hidden="true"
          />
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t("termsBindingLanguage")}
          </p>
        </div>
      )}

      <div className="mt-10 flex flex-col gap-8">
        {SECTIONS.map((key, i) => (
          <section key={key} className="flex flex-col gap-2">
            <h2 className="font-display text-ink text-lg font-semibold">
              {i + 1}. {t(`terms_${key}_title` as never)}
            </h2>
            {t(`terms_${key}_body` as never)
              .split("\n\n")
              .map((para, j) => (
                <p
                  key={j}
                  className="text-foreground/90 text-sm leading-relaxed"
                >
                  {para}
                </p>
              ))}
          </section>
        ))}
      </div>

      <p className="text-muted-foreground mt-12 text-sm">
        {t.rich("termsSeeAlso", {
          privacy: (chunks) => (
            <Link href="/privacy" className="text-brand hover:underline">
              {chunks}
            </Link>
          ),
          imprint: (chunks) => (
            <Link href="/imprint" className="text-brand hover:underline">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}
