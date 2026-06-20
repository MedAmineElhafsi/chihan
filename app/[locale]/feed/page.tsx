import { getTranslations, setRequestLocale } from "next-intl/server";
import { Sparkles } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getEntitlements } from "@/lib/entitlements";
import { getFeed } from "@/lib/feed";
import { FREE_LIMITS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { FeedComposer } from "@/components/feed/feed-composer";
import { PostCard } from "@/components/feed/post-card";

export default async function FeedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  const ent = await getEntitlements(user?.id ?? null);
  const t = await getTranslations("Feed");

  const items = await getFeed({
    isPremium: ent.tier === "premium",
    horizonDays: FREE_LIMITS.feedEventHorizonDays,
    viewerId: user?.id,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>

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
          <p className="py-12 text-center text-muted-foreground">{t("empty")}</p>
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
