import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { getCurrentUser } from "@/lib/auth";
import { getOwnProfile } from "@/lib/profiles";
import { classifiedsEnabled } from "@/lib/classifieds";
import { navTitle } from "@/lib/page-title";
import { ClassifiedsBoard } from "@/components/classifieds/board";

export const generateMetadata = navTitle("housing");

export default async function HousingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ city?: string; type?: string; mine?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await classifiedsEnabled())) notFound();

  // Rooms and jobs carry addresses and phone numbers: members only.
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  const profile = await getOwnProfile(user.id);

  return (
    <ClassifiedsBoard
      kind="housing"
      viewerId={user.id}
      verified={profile?.is_verified === true}
      params={await searchParams}
    />
  );
}
