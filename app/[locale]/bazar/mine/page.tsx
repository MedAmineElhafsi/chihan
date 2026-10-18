import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Pencil } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/moderation";
import { bazarEnabled, getMySales, getMyWork } from "@/lib/shop";
import { getPayoutAccount, money } from "@/lib/tickets";
import { shopSellingConfigured } from "@/lib/stripe";
import { Button } from "@/components/ui/button";
import { PayoutConnect } from "@/components/tickets/payout-connect";
import { cn } from "@/lib/utils";

export default async function MyWorkPage({
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
  const [work, { sales, owed }, payout, admin] = await Promise.all([
    getMyWork(user.id),
    getMySales(user.id),
    getPayoutAccount(user.id),
    isAdmin(user.id),
  ]);
  const selling = shopSellingConfigured();

  if (work.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link
          href="/bazar"
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          ← {t("back")}
        </Link>
        <h1 className="font-display text-air mt-4 text-2xl font-semibold tracking-tight">
          {t("mineTitle")}
        </h1>
        <p className="text-muted-foreground mt-12 py-12 text-center">
          {t("mineEmpty")}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/bazar"
        className="text-muted-foreground hover:text-foreground text-sm transition-colors"
      >
        ← {t("back")}
      </Link>

      <h1 className="font-display text-air mt-4 text-2xl font-semibold tracking-tight">
        {t("mineTitle")}
      </h1>

      {/* Money first: it is what somebody opens this page for. */}
      {selling && owed.earned_cents > 0 && (
        <section className="mt-8">
          <dl className="grid grid-cols-2 gap-px sm:grid-cols-3">
            {(
              [
                ["earned", owed.earned_cents],
                ["sent", owed.paid_cents],
                ["owed", owed.owed_cents],
              ] as const
            ).map(([key, value]) => (
              <div key={key} className="panel rounded-lg p-4">
                <dt className="text-muted-foreground text-xs">{t(key)}</dt>
                <dd className="font-display mt-1 text-xl font-semibold">
                  {money(value, "eur", locale)}
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-muted-foreground mt-2 text-xs">{t("owedNote")}</p>
        </section>
      )}

      {selling && (
        <section className="panel mt-6 rounded-lg p-4">
          <PayoutConnect
            namespace="Bazar"
            started={Boolean(payout?.stripe_account_id)}
            ready={Boolean(payout?.charges_enabled)}
          />
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">{t("mineWork")}</h2>
        <ul className="bg-border mt-4 grid gap-px">
          {work.map((p) => {
            const sale = sales.find((s) => s.product_id === p.id);
            return (
              <li
                key={p.id}
                className="bg-depth-1 flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <div dir="auto" className="truncate font-medium">
                    {p.status === "listed" ? (
                      <Link
                        href={`/bazar/${p.slug}`}
                        className="hover:text-cyan"
                      >
                        {p.title}
                      </Link>
                    ) : (
                      p.title
                    )}
                  </div>
                  <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 text-xs">
                    <span>
                      {p.price_cents === 0
                        ? t("free")
                        : money(p.price_cents, p.currency, locale)}
                    </span>
                    {p.price_cents === 0 && (
                      <span>{t("downloads", { count: p.downloads })}</span>
                    )}
                    {sale && sale.sold > 0 && (
                      <span>
                        {t("soldCount", { count: sale.sold })} ·{" "}
                        {money(sale.earned_cents, "eur", locale)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      p.status === "listed"
                        ? "bg-success/15 text-success"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {t(`status_${p.status}` as never)}
                  </span>
                  {admin && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                    >
                      <Link href={`/admin/bazar/${p.id}`}>
                        <Pencil className="size-3.5" aria-hidden="true" />
                        {t("edit")}
                      </Link>
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
