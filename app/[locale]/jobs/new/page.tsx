import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOwnProfile } from "@/lib/profiles";
import { classifiedsEnabled } from "@/lib/classifieds";
import { ClassifiedForm } from "@/components/classifieds/classified-form";
import { SafetyNotes } from "@/components/classifieds/safety-notes";

export default async function NewJobPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await classifiedsEnabled())) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  const [profile, t] = await Promise.all([
    getOwnProfile(user.id),
    getTranslations("Board"),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/jobs"
        className="label-mono hover:text-cyan transition-colors"
      >
        ← {t("jobsTab")}
      </Link>
      <h1 className="font-display text-air mt-4 text-3xl font-semibold tracking-tight">
        {t("postJob")}
      </h1>
      <SafetyNotes kind="job" className="mt-6" />
      <div className="mt-6">
        <ClassifiedForm
          kind="job"
          userId={user.id}
          locale={locale}
          verified={profile?.is_verified === true}
        />
      </div>
    </div>
  );
}
