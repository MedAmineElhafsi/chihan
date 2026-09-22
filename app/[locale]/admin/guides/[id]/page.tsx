import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/moderation";
import { getGuideById } from "@/lib/guides";
import { LAUNCH_COUNTRY } from "@/lib/constants";
import { GuideEditor } from "@/components/guides/guide-editor";

export default async function EditGuidePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user || !(await isAdmin(user.id))) notFound();

  const guide = await getGuideById(id);
  if (!guide) notFound();
  const t = await getTranslations("Guides");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/admin/guides"
        className="label-mono hover:text-cyan transition-colors"
      >
        ← {t("adminTitle")}
      </Link>
      <h1
        dir="auto"
        className="font-display mt-4 text-3xl font-semibold tracking-tight"
      >
        {guide.title}
      </h1>
      <div className="mt-6">
        <GuideEditor
          guide={guide}
          defaultCountry={LAUNCH_COUNTRY}
          key={guide.id}
        />
      </div>
    </div>
  );
}
