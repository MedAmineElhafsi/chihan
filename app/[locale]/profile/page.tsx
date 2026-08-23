import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { getCurrentUser } from "@/lib/auth";
import { getOwnProfile } from "@/lib/profiles";
import { syncVerifiedBadge } from "@/lib/view-actions";
import { ProfileView } from "@/components/profile/profile-view";
import { OffersServiceSwitch } from "@/components/profile/offers-service-switch";

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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-12 sm:px-6">
      <div className="animate-rise">
        <ProfileView profile={profile} isOwner />
      </div>
      <div className="animate-rise [animation-delay:120ms]">
        <OffersServiceSwitch
          initialOn={profile.offers_service}
          hasProfession={Boolean(profile.profession)}
        />
      </div>
    </div>
  );
}
