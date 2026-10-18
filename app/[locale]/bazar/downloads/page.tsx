import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Download } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { bazarEnabled, getMyPurchases } from "@/lib/shop";
import { money } from "@/lib/tickets";
import { Button } from "@/components/ui/button";

export default async function DownloadsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await bazarEnabled())) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const t = await getTranslations("Bazar");
  const purchases = await getMyPurchases(user.id);
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/bazar"
        className="text-muted-foreground hover:text-foreground text-sm transition-colors"
      >
        ← {t("back")}
      </Link>

      <h1 className="font-display text-air mt-4 text-2xl font-semibold tracking-tight">
        {t("downloadsTitle")}
      </h1>
      <p className="text-muted-foreground mt-1 text-sm">
        {t("downloadsSubtitle")}
      </p>

      {purchases.length === 0 ? (
        <p className="text-muted-foreground mt-12 py-12 text-center">
          {t("downloadsEmpty")}
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {purchases.map((p) => (
            <li
              key={p.id}
              className="panel flex flex-wrap items-center justify-between gap-3 rounded-lg p-4"
            >
              <div className="min-w-0">
                <div dir="auto" className="font-medium">
                  {p.slug ? (
                    <Link href={`/bazar/${p.slug}`} className="hover:text-cyan">
                      {p.title || t("anItem")}
                    </Link>
                  ) : (
                    p.title || t("anItem")
                  )}
                </div>
                <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 text-xs">
                  <span>{dateFmt.format(new Date(p.created_at))}</span>
                  <span>
                    {p.amount_cents === 0
                      ? t("free")
                      : money(p.amount_cents, p.currency, locale)}
                  </span>
                  {p.status !== "paid" && (
                    <span>{t(`orderStatus_${p.status}` as never)}</span>
                  )}
                </div>
              </div>

              {p.status === "paid" && p.url ? (
                <Button asChild size="sm" className="gap-1.5">
                  <a href={p.url} download>
                    <Download className="size-3.5" aria-hidden="true" />
                    {t("download")}
                  </a>
                </Button>
              ) : (
                <span className="text-muted-foreground text-xs">
                  {t("downloadUnavailable")}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
