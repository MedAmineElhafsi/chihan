import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MapPin, Users } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getGroup, getGroupMembers, getMembership } from "@/lib/groups";
import { getGroupMessages } from "@/lib/group-chat";
import { getGroupPosts } from "@/lib/group-feed";
import { getInviteCandidates } from "@/lib/group-invite";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { JoinLeaveButton } from "@/components/groups/join-leave-button";
import { GroupChat } from "@/components/groups/group-chat";
import { GroupBoard } from "@/components/groups/group-board";
import { GroupInvite } from "@/components/groups/group-invite";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const group = await getGroup(id);
  if (!group) notFound();

  const t = await getTranslations("Groups");
  const user = await getCurrentUser();
  const [members, role] = await Promise.all([
    getGroupMembers(id),
    getMembership(id, user?.id ?? null),
  ]);
  const isMember = role != null;
  const [messages, posts, candidates] = await Promise.all([
    isMember && user ? getGroupMessages(id) : Promise.resolve([]),
    isMember && user ? getGroupPosts(id, user.id) : Promise.resolve([]),
    isMember && user ? getInviteCandidates(id) : Promise.resolve([]),
  ]);

  const place = [group.city, group.country].filter(Boolean).join(", ");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {group.name}
          </h1>
          {place && (
            <p className="mt-2 flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="size-4 text-gold" />
              {place}
            </p>
          )}
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="size-3.5 text-gold" />
            {t("memberCount", { count: group.member_count })}
          </p>
        </div>
        <JoinLeaveButton
          groupId={group.id}
          isMember={isMember}
          isOwner={role === "owner"}
          isAuthenticated={Boolean(user)}
        />
      </div>

      {group.description && (
        <p className="mt-6 whitespace-pre-wrap leading-relaxed text-foreground/90">
          {group.description}
        </p>
      )}

      {user && isMember && (
        <GroupInvite
          groupId={group.id}
          groupName={group.name}
          memberIds={members.map((m) => m.user_id)}
          candidates={candidates}
          canInvite
        />
      )}

      <GroupBoard
        groupId={group.id}
        userId={user?.id ?? null}
        canPost={Boolean(user && isMember)}
        initialPosts={posts}
      />

      {user ? (
        <GroupChat
          groupId={group.id}
          currentUserId={user.id}
          initialMessages={messages}
          canChat={isMember}
        />
      ) : (
        <section className="glass mt-10 rounded-2xl px-4 py-10 text-center text-sm text-muted-foreground">
          {t("chatSignInHint")}
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">{t("members")}</h2>
        {members.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("noMembers")}</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {members.map((m) => {
              const name = m.display_name || t("member");
              const initial = name.trim().charAt(0).toUpperCase() || "?";
              const placeM = [m.city, m.country].filter(Boolean).join(", ");
              const inner = (
                <>
                  <Avatar className="size-10">
                    {m.avatar_url && (
                      <AvatarImage src={m.avatar_url} alt={name} />
                    )}
                    <AvatarFallback className="bg-gradient-to-br from-gold to-kurd-red text-primary-foreground">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {m.role === "owner"
                        ? t("roleOwner")
                        : m.role === "admin"
                          ? t("roleAdmin")
                          : t("roleMember")}
                      {placeM ? ` · ${placeM}` : ""}
                    </div>
                  </div>
                </>
              );
              return (
                <li key={m.user_id}>
                  {m.profile_id ? (
                    <Link
                      href={`/u/${m.profile_id}`}
                      className="glass flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-accent/40"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div className="glass flex items-center gap-3 rounded-xl p-3">
                      {inner}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
