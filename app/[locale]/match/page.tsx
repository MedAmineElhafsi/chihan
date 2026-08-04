import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Handshake, Pencil } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMatches } from "@/lib/match";
import { getOwnProfile } from "@/lib/profiles";
import { Button } from "@/components/ui/button";
import { MatchList } from "@/components/match/match-list";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const profile = await getOwnProfile(user.id);
  if (!profile?.display_name) redirect(`/${locale}/onboarding`);

  const t = await getTranslations("Match");
  const needsSetup =
    profile.looking_for.length === 0 && profile.offering.length === 0;

  const matches = needsSetup ? [] : await getMatches(user.id);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:max-w-4xl lg:py-8">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
          <Handshake className="size-5" />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      {needsSetup ? (
        <div className="social-surface mt-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{t("setupBody")}</p>
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/profile/edit">
              <Pencil className="size-4" />
              {t("setupCta")}
            </Link>
          </Button>
        </div>
      ) : matches.length === 0 ? (
        <p className="mt-12 text-center text-muted-foreground">{t("empty")}</p>
      ) : (
        <MatchList matches={matches} />
      )}
    </div>
  );
}
