import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { getCurrentUser } from "@/lib/auth";
import { getSafetyState } from "@/lib/blocks";
import { getProfileById } from "@/lib/profiles";
import { ProfileView } from "@/components/profile/profile-view";
import { MessageButton } from "@/components/chat/message-button";
import { RecordProfileView } from "@/components/profile/record-profile-view";
import { SafetyActions } from "@/components/safety/safety-actions";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  // RLS returns nothing for a private profile unless the viewer is the owner.
  const profile = await getProfileById(id);
  if (!profile) notFound();

  const user = await getCurrentUser();
  const isOwner = user?.id === profile.user_id;
  const safety =
    user && !isOwner
      ? await getSafetyState(user.id, profile.user_id)
      : { blocked: false, muted: false };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      {user && !isOwner && !safety.blocked && (
        <RecordProfileView profileId={profile.id} />
      )}
      <div className="animate-rise">
        <ProfileView profile={profile} isOwner={isOwner} />
      </div>
      {user && !isOwner && (
        <div className="animate-rise mt-4 flex flex-col items-end gap-3 [animation-delay:80ms]">
          {!safety.blocked && (
            <MessageButton targetUserId={profile.user_id} />
          )}
          <SafetyActions
            targetUserId={profile.user_id}
            profileId={profile.id}
            initiallyBlocked={safety.blocked}
            initiallyMuted={safety.muted}
          />
        </div>
      )}
    </div>
  );
}
