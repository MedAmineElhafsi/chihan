// FEATURE-DISABLED when `reels` is off in lib/features.ts — the code and its
// storage stay in place, so flipping the flag brings the surface back whole.
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { isEnabled } from "@/lib/features";
import { getCurrentUser } from "@/lib/auth";
import { getFeed } from "@/lib/feed";
import { ReelPlayer } from "@/components/reels/reel-player";
import { NewReelButton } from "@/components/reels/new-reel-button";
import { ReelsEmpty } from "@/components/reels/reels-empty";

export default async function ReelsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  if (!isEnabled("reels")) notFound();

  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Reels");
  const user = await getCurrentUser();
  const reels = await getFeed({
    // Billing is off, so nothing here is time-limited.
    isPremium: true,
    horizonDays: 3650,
    viewerId: user?.id,
    types: ["reel"],
  });

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="font-display text-air text-2xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        {/* An empty metric is worse than none: "0 reels" in the header told
            a visitor the tab was dead before they had read anything. */}
        {reels.length > 0 && (
          <span className="label-mono">
            {t("count", { count: reels.length })}
          </span>
        )}
      </div>

      {user && <NewReelButton userId={user.id} />}

      {reels.length === 0 ? (
        <ReelsEmpty signedIn={Boolean(user)} />
      ) : (
        <ReelPlayer reels={reels} />
      )}
    </div>
  );
}
