"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Eye, Lock, MapPin, MessageCircle, Sparkles, UserRound } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { revealProfile } from "@/lib/people-actions";
import type { Profile } from "@/types/profile";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageButton } from "@/components/chat/message-button";
import { VerifiedBadge } from "@/components/profile/verified-badge";
import { cn } from "@/lib/utils";
import { UpgradeDialog } from "./upgrade-dialog";

export function PeopleClient({
  people,
  isAuthenticated,
  tier,
  limit,
  initialRevealedIds,
  initialUsed,
}: {
  people: Profile[];
  isAuthenticated: boolean;
  tier: "free" | "premium";
  limit: number;
  initialRevealedIds: string[];
  initialUsed: number;
}) {
  const t = useTranslations("People");
  const tChat = useTranslations("Chat");
  const tProfile = useTranslations("Profile");
  const tOn = useTranslations("Onboarding");
  const [revealed, setRevealed] = useState<Set<string>>(
    () => new Set(initialRevealedIds)
  );
  const [used, setUsed] = useState(initialUsed);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const isPremium = tier === "premium";
  const remaining = Math.max(0, limit - used);

  function reveal(id: string) {
    setPendingId(id);
    startTransition(async () => {
      const res = await revealProfile(id);
      setPendingId(null);
      if (res.ok) {
        setRevealed((prev) => new Set(prev).add(id));
        if (res.remaining != null) setUsed(limit - res.remaining);
      } else if ("locked" in res && res.locked) {
        setUpgradeOpen(true);
      }
    });
  }

  return (
    <>
      {isAuthenticated && !isPremium && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/40 px-4 py-3 text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Eye className="size-4 text-gold" />
            {t("revealsLeft", { count: remaining })}
          </span>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 font-medium text-gold hover:underline"
          >
            <Sparkles className="size-4" />
            {t("upgrade")}
          </Link>
        </div>
      )}

      {people.length === 0 ? (
        <p className="mt-16 text-center text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((p) => {
            const isRevealed = isPremium || revealed.has(p.id);
            const initial = (p.display_name ?? "?").trim().charAt(0).toUpperCase();
            const place = [p.city, p.country].filter(Boolean).join(", ");
            return (
              <div
                key={p.id}
                className="glass flex flex-col gap-4 rounded-2xl p-5"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="size-12">
                    {p.avatar_url && (
                      <AvatarImage src={p.avatar_url} alt={p.display_name ?? ""} />
                    )}
                    <AvatarFallback className="bg-gradient-to-br from-gold to-kurd-red text-primary-foreground">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 truncate font-display text-lg font-semibold">
                      <span className="truncate">{p.display_name}</span>
                      <VerifiedBadge
                        verified={p.is_verified}
                        label={tProfile("verified")}
                      />
                    </div>
                    {place && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="size-3.5 text-gold" />
                        {place}
                      </div>
                    )}
                  </div>
                </div>

                {(p.origin_region ||
                  p.looking_for.length > 0 ||
                  p.languages.length > 0) && (
                  <div className="flex flex-wrap gap-1.5">
                    {p.origin_region && (
                      <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold">
                        {tOn(`origin_${p.origin_region}` as never)}
                      </span>
                    )}
                    {p.looking_for.slice(0, 2).map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-kurd-green/15 px-2 py-0.5 text-xs font-medium text-kurd-green"
                      >
                        {tOn(`looking_${item}` as never)}
                      </span>
                    ))}
                    {p.languages.slice(0, 2).map((l) => (
                      <span
                        key={l}
                        className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                )}

                {/* Gated detail */}
                <div className="relative min-h-[3.5rem]">
                  <div
                    className={cn(
                      "flex flex-col gap-3 transition",
                      !isRevealed && "pointer-events-none select-none blur-[6px]"
                    )}
                  >
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {p.bio || t("noBio")}
                    </p>
                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="outline" className="gap-1.5">
                        <Link href={`/u/${p.id}`}>
                          <UserRound className="size-4" />
                          {t("viewProfile")}
                        </Link>
                      </Button>
                      {isAuthenticated ? (
                        <MessageButton
                          targetUserId={p.user_id}
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground"
                        />
                      ) : (
                        <Button asChild size="sm" variant="ghost" className="gap-1.5">
                          <Link href="/login">
                            <MessageCircle className="size-4" />
                            {tChat("message")}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>

                  {!isRevealed && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      {isAuthenticated ? (
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={() => reveal(p.id)}
                          disabled={pendingId === p.id}
                        >
                          <Eye className="size-4" />
                          {t("reveal")}
                        </Button>
                      ) : (
                        <Button asChild size="sm" variant="outline" className="gap-1.5">
                          <Link href="/login">
                            <Lock className="size-4" />
                            {t("signInToView")}
                          </Link>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </>
  );
}
