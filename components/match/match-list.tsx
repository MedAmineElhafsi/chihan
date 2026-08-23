import { getTranslations } from "next-intl/server";
import { MapPin, Sparkles, UserRound } from "lucide-react";

import { Link } from "@/i18n/navigation";
import type { ProfileMatch } from "@/lib/match";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageButton } from "@/components/chat/message-button";
import { VerifiedBadge } from "@/components/profile/verified-badge";

export async function MatchList({ matches }: { matches: ProfileMatch[] }) {
  const t = await getTranslations("Match");
  const tOn = await getTranslations("Onboarding");
  const tProfile = await getTranslations("Profile");

  return (
    <ul className="mt-6 flex flex-col gap-3">
      {matches.map(({ profile: p, reasons, mutual }) => {
        const name = p.display_name ?? "—";
        const initial = name.trim().charAt(0).toUpperCase() || "?";
        const place = [p.city, p.country].filter(Boolean).join(", ");

        return (
          <li
            key={p.id}
            className="social-surface flex flex-col gap-3.5 p-4 transition-colors hover:border-cyan/25 sm:p-5"
          >
            <div className="flex items-start gap-4">
              <Avatar className="size-[4.5rem] shrink-0 sm:size-20">
                {p.avatar_url && (
                  <AvatarImage src={p.avatar_url} alt={name} />
                )}
                <AvatarFallback className="bg-gradient-to-br from-cyan to-depth-4 text-xl text-primary-foreground">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-display text-lg font-semibold">
                    {name}
                  </span>
                  <VerifiedBadge
                    verified={p.is_verified}
                    label={tProfile("verified")}
                  />
                  {mutual && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-cyan/15 px-2 py-0.5 text-xs font-medium text-cyan">
                      <Sparkles className="size-3" />
                      {t("mutual")}
                    </span>
                  )}
                </div>
                {place && (
                  <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0 text-cyan" />
                    <span className="truncate">{place}</span>
                  </div>
                )}
                {reasons.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {reasons.map((r) => (
                      <span
                        key={`${r.looking}-${r.offering}`}
                        className="rounded-md bg-success/12 px-2.5 py-0.5 text-xs font-medium text-success"
                      >
                        {tOn(`looking_${r.looking}` as never)}
                        <span className="mx-1 text-success/45">·</span>
                        {tOn(`offer_${r.offering}` as never)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 border-t border-border/60 pt-3">
              <Button asChild size="sm" variant="outline" className="flex-1 gap-1.5">
                <Link href={`/u/${p.id}`}>
                  <UserRound className="size-4" />
                  {t("viewProfile")}
                </Link>
              </Button>
              <MessageButton
                targetUserId={p.user_id}
                size="sm"
                variant="default"
                className="flex-1"
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
