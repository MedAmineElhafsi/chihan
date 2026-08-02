import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { getCurrentUser } from "@/lib/auth";
import { getOwnProfile } from "@/lib/profiles";
import { syncVerifiedBadge } from "@/lib/view-actions";
import { ProfileView } from "@/components/profile/profile-view";

export default async function MyProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  await syncVerifiedBadge(user.id);
  const profile = await getOwnProfile(user.id);
  if (!profile || !profile.display_name) redirect(`/${locale}/onboarding`);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <div className="animate-fade-up">
        <ProfileView profile={profile} isOwner />
      </div>
    </div>
  );
}
