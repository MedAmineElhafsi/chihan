import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  BadgeCheck,
  Compass,
  Globe2,
  HandHeart,
  LogOut,
  Pencil,
  Sparkles,
  UserRound,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getEntitlements } from "@/lib/entitlements";
import { getOwnProfile } from "@/lib/profiles";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ upgraded?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const profile = await getOwnProfile(user.id);
  // First-time users finish onboarding before reaching the dashboard.
  if (!profile || !profile.display_name) redirect(`/${locale}/onboarding`);

  const ent = await getEntitlements(user.id);
  const { upgraded } = await searchParams;
  const t = await getTranslations("Dashboard");
  const name = profile.display_name;
  const initial = name.charAt(0).toUpperCase();
  const isPremium = ent.tier === "premium";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      {upgraded && isPremium && (
        <div className="animate-rise mb-5 flex items-center gap-2 rounded-xl border border-cyan/40 bg-cyan/10 px-4 py-3 text-sm">
          <Sparkles className="size-4 text-cyan" />
          {t("upgradedBanner")}
        </div>
      )}
      <div className="animate-rise flex flex-col gap-2">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card/40 px-3 py-1 text-xs font-medium text-muted-foreground">
          <Compass className="size-3.5 text-cyan" />
          {t("signedInAs")} {user.email}
        </span>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="max-w-xl text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Profile summary */}
      <Card className="panel animate-rise mt-8 [animation-delay:80ms]">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="size-14">
              {profile.avatar_url && (
                <AvatarImage src={profile.avatar_url} alt={name} />
              )}
              <AvatarFallback className="bg-gradient-to-br from-cyan to-depth-4 text-primary-foreground">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-semibold">{name}</span>
                {isPremium && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-cyan/15 px-2 py-0.5 text-xs font-medium text-cyan">
                    <BadgeCheck className="size-3.5" />
                    {t("premium")}
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {profile.is_public ? t("publicState") : t("privateState")}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="gap-1.5">
              <Link href="/profile">
                <UserRound className="size-4" />
                {t("viewProfile")}
              </Link>
            </Button>
            <Button asChild className="gap-1.5">
              <Link href="/profile/edit">
                <Pencil className="size-4" />
                {t("editProfile")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Explore the globe */}
      <Card className="panel animate-rise mt-5 overflow-hidden [animation-delay:120ms]">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="inline-flex size-11 items-center justify-center rounded-xl bg-secondary text-cyan ring-1 ring-border">
              <Globe2 className="size-5" />
            </div>
            <div>
              <div className="font-display text-lg font-semibold">
                {t("exploreTitle")}
              </div>
              <div className="max-w-md text-sm text-muted-foreground">
                {t("exploreBody")}
              </div>
            </div>
          </div>
          <Button asChild className="gap-2 glow">
            <Link href="/explore">
              <Globe2 className="size-4" />
              {t("openGlobe")}
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Help — the core loop */}
      <Card className="panel animate-rise mt-5 overflow-hidden [animation-delay:200ms]">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="inline-flex size-11 items-center justify-center rounded-xl bg-secondary text-cyan ring-1 ring-border">
              <HandHeart className="size-5" />
            </div>
            <div>
              <div className="font-display text-lg font-semibold">
                {t("helpTitle")}
              </div>
              <div className="max-w-md text-sm text-muted-foreground">
                {t("helpBody")}
              </div>
            </div>
          </div>
          <Button asChild className="gap-2">
            <Link href="/help">
              <HandHeart className="size-4" />
              {t("helpCta")}
            </Link>
          </Button>
        </CardContent>
      </Card>

      <form action="/auth/signout" method="post" className="mt-6">
        <Button
          type="submit"
          variant="ghost"
          className="gap-2 text-muted-foreground"
        >
          <LogOut className="size-4" />
          {t("signOut")}
        </Button>
      </form>
    </div>
  );
}
