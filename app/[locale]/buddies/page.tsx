import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BadgeCheck, HeartHandshake, MapPin, ShieldAlert } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOwnProfile } from "@/lib/profiles";
import {
  buddiesEnabled,
  getBuddyCandidates,
  getBuddyCounts,
  getMyBuddyProfile,
  getMyPairs,
} from "@/lib/buddies";
import { navTitle } from "@/lib/page-title";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageButton } from "@/components/chat/message-button";
import { ReportButton } from "@/components/moderation/report-button";
import { JoinChooser } from "@/components/buddies/join-chooser";
import { MyEntry } from "@/components/buddies/my-entry";
import {
  AskBuddyButton,
  EndBuddyButton,
  RespondButtons,
} from "@/components/buddies/buddy-actions-ui";

export const generateMetadata = navTitle("buddies");

export default async function BuddiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await buddiesEnabled())) notFound();

  const t = await getTranslations("Buddies");
  const user = await getCurrentUser();

  const header = (
    <div className="flex flex-col gap-3">
      <span className="label-mono">{t("eyebrow")}</span>
      <h1 className="font-display text-air text-[clamp(2rem,5vw,3.25rem)] leading-[0.95] font-semibold tracking-tight">
        {t("title")}
      </h1>
      <p className="text-muted-foreground max-w-xl">{t("subtitle")}</p>
    </div>
  );

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {header}
        <div className="panel mt-8 flex flex-wrap items-center justify-between gap-3 rounded-md p-5">
          <p className="text-muted-foreground text-sm">{t("signIn")}</p>
          <Button asChild className="gap-2">
            <Link href="/signup">
              <HeartHandshake className="size-4" aria-hidden="true" />
              {t("joinCta")}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const [profile, entry, pairs] = await Promise.all([
    getOwnProfile(user.id),
    getMyBuddyProfile(user.id),
    getMyPairs(user.id),
  ]);
  const counts =
    entry?.role === "mentor"
      ? await getBuddyCounts(user.id)
      : { active: 0, helped: 0 };
  const candidates =
    entry?.role === "newcomer" && !pairs.some((p) => p.status === "active")
      ? await getBuddyCandidates(user.id, {
          city: profile?.city ?? null,
          languages: profile?.languages ?? [],
          areas: entry.areas,
        })
      : [];

  const incoming = pairs.filter(
    (p) => p.status === "requested" && p.mentor_id === user.id
  );
  const outgoing = pairs.filter(
    (p) => p.status === "requested" && p.newcomer_id === user.id
  );
  const active = pairs.filter((p) => p.status === "active");
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  const person = (p: {
    displayName: string | null;
    avatarUrl: string | null;
    verified?: boolean;
    city?: string | null;
  }) => {
    const name = p.displayName ?? t("member");
    return (
      <span className="flex min-w-0 items-center gap-3">
        <Avatar className="size-10">
          {p.avatarUrl && <AvatarImage src={p.avatarUrl} alt={name} />}
          <AvatarFallback className="bg-depth-4 text-air">
            {name.trim().charAt(0).toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0">
          <span className="text-air flex items-center gap-1.5 font-medium">
            {name}
            {p.verified && (
              <BadgeCheck className="text-cyan size-4" aria-hidden="true" />
            )}
          </span>
          {p.city && (
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <MapPin className="text-cyan size-3" aria-hidden="true" />
              {p.city}
            </span>
          )}
        </span>
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {header}

      <div className="mt-8 flex flex-col gap-8">
        {!entry && <JoinChooser verified={profile?.is_verified === true} />}

        {/* Waiting for an answer, from either side. */}
        {incoming.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-air text-xl font-semibold">
              {t("incomingTitle", { count: incoming.length })}
            </h2>
            <ul className="flex flex-col gap-3">
              {incoming.map((p) => (
                <li
                  key={p.id}
                  className="panel flex flex-col gap-3 rounded-md p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {person(
                      p.partner ?? { displayName: null, avatarUrl: null }
                    )}
                    <RespondButtons pairId={p.id} />
                  </div>
                  {p.message && (
                    <p
                      dir="auto"
                      className="text-foreground/90 text-sm whitespace-pre-wrap"
                    >
                      {p.message}
                    </p>
                  )}
                  {p.partnerEntry && p.partnerEntry.areas.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {p.partnerEntry.areas.map((a) => (
                        <span
                          key={a}
                          className="bg-secondary text-muted-foreground rounded-sm px-2 py-1 text-xs"
                        >
                          {t(`area_${a}` as never)}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {outgoing.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-air text-xl font-semibold">
              {t("waitingTitle")}
            </h2>
            <ul className="flex flex-col gap-2">
              {outgoing.map((p) => (
                <li
                  key={p.id}
                  className="panel flex flex-wrap items-center justify-between gap-3 rounded-md p-4"
                >
                  {person(p.partner ?? { displayName: null, avatarUrl: null })}
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {t("asked", {
                        date: dateFmt.format(new Date(p.created_at)),
                      })}
                    </span>
                    <EndBuddyButton pairId={p.id} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {active.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-air text-xl font-semibold">
              {t("activeTitle")}
            </h2>
            <ul className="flex flex-col gap-3">
              {active.map((p) => (
                <li
                  key={p.id}
                  className="panel flex flex-wrap items-center justify-between gap-3 rounded-md p-4"
                >
                  {person(p.partner ?? { displayName: null, avatarUrl: null })}
                  <span className="flex items-center gap-2">
                    {p.partner && (
                      <MessageButton
                        targetUserId={p.partner.userId}
                        reason="help"
                        size="sm"
                        variant="outline"
                      />
                    )}
                    {p.partner && (
                      <ReportButton
                        targetType="profile"
                        targetId={p.partner.profileId ?? p.partner.userId}
                      />
                    )}
                    <EndBuddyButton pairId={p.id} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Who a newcomer could ask. */}
        {entry?.role === "newcomer" && active.length === 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-air text-xl font-semibold">
              {t("candidatesTitle")}
            </h2>
            {candidates.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {t("noCandidates")}
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {candidates.map((c) => (
                  <li
                    key={c.userId}
                    className="panel flex flex-col gap-3 rounded-md p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {person(c)}
                      <AskBuddyButton
                        mentorId={c.userId}
                        name={c.displayName ?? t("member")}
                      />
                    </div>
                    {c.about && (
                      <p
                        dir="auto"
                        className="text-foreground/90 text-sm whitespace-pre-wrap"
                      >
                        {c.about}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {c.areas.map((a) => (
                        <span
                          key={a}
                          className="bg-secondary text-muted-foreground rounded-sm px-2 py-1 text-xs"
                        >
                          {t(`area_${a}` as never)}
                        </span>
                      ))}
                      {c.sharedLanguages.length > 0 && (
                        <span className="text-cyan text-xs">
                          {t("sharedLanguages", {
                            languages: c.sharedLanguages.join(", "),
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {t("helped", { count: c.helped })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {entry && (
          <MyEntry
            entry={entry}
            verified={profile?.is_verified === true}
            helped={counts.helped}
          />
        )}

        {/* The rules, where everyone sees them. */}
        <section className="border-border flex flex-col gap-2 rounded-md border p-5">
          <h2 className="text-air flex items-center gap-2 font-medium">
            <ShieldAlert className="text-cyan size-5" aria-hidden="true" />
            {t("safetyTitle")}
          </h2>
          <ul className="text-muted-foreground flex list-disc flex-col gap-1.5 ps-5 text-sm">
            {["meet", "money", "papers", "end", "report"].map((k) => (
              <li key={k}>{t(`safety_${k}` as never)}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
