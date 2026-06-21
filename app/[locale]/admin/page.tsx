import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { getCurrentUser } from "@/lib/auth";
import { getOpenReports, isAdmin } from "@/lib/moderation";
import { ReportRow } from "@/components/moderation/report-row";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user || !(await isAdmin(user.id))) notFound();

  const t = await getTranslations("Admin");
  const reports = await getOpenReports();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>

      <div className="mt-6 flex flex-col gap-3">
        {reports.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">{t("empty")}</p>
        ) : (
          reports.map((r) => <ReportRow key={r.id} report={r} />)
        )}
      </div>
    </div>
  );
}
