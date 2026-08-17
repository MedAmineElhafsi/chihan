import { getTranslations, setRequestLocale } from "next-intl/server";
import { MapPinned, Plus, Users } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getGroups, getMyJoinedGroupIds } from "@/lib/groups";
import { Button } from "@/components/ui/button";
import { GroupCard } from "@/components/groups/group-card";
import { cn } from "@/lib/utils";

export default async function GroupsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ country?: string; near?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const near = sp.near === "1";
  const country = sp.country?.trim() || undefined;

  const t = await getTranslations("Groups");
  const user = await getCurrentUser();

  let nearLat: number | null = null;
  let nearLng: number | null = null;
  if (near && user) {
    try {
      const supabase = await createClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("lat, lng")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile?.lat != null && profile?.lng != null) {
        nearLat = Number(profile.lat);
        nearLng = Number(profile.lng);
      }
    } catch {
      // ignore
    }
  }

  const groups = await getGroups({
    country,
    nearLat: near ? nearLat : null,
    nearLng: near ? nearLng : null,
  });
  const joined = user ? await getMyJoinedGroupIds(user.id) : new Set<string>();

  const countries = [
    ...new Set(
      groups.map((g) => g.country).filter((c): c is string => Boolean(c))
    ),
  ].sort((a, b) => a.localeCompare(b));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
        </div>
        {user ? (
          <Button asChild className="gap-2">
            <Link href="/groups/new">
              <Plus className="size-4" />
              {t("createCta")}
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline" className="gap-2">
            <Link href="/login">{t("signInToCreate")}</Link>
          </Button>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/groups"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            !country && !near
              ? "border-cyan/50 bg-cyan/15 text-cyan"
              : "border-border bg-card/40 text-muted-foreground hover:text-foreground"
          )}
        >
          <Users className="size-3.5" />
          {t("all")}
        </Link>
        <Link
          href={user ? "/groups?near=1" : "/login"}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            near
              ? "border-cyan/50 bg-cyan/15 text-cyan"
              : "border-border bg-card/40 text-muted-foreground hover:text-foreground"
          )}
        >
          <MapPinned className="size-3.5" />
          {t("nearMe")}
        </Link>
        {countries.map((c) => (
          <Link
            key={c}
            href={`/groups?country=${encodeURIComponent(c)}`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              country === c
                ? "border-cyan/50 bg-cyan/15 text-cyan"
                : "border-border bg-card/40 text-muted-foreground hover:text-foreground"
            )}
          >
            {c}
          </Link>
        ))}
      </div>

      {near && user && nearLat == null && (
        <p className="mt-4 text-sm text-muted-foreground">{t("needLocation")}</p>
      )}

      {groups.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <Users className="size-8 text-cyan" />
          <p className="text-muted-foreground">{t("empty")}</p>
          {user && (
            <Button asChild size="sm" className="mt-1 gap-1.5">
              <Link href="/groups/new">
                <Plus className="size-4" />
                {t("createCta")}
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              isJoined={joined.has(g.id)}
              joinedLabel={t("joined")}
              membersLabel={t("memberCount", { count: g.member_count })}
              distanceLabel={
                g.distance_km != null
                  ? t("distanceKm", {
                      km:
                        g.distance_km < 10
                          ? g.distance_km.toFixed(1)
                          : Math.round(g.distance_km),
                    })
                  : null
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
