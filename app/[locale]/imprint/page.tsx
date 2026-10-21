import { getTranslations, setRequestLocale } from "next-intl/server";
import { AlertTriangle } from "lucide-react";

import { OPERATOR, imprintComplete, missingOperatorFields } from "@/lib/legal";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Legal" });
  return { title: t("imprintTitle") };
}

export default async function ImprintPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Legal");

  const complete = imprintComplete();
  const missing = missingOperatorFields();
  const address = [
    OPERATOR.street,
    [OPERATOR.postcode, OPERATOR.city].filter(Boolean).join(" "),
    OPERATOR.country,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-air text-3xl font-semibold tracking-tight">
        {t("imprintTitle")}
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">{t("imprintLead")}</p>

      {!complete && (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/10 mt-8 flex items-start gap-3 rounded-lg border p-4"
        >
          <AlertTriangle
            className="text-destructive mt-0.5 size-5 shrink-0"
            aria-hidden="true"
          />
          <div className="text-sm">
            <p className="text-destructive font-medium">
              {t("imprintIncompleteTitle")}
            </p>
            <p className="text-muted-foreground mt-1">
              {t("imprintIncompleteBody")}
            </p>
            <p className="text-muted-foreground mt-2 font-mono text-xs">
              lib/legal.ts — {missing.join(", ")}
            </p>
          </div>
        </div>
      )}

      {complete && (
        <dl className="mt-8 flex flex-col gap-6 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs">
              {t("imprintProvider")}
            </dt>
            <dd className="mt-1 leading-relaxed">
              {[OPERATOR.name, OPERATOR.legalForm].filter(Boolean).join(", ")}
              {address.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </dd>
          </div>

          {OPERATOR.represented && (
            <div>
              <dt className="text-muted-foreground text-xs">
                {t("imprintRepresented")}
              </dt>
              <dd className="mt-1">{OPERATOR.represented}</dd>
            </div>
          )}

          <div>
            <dt className="text-muted-foreground text-xs">
              {t("imprintContact")}
            </dt>
            <dd className="mt-1 flex flex-col gap-0.5">
              <a
                href={`mailto:${OPERATOR.email}`}
                className="hover:text-cyan break-all transition-colors"
                dir="ltr"
              >
                {OPERATOR.email}
              </a>
              {OPERATOR.phone && (
                <a
                  href={`tel:${OPERATOR.phone}`}
                  className="hover:text-cyan transition-colors"
                  dir="ltr"
                >
                  {OPERATOR.phone}
                </a>
              )}
            </dd>
          </div>

          {(OPERATOR.register || OPERATOR.registerCourt) && (
            <div>
              <dt className="text-muted-foreground text-xs">
                {t("imprintRegister")}
              </dt>
              <dd className="mt-1">
                {[OPERATOR.registerCourt, OPERATOR.register]
                  .filter(Boolean)
                  .join(", ")}
              </dd>
            </div>
          )}

          {OPERATOR.vatId && (
            <div>
              <dt className="text-muted-foreground text-xs">
                {t("imprintVatId")}
              </dt>
              <dd className="mt-1" dir="ltr">
                {OPERATOR.vatId}
              </dd>
            </div>
          )}

          <div>
            <dt className="text-muted-foreground text-xs">
              {t("imprintResponsible")}
            </dt>
            <dd className="mt-1 leading-relaxed">
              {OPERATOR.responsibleForContent || OPERATOR.name}
            </dd>
          </div>

          <div>
            <dt className="text-muted-foreground text-xs">
              {t("imprintDisputeTitle")}
            </dt>
            <dd className="text-muted-foreground mt-1 leading-relaxed">
              {t("imprintDisputeBody")}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}
