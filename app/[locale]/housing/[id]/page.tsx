import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { getCurrentUser } from "@/lib/auth";
import { classifiedsEnabled, getClassified } from "@/lib/classifieds";
import { ClassifiedDetail } from "@/components/classifieds/classified-detail";

export default async function HousingPostPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!(await classifiedsEnabled())) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const item = await getClassified(id);
  if (!item || item.kind !== "housing") notFound();

  return <ClassifiedDetail item={item} viewerId={user.id} />;
}
