import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { getCurrentUser } from "@/lib/auth";
import { getProfileById } from "@/lib/profiles";
import { ProfileView } from "@/components/profile/profile-view";
import { MessageButton } from "@/components/chat/message-button";
import { RecordProfileView } from "@/components/profile/record-profile-view";

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

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      {user && !isOwner && <RecordProfileView profileId={profile.id} />}
      <div className="animate-fade-up">
        <ProfileView profile={profile} isOwner={isOwner} />
      </div>
      {user && !isOwner && (
        <div className="animate-fade-up mt-4 flex justify-end [animation-delay:80ms]">
          <MessageButton targetUserId={profile.user_id} />
        </div>
      )}
    </div>
  );
}
