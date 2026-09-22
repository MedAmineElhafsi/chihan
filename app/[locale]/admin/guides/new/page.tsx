import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/moderation";
import { getAllGuides, getGuideById } from "@/lib/guides";
import { guidesReady } from "@/lib/schema-ready";
import { LAUNCH_COUNTRY } from "@/lib/constants";
import { GuideEditor } from "@/components/guides/guide-editor";
import type { Guide } from "@/types/guide";

export default async function NewGuidePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string; title?: string; city?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user || !(await isAdmin(user.id)) || !(await guidesReady())) notFound();

  const sp = await searchParams;
  const t = await getTranslations("Guides");

  // "Add another language": start from an existing version, and know which
  // languages it already has.
  let source: Guide | undefined;
  if (sp.from) {
    const from = await getGuideById(sp.from);
    if (from) {
      const all = await getAllGuides();
      source = {
        ...from,
        languages: all.filter((g) => g.slug === from.slug).map((g) => g.locale),
      };
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/admin/guides"
        className="label-mono hover:text-cyan transition-colors"
      >
        ← {t("adminTitle")}
      </Link>
      <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight">
        {source
          ? t("newLanguageTitle", { title: source.title })
          : t("newTitle")}
      </h1>
      <div className="mt-6">
        <GuideEditor
          source={source}
          initial={source ? undefined : { title: sp.title, city: sp.city }}
          defaultCountry={LAUNCH_COUNTRY}
        />
      </div>
    </div>
  );
}
