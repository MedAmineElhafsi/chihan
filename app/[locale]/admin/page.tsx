import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getReports, isAdmin, type ReportStatusFilter } from "@/lib/moderation";
import { getDocumentUrl, getVerificationQueue } from "@/lib/verification";
import { VerificationQueue } from "@/components/admin/verification-queue";
import { ReportRow } from "@/components/moderation/report-row";
import { cn } from "@/lib/utils";

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user || !(await isAdmin(user.id))) notFound();

  const sp = await searchParams;
  const statusFilter: ReportStatusFilter =
    sp.status === "all" ? "all" : "open";

  const t = await getTranslations("Admin");
  const reports = await getReports(statusFilter);

  // Signed links expire in five minutes — these are identity documents.
  const pending = await getVerificationQueue("pending");
  const documentUrls: Record<string, string | null> = {};
  await Promise.all(
    pending.map(async (r) => {
      documentUrls[r.id] = await getDocumentUrl(r.document_url);
    })
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>

      <section className="mt-8 flex flex-col gap-3">
        <h2 className="font-display text-xl font-semibold">
          {t("verifyTitle", { count: pending.length })}
        </h2>
        <VerificationQueue requests={pending} documentUrls={documentUrls} />
      </section>

      <div className="mt-5 flex gap-1 rounded-lg border border-border bg-card/40 p-1">
        <Link
          href="/admin?status=open"
          className={cn(
            "flex-1 rounded-md px-3 py-2 text-center text-sm font-medium transition-colors",
            statusFilter === "open"
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t("open")}
        </Link>
        <Link
          href="/admin?status=all"
          className={cn(
            "flex-1 rounded-md px-3 py-2 text-center text-sm font-medium transition-colors",
            statusFilter === "all"
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t("all")}
        </Link>
      </div>

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
