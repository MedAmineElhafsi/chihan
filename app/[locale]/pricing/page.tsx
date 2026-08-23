// FEATURE-DISABLED: switched off for launch. Flip `billing` in lib/features.ts
// to bring this surface back — the code and its tables are untouched.
import { notFound } from "next/navigation";
import { isEnabled } from "@/lib/features";

import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check, Sparkles } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { getEntitlements } from "@/lib/entitlements";
import { stripeConfigured } from "@/lib/stripe";
import { PRICING } from "@/lib/constants";
import { BillingActions } from "@/components/billing/billing-actions";

const FREE_FEATURES = [
  "freeGlobe",
  "freeDirectory",
  "freeReveals",
  "freeFeed",
] as const;
const PREMIUM_FEATURES = [
  "premUnlimited",
  "premFilters",
  "premWhoViewed",
  "premEvents",
  "premVerified",
] as const;

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  if (!isEnabled("billing")) notFound();

  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  const ent = await getEntitlements(user?.id ?? null);
  const t = await getTranslations("Pricing");

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <div className="text-center">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {/* Free */}
        <div className="panel flex flex-col rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">
              {t("freeName")}
            </h2>
            {ent.tier === "free" && (
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {t("currentPlan")}
              </span>
            )}
          </div>
          <div className="mt-2 font-display text-3xl font-semibold">
            {t("free_price")}
          </div>
          <ul className="mt-5 flex flex-1 flex-col gap-2.5">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                {t(f)}
              </li>
            ))}
          </ul>
        </div>

        {/* Premium */}
        <div className="panel-solid relative flex flex-col rounded-2xl border-cyan/40 p-6 ring-1 ring-cyan/30">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
              <Sparkles className="size-5 text-cyan" />
              {t("premiumName")}
            </h2>
            {ent.tier === "premium" && (
              <span className="rounded-full bg-cyan/15 px-2.5 py-0.5 text-xs font-medium text-cyan">
                {t("currentPlan")}
              </span>
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-display text-3xl font-semibold">
              {PRICING.monthly}
            </span>
            <span className="text-sm text-muted-foreground">{t("perMonth")}</span>
          </div>
          <ul className="mt-5 flex flex-1 flex-col gap-2.5">
            {PREMIUM_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-cyan" />
                {t(f)}
              </li>
            ))}
          </ul>
          <BillingActions
            isPremium={ent.tier === "premium"}
            configured={stripeConfigured}
          />
        </div>
      </div>
    </div>
  );
}
