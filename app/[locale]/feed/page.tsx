import { getTranslations, setRequestLocale } from "next-intl/server";
import { MapPin, Sparkles } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getEntitlements } from "@/lib/entitlements";
import { getFeed } from "@/lib/feed";
import { getOwnProfile } from "@/lib/profiles";
import { FREE_LIMITS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { FeedComposer } from "@/components/feed/feed-composer";
import { PostCard } from "@/components/feed/post-card";
import { cn } from "@/lib/utils";

export default async function FeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ near?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { near } = await searchParams;
  const nearMe = near === "1";

  const user = await getCurrentUser();
  const [ent, profile] = await Promise.all([
    getEntitlements(user?.id ?? null),
    user ? getOwnProfile(user.id) : Promise.resolve(null),
  ]);
  const t = await getTranslations("Feed");

  const hasLocation =
    profile?.lat != null &&
    profile?.lng != null &&
    Number.isFinite(profile.lat) &&
    Number.isFinite(profile.lng);

  const items = await getFeed({
    isPremium: ent.tier === "premium",
    horizonDays: FREE_LIMITS.feedEventHorizonDays,
    viewerId: user?.id,
    eventsOnly: nearMe,
    nearLat: nearMe && hasLocation ? profile!.lat : null,
    nearLng: nearMe && hasLocation ? profile!.lng : null,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/feed"
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
            !nearMe
              ? "border-gold/50 bg-gold/15 text-gold"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          {t("filterAll")}
        </Link>
        <Link
          href="/feed?near=1"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
            nearMe
              ? "border-gold/50 bg-gold/15 text-gold"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <MapPin className="size-3.5" />
          {t("filterNear")}
        </Link>
      </div>

      {nearMe && !hasLocation && (
        <p className="glass mt-4 rounded-xl px-4 py-3 text-sm text-muted-foreground">
          {t("needLocation")}{" "}
          <Link href="/profile/edit" className="font-medium text-gold hover:underline">
            {t("setLocation")}
          </Link>
        </p>
      )}

      <div className="mt-6">
        {!user ? (
          <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 text-sm">
            <span className="text-muted-foreground">{t("signInToPost")}</span>
            <Button asChild size="sm">
              <Link href="/login">{t("signIn")}</Link>
            </Button>
          </div>
        ) : ent.features.createPosts ? (
          <FeedComposer userId={user.id} />
        ) : (
          <div className="glass flex flex-col gap-3 rounded-2xl border-gold/30 p-5 ring-1 ring-gold/20 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 size-5 shrink-0 text-gold" />
              <div>
                <div className="font-medium">{t("upgradeToPostTitle")}</div>
                <p className="text-sm text-muted-foreground">
                  {t("upgradeToPostBody")}
                </p>
              </div>
            </div>
            <Button asChild className="glow-gold">
              <Link href="/pricing">{t("upgrade")}</Link>
            </Button>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-5">
        {items.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            {nearMe ? t("emptyNear") : t("empty")}
          </p>
        ) : (
          items.map((it) => (
            <PostCard
              key={it.id}
              item={it}
              currentUserId={user?.id ?? null}
              canInteract={!!user}
            />
          ))
        )}
      </div>
    </div>
  );
}
