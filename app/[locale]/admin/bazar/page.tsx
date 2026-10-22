import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Download, Pencil, Plus } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/moderation";
import { getAllProducts, getPendingProducts, getSettlement } from "@/lib/shop";
import { money } from "@/lib/tickets";
import { shopSellingConfigured } from "@/lib/stripe";
import { ReviewActions } from "@/components/bazar/review-actions";
import { SettleButton } from "@/components/bazar/settle-button";
import { bazarReady } from "@/lib/schema-ready";
import { fileKind, fileSize } from "@/types/shop";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function AdminBazarPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user || !(await isAdmin(user.id))) notFound();

  const t = await getTranslations("Bazar");
  const ready = await bazarReady();
  const [products, pending, settlement] = await Promise.all([
    getAllProducts(),
    getPendingProducts(),
    getSettlement(),
  ]);
  const selling = shopSellingConfigured();
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const num = new Intl.NumberFormat(locale);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link
        href="/admin"
        className="label-mono hover:text-brand transition-colors"
      >
        ← {t("adminBack")}
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-ink text-2xl font-semibold tracking-tight">
            {t("adminTitle")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {selling ? t("adminSubtitleSelling") : t("adminSubtitle")}
          </p>
        </div>
        {ready && (
          <Button asChild className="gap-1.5">
            <Link href="/admin/bazar/new">
              <Plus className="size-4" aria-hidden="true" />
              {t("adminAdd")}
            </Link>
          </Button>
        )}
      </div>

      {/* Waiting for a person. Nothing is listed until one has read it. */}
      {ready && pending.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold">
            {t("reviewTitle", { count: pending.length })}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("reviewSubtitle")}
          </p>
          <ul className="bg-border mt-4 grid gap-px">
            {pending.map((p) => (
              <li
                key={p.id}
                className="bg-depth-1 flex flex-wrap items-start justify-between gap-4 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div dir="auto" className="font-medium">
                    {p.title}
                  </div>
                  <p
                    dir="auto"
                    className="text-muted-foreground mt-1 line-clamp-2 text-sm"
                  >
                    {p.description}
                  </p>
                  <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 text-xs">
                    <span>{p.maker?.displayName ?? t("anUnknownMaker")}</span>
                    <span>
                      {p.price_cents === 0
                        ? t("free")
                        : money(p.price_cents, p.currency, locale)}
                    </span>
                    <span className="font-mono">
                      {fileKind(p.file_type)} · {fileSize(p.file_bytes, locale)}
                    </span>
                  </div>
                  {p.flags.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {p.flags.map((f) => (
                        <li
                          key={f}
                          className="bg-destructive/15 text-destructive rounded-full px-2 py-0.5 text-xs font-medium"
                        >
                          {t(`flag_${f}` as never)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
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
                  <ReviewActions productId={p.id} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Cîhan took the money, so Cîhan sends the share on. */}
      {ready && selling && settlement.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold">
            {t("settleTitle")}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("settleSubtitle")}
          </p>
          <ul className="bg-border mt-4 grid gap-px">
            {settlement.map((row) => (
              <li
                key={row.seller_id}
                className="bg-depth-1 flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <span className="font-medium">
                  {row.name ?? t("anUnknownMaker")}
                </span>
                <SettleButton
                  sellerId={row.seller_id}
                  amount={money(row.owed_cents, "eur", locale)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {!ready ? (
        <p className="panel mt-8 rounded-md p-5 text-sm">
          {t("adminMigration")}
        </p>
      ) : products.length === 0 ? (
        <p className="text-muted-foreground mt-12 py-12 text-center">
          {t("adminEmpty")}
        </p>
      ) : (
        <ul className="bg-border mt-8 grid gap-px">
          {products.map((p) => (
            <li
              key={p.id}
              className="bg-depth-1 flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                {p.preview_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={p.preview_url}
                    alt=""
                    className="border-border size-12 shrink-0 rounded-md border object-cover"
                  />
                ) : (
                  <span className="bg-depth-2 text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-md font-mono text-[0.6rem]">
                    {fileKind(p.file_type) || "—"}
                  </span>
                )}
                <div className="min-w-0">
                  <div dir="auto" className="truncate font-medium">
                    {p.title}
                  </div>
                  <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 text-xs">
                    <span className="font-mono">/{p.slug}</span>
                    <span>{fileSize(p.file_bytes, locale)}</span>
                    <span className="inline-flex items-center gap-1">
                      <Download className="size-3" aria-hidden="true" />
                      {num.format(p.downloads)}
                    </span>
                    <span>{dateFmt.format(new Date(p.created_at))}</span>
                  </div>
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
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <Link href={`/admin/bazar/${p.id}`}>
                    <Pencil className="size-3.5" aria-hidden="true" />
                    {t("edit")}
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
