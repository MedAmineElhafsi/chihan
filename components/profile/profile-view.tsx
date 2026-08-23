import { getTranslations } from "next-intl/server";
import {
  Globe2,
  Handshake,
  Heart,
  ImageIcon,
  Languages,
  MapPin,
  Pencil,
  Search,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/profile/verified-badge";
import type { Profile } from "@/types/profile";

export async function ProfileView({
  profile,
  isOwner = false,
}: {
  profile: Profile;
  isOwner?: boolean;
}) {
  const t = await getTranslations("Profile");
  const tOn = await getTranslations("Onboarding");

  const name = profile.display_name ?? "—";
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const place = [profile.city, profile.country].filter(Boolean).join(", ");
  const located = profile.lat != null && profile.lng != null;

  const originLabel = profile.origin_region
    ? tOn(`origin_${profile.origin_region}` as never)
    : null;

  return (
    <article className="panel overflow-hidden rounded-2xl">
      {/* Banner */}
      <div className="h-28 bg-[radial-gradient(120%_140%_at_50%_-20%,color-mix(in_oklab,var(--cyan)_30%,transparent),transparent_70%)]" />

      <div className="px-6 pb-6">
        <div className="-mt-12 flex items-end justify-between gap-4">
          <Avatar className="ring-card size-24 ring-4">
            {profile.avatar_url && (
              <AvatarImage src={profile.avatar_url} alt={name} />
            )}
            <AvatarFallback className="from-cyan to-depth-4 text-primary-foreground bg-gradient-to-br text-2xl">
              {initial}
            </AvatarFallback>
          </Avatar>

          <div className="flex items-center gap-2 pb-1">
            <span
              className={
                profile.is_public
                  ? "bg-success/15 text-success inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                  : "bg-secondary text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
              }
            >
              {profile.is_public ? t("public") : t("private")}
            </span>
            {isOwner && (
              <>
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <Link href="/profile/edit">
                    <Pencil className="size-3.5" />
                    {t("editCta")}
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>

        <h1 className="font-display mt-3 flex items-center gap-2 text-2xl font-semibold tracking-tight">
          {name}
          <VerifiedBadge verified={profile.is_verified} label={t("verified")} />
        </h1>

        {(place || originLabel) && (
          <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5 text-sm">
            {place && (
              <>
                <MapPin className="text-cyan size-4" />
                {place}
              </>
            )}
            {originLabel && (
              <>
                {place && <span className="text-muted-foreground/60">·</span>}
                <span className="bg-cyan/15 text-cyan rounded-full px-2 py-0.5 text-xs font-medium">
                  {originLabel}
                </span>
              </>
            )}
            {place && (
              <>
                <span className="text-muted-foreground/60">·</span>
                <span className="inline-flex items-center gap-1">
                  <Globe2 className="size-3.5" />
                  {located ? t("onGlobe") : t("notLocated")}
                </span>
              </>
            )}
          </p>
        )}

        {isOwner && !profile.is_public && (
          <p className="border-border bg-card/30 text-muted-foreground mt-4 rounded-lg border border-dashed px-4 py-3 text-sm">
            {t("privateNote")}
          </p>
        )}

        <p className="text-foreground/90 mt-4 leading-relaxed">
          {profile.bio || (
            <span className="text-muted-foreground">{t("noBio")}</span>
          )}
        </p>

        {profile.photos.length > 0 && (
          <div className="border-border/60 mt-5 flex flex-col gap-3 border-t pt-5">
            <span className="text-muted-foreground flex items-center gap-1.5 text-sm font-medium">
              <ImageIcon className="size-4" />
              {tOn("photosLabel")}
            </span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {profile.photos.map((url) => (
                <div
                  key={url}
                  className="bg-secondary ring-border aspect-square overflow-hidden rounded-xl ring-1"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="size-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {(profile.languages.length > 0 || profile.dialect) && (
          <div className="border-border/60 mt-5 flex flex-col gap-3 border-t pt-5">
            {profile.languages.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground flex items-center gap-1.5 text-sm font-medium">
                  <Languages className="size-4" />
                  {t("speaks")}
                </span>
                {profile.languages.map((l) => (
                  <span
                    key={l}
                    className="bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5 text-xs font-medium"
                  >
                    {l}
                  </span>
                ))}
              </div>
            )}
            {profile.dialect && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground font-medium">
                  {t("dialect")}:
                </span>
                <span className="bg-cyan/15 text-cyan rounded-full px-2.5 py-0.5 text-xs font-medium">
                  {profile.dialect}
                </span>
              </div>
            )}
          </div>
        )}

        {profile.interests.length > 0 && (
          <div className="border-border/60 mt-5 flex flex-col gap-2 border-t pt-5">
            <span className="text-muted-foreground flex items-center gap-1.5 text-sm font-medium">
              <Heart className="size-4" />
              {t("interests")}
            </span>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((item) => (
                <span
                  key={item}
                  className="bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5 text-xs font-medium"
                >
                  {tOn(`int_${item}` as never)}
                </span>
              ))}
            </div>
          </div>
        )}

        {(profile.looking_for.length > 0 || profile.offering.length > 0) && (
          <div className="border-border/60 mt-5 flex flex-col gap-4 border-t pt-5">
            {profile.looking_for.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-muted-foreground flex items-center gap-1.5 text-sm font-medium">
                  <Search className="size-4" />
                  {t("lookingFor")}
                </span>
                <div className="flex flex-wrap gap-2">
                  {profile.looking_for.map((item) => (
                    <span
                      key={item}
                      className="bg-success/15 text-success rounded-full px-2.5 py-0.5 text-xs font-medium"
                    >
                      {tOn(`looking_${item}` as never)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {profile.offering.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-muted-foreground flex items-center gap-1.5 text-sm font-medium">
                  <Handshake className="size-4" />
                  {t("offering")}
                </span>
                <div className="flex flex-wrap gap-2">
                  {profile.offering.map((item) => (
                    <span
                      key={item}
                      className="bg-destructive/15 text-destructive rounded-full px-2.5 py-0.5 text-xs font-medium"
                    >
                      {tOn(`offer_${item}` as never)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
