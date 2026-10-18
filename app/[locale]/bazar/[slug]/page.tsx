import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Download, Pencil } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/moderation";
import { bazarEnabled, getProduct } from "@/lib/shop";
import { preview, snippet } from "@/lib/og";
import { fileKind, fileSize } from "@/types/shop";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/share/share-button";
import { DownloadButton } from "@/components/bazar/download-button";
import { BuyButton } from "@/components/bazar/buy-button";
import { money } from "@/lib/tickets";
import { getMyPurchases } from "@/lib/shop";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};
  const description = snippet(product.description, 160);
  return {
    title: product.title,
    description,
    ...preview({
      title: product.title,
      description,
      image: product.preview_url,
      locale,
    }),
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  if (!(await bazarEnabled())) notFound();

  const product = await getProduct(slug);
  if (!product) notFound();

  const user = await getCurrentUser();
  const admin = user ? await isAdmin(user.id) : false;
  const paid = product.price_cents > 0;
  // Something already bought is downloaded, not bought again.
  const owned =
    paid && user
      ? (await getMyPurchases(user.id)).some(
          (o) => o.product_id === product.id && o.status === "paid"
        )
      : false;
  // Only an administrator sees work that is not on the shelf.
  if (product.status !== "listed" && !admin) notFound();

  const t = await getTranslations("Bazar");
  const kind = fileKind(product.file_type);
  const size = fileSize(product.file_bytes, locale);
  const fileName = `${product.slug}${
    product.file_type === "application/pdf"
      ? ".pdf"
      : product.file_type === "image/svg+xml"
        ? ".svg"
        : product.file_type === "application/zip"
          ? ".zip"
          : ""
  }`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link
        href="/bazar"
        className="text-muted-foreground hover:text-foreground text-sm transition-colors"
      >
        ← {t("back")}
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div>
          {product.preview_url ? (
            <div className="border-border bg-depth-1 overflow-hidden rounded-xl border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.preview_url}
                alt={product.title}
                className="w-full object-cover"
              />
            </div>
          ) : (
            <div className="border-border bg-depth-1 flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border">
              <span className="text-muted-foreground font-mono text-4xl tracking-[0.18em]">
                {kind || "?"}
              </span>
              <span className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase">
                {t("noPreview")}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {product.status !== "listed" && (
            <span className="bg-secondary text-muted-foreground w-fit rounded-md px-2 py-1 text-xs font-medium">
              {t(`status_${product.status}` as never)}
            </span>
          )}

          <h1
            dir="auto"
            className="font-display text-air text-[clamp(1.5rem,3.5vw,2.25rem)] leading-tight font-semibold tracking-tight"
          >
            {product.title}
          </h1>

          {product.maker?.displayName && (
            <p className="text-muted-foreground text-sm">
              {t("by", { name: product.maker.displayName })}
            </p>
          )}

          <p
            dir="auto"
            className="text-foreground/90 leading-relaxed whitespace-pre-wrap"
          >
            {product.description}
          </p>

          <dl className="border-border text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 border-t pt-4 text-sm">
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">{t("price")}</dt>
              <dd className="text-cyan inline-flex items-center gap-1.5 font-medium">
                <Download className="size-4" aria-hidden="true" />
                {paid
                  ? money(product.price_cents, product.currency, locale)
                  : t("free")}
              </dd>
            </div>
            {(kind || size) && (
              <div>
                <dt className="sr-only">{t("fileLabel")}</dt>
                <dd className="font-mono">
                  {[kind, size].filter(Boolean).join(" · ")}
                </dd>
              </div>
            )}
            <div>
              <dt className="sr-only">{t("downloadsLabel")}</dt>
              <dd>{t("downloads", { count: product.downloads })}</dd>
            </div>
          </dl>

          {product.status === "listed" &&
            product.file_path &&
            (!paid || owned ? (
              <DownloadButton productId={product.id} fileName={fileName} />
            ) : (
              <BuyButton
                productId={product.id}
                price={money(product.price_cents, product.currency, locale)}
                canBuy={Boolean(user) && product.seller_id !== user?.id}
              />
            ))}

          {paid && !owned && !user && (
            <p className="text-muted-foreground text-sm">{t("signInToBuy")}</p>
          )}

          <p className="text-muted-foreground text-xs">
            {t(`licence_${product.licence}` as never)}
          </p>

          <div className="flex flex-wrap gap-2">
            <ShareButton
              path={`/bazar/${product.slug}`}
              title={product.title}
            />
            {admin && (
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link href={`/admin/bazar/${product.id}`}>
                  <Pencil className="size-4" aria-hidden="true" />
                  {t("edit")}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
