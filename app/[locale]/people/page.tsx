import { getTranslations, setRequestLocale } from "next-intl/server";
import { Lock, Search, Sparkles } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getEntitlements } from "@/lib/entitlements";
import { getPeople, getRevealState } from "@/lib/people";
import {
  FREE_LIMITS,
  KURDISH_DIALECTS,
  LOOKING_FOR,
  ORIGIN_REGIONS,
  SPOKEN_LANGUAGES,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PeopleClient } from "@/components/people/people-client";

const selectClass =
  "h-11 w-full rounded-md border border-input bg-card/40 px-3 text-sm shadow-sm transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-50";

export default async function PeoplePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    country?: string;
    city?: string;
    language?: string;
    dialect?: string;
    origin?: string;
    looking?: string;
  }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const user = await getCurrentUser();
  const ent = await getEntitlements(user?.id ?? null);
  const advanced = ent.features.advancedFilters;

  const filters = {
    country: sp.country?.trim() || undefined,
    city: sp.city?.trim() || undefined,
    language: advanced ? sp.language || undefined : undefined,
    dialect: advanced ? sp.dialect || undefined : undefined,
    origin: sp.origin || undefined,
    looking: sp.looking || undefined,
  };

  const t = await getTranslations("People");
  const tOn = await getTranslations("Onboarding");
  const people = await getPeople(filters, user?.id);
  const reveal = user
    ? await getRevealState(user.id)
    : { revealedIds: [], used: 0 };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>

      {/* Filters */}
      <form className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 xl:items-end">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {t("country")}
          </label>
          <Input name="country" defaultValue={sp.country ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {t("city")}
          </label>
          <Input name="city" defaultValue={sp.city ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {t("origin")}
          </label>
          <select
            name="origin"
            defaultValue={sp.origin ?? ""}
            className={selectClass}
          >
            <option value="">{t("anyOrigin")}</option>
            {ORIGIN_REGIONS.map((o) => (
              <option key={o} value={o}>
                {tOn(`origin_${o}` as never)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {t("looking")}
          </label>
          <select
            name="looking"
            defaultValue={sp.looking ?? ""}
            className={selectClass}
          >
            <option value="">{t("anyLooking")}</option>
            {LOOKING_FOR.map((item) => (
              <option key={item} value={item}>
                {tOn(`looking_${item}` as never)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            {t("language")}
            {!advanced && <Lock className="size-3" />}
          </label>
          <select
            name="language"
            defaultValue={sp.language ?? ""}
            disabled={!advanced}
            className={selectClass}
          >
            <option value="">{t("anyLanguage")}</option>
            {SPOKEN_LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            {t("dialect")}
            {!advanced && <Lock className="size-3" />}
          </label>
          <select
            name="dialect"
            defaultValue={sp.dialect ?? ""}
            disabled={!advanced}
            className={selectClass}
          >
            <option value="">{t("anyDialect")}</option>
            {KURDISH_DIALECTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" className="gap-2">
          <Search className="size-4" />
          {t("apply")}
        </Button>
      </form>

      {!advanced && (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="size-4 text-gold" />
          {t("advancedLocked")}{" "}
          <Link href="/pricing" className="font-medium text-gold hover:underline">
            {t("upgrade")}
          </Link>
        </p>
      )}

      <PeopleClient
        people={people}
        isAuthenticated={!!user}
        tier={ent.tier}
        limit={FREE_LIMITS.profileRevealsPerDay}
        initialRevealedIds={reveal.revealedIds}
        initialUsed={reveal.used}
      />
    </div>
  );
}
