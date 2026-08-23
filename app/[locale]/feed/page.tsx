// FEATURE-DISABLED: switched off for launch. Flip `feed` in lib/features.ts
// to bring this surface back — the code and its tables are untouched.
import { notFound } from "next/navigation";
import { isEnabled } from "@/lib/features";

import { getTranslations, setRequestLocale } from "next-intl/server";
import { MapPin, Sparkles } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getEntitlements } from "@/lib/entitlements";
import { getFeed } from "@/lib/feed";
import { getActiveStories } from "@/lib/stories";
import { getOwnProfile } from "@/lib/profiles";
import { FREE_LIMITS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { FeedComposer } from "@/components/feed/feed-composer";
import { PostCard } from "@/components/feed/post-card";
import { StoriesRail } from "@/components/stories/stories-rail";
import { HomeTabs, parseHomeTab } from "@/components/app-shell/home-tabs";
import { RequestCard } from "@/components/help/request-card";
import { ArticleCard } from "@/components/news/article-card";
import { getHelpRequests } from "@/lib/help";
import { getNews } from "@/lib/news";
import { cn } from "@/lib/utils";

export default async function FeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ near?: string; tab?: string }>;
}) {
  if (!isEnabled("feed")) notFound();

  const { locale } = await params;
  setRequestLocale(locale);
  const { near, tab } = await searchParams;
  const nearMe = near === "1";
  const activeTab = parseHomeTab(tab);

  const user = await getCurrentUser();
  const [ent, profile, storyGroups] = await Promise.all([
    getEntitlements(user?.id ?? null),
    user ? getOwnProfile(user.id) : Promise.resolve(null),
    getActiveStories(user?.id),
  ]);
  const t = await getTranslations("Feed");

  const hasLocation =
    profile?.lat != null &&
    profile?.lng != null &&
    Number.isFinite(profile.lat) &&
    Number.isFinite(profile.lng);

  // Each tab fetches only its own data — opening Home should not query the
  // help board and the news table as well.
  const items =
    activeTab === "posts"
      ? await getFeed({
          isPremium: ent.tier === "premium",
          horizonDays: FREE_LIMITS.feedEventHorizonDays,
          viewerId: user?.id,
          eventsOnly: nearMe,
          nearLat: nearMe && hasLocation ? profile!.lat : null,
          nearLng: nearMe && hasLocation ? profile!.lng : null,
        })
      : [];

  const helpRequests =
    activeTab === "help" ? await getHelpRequests({ status: "open" }) : [];
  const articles = activeTab === "news" ? await getNews() : [];
  const tHelp = await getTranslations("Help");
  const tNews = await getTranslations("News");
  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:max-w-4xl lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/feed"
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
              !nearMe
                ? "border-cyan/50 bg-cyan/15 text-cyan"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {t("filterAll")}
          </Link>
          <Link
            href="/feed?near=1"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
              nearMe
                ? "border-cyan/50 bg-cyan/15 text-cyan"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <MapPin className="size-3.5" />
            {t("filterNear")}
          </Link>
        </div>
      </div>

      <div className="mt-5">
        <HomeTabs active={activeTab} />
      </div>

      {activeTab === "posts" && (
        <>
          {nearMe && !hasLocation && (
            <p className="social-surface text-muted-foreground mt-3 px-3.5 py-2.5 text-sm">
              {t("needLocation")}{" "}
              <Link
                href="/profile/edit"
                className="text-cyan font-medium hover:underline"
              >
                {t("setLocation")}
              </Link>
            </p>
          )}

          {(user || storyGroups.length > 0) && (
            <div className="mt-4">
              <StoriesRail groups={storyGroups} userId={user?.id ?? null} />
            </div>
          )}

          <div className="mt-3">
            {!user ? (
              <div className="social-surface flex flex-wrap items-center justify-between gap-3 p-3.5 text-sm">
                <span className="text-muted-foreground">
                  {t("signInToPost")}
                </span>
                <Button asChild size="sm">
                  <Link href="/login">{t("signIn")}</Link>
                </Button>
              </div>
            ) : ent.features.createPosts ? (
              <FeedComposer userId={user.id} />
            ) : (
              <div className="social-surface border-cyan/25 ring-cyan/15 flex flex-col gap-3 p-4 ring-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <Sparkles className="text-cyan mt-0.5 size-5 shrink-0" />
                  <div>
                    <div className="font-medium">{t("upgradeToPostTitle")}</div>
                    <p className="text-muted-foreground text-sm">
                      {t("upgradeToPostBody")}
                    </p>
                  </div>
                </div>
                <Button asChild className="glow">
                  <Link href="/pricing">{t("upgrade")}</Link>
                </Button>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-col gap-3">
            {items.length === 0 ? (
              <p className="text-muted-foreground py-12 text-center">
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
        </>
      )}

      {activeTab === "help" && (
        <div className="mt-4">
          {helpRequests.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center">
              {tHelp("empty")}
            </p>
          ) : (
            <div className="bg-border grid gap-px sm:grid-cols-2">
              {helpRequests.map((r) => (
                <RequestCard key={r.id} request={r} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "news" && (
        <div className="mt-4">
          {articles.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center">
              {tNews("empty")}
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {articles.map((a) => (
                <ArticleCard
                  key={a.id}
                  article={a}
                  dateLabel={dateFmt.format(new Date(a.published_at))}
                  readMore={tNews("readMore")}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
