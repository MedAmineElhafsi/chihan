// FEATURE-DISABLED: switched off for launch. Flip `views` in lib/features.ts
// to bring this surface back — the code and its tables are untouched.
import { notFound } from "next/navigation";
import { isEnabled } from "@/lib/features";

import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Eye, Lock, MapPin, Sparkles } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getEntitlements } from "@/lib/entitlements";
import { getOwnProfile, getProfileViewers } from "@/lib/profiles";
import { syncVerifiedBadge } from "@/lib/view-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default async function WhoViewedMePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  if (!isEnabled("views")) notFound();

  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const profile = await getOwnProfile(user.id);
  if (!profile || !profile.display_name) redirect(`/${locale}/onboarding`);

  // Keep the verified badge in sync when visiting this premium surface.
  await syncVerifiedBadge(user.id);

  const ent = await getEntitlements(user.id);
  const t = await getTranslations("Views");

  if (!ent.features.whoViewedMe) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-cyan/15 text-cyan">
          <Lock className="size-7" />
        </div>
        <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("premiumOnly")}</p>
        <Button asChild className="mt-6 gap-2">
          <Link href="/pricing">
            <Sparkles className="size-4" />
            {t("upgrade")}
          </Link>
        </Button>
      </div>
    );
  }

  const viewers = await getProfileViewers(user.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-3">
        <Eye className="size-6 text-cyan" />
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      {viewers.length === 0 ? (
        <p className="mt-16 text-center text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-2">
          {viewers.map((v) => {
            const name = v.display_name || t("someone");
            const initial = name.trim().charAt(0).toUpperCase() || "?";
            const place = [v.city, v.country].filter(Boolean).join(", ");
            const when = new Date(v.viewed_at).toLocaleString();
            const body = (
              <>
                <Avatar className="size-11">
                  {v.avatar_url && (
                    <AvatarImage src={v.avatar_url} alt={name} />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-cyan to-depth-4 text-primary-foreground">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{name}</div>
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    {place && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3 text-cyan" />
                        {place}
                      </span>
                    )}
                    <span>{when}</span>
                  </div>
                </div>
              </>
            );
            return (
              <li key={v.viewer_user_id}>
                {v.profile_id ? (
                  <Link
                    href={`/u/${v.profile_id}`}
                    className="panel flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-accent/40"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="panel flex items-center gap-3 rounded-xl p-3">
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
