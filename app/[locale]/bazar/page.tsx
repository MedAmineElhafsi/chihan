import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { bazarEnabled, getProducts } from "@/lib/shop";
import { navTitle } from "@/lib/page-title";
import { ProductCard } from "@/components/bazar/product-card";

export const generateMetadata = navTitle("bazar");

export default async function BazarPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await bazarEnabled())) notFound();

  const t = await getTranslations("Bazar");
  const products = await getProducts();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-3">
        <span className="label-mono">{t("eyebrow")}</span>
        <h1 className="font-display text-ink text-[clamp(2rem,5vw,3.25rem)] leading-[0.95] font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground max-w-xl">{t("subtitle")}</p>
      </div>

      {products.length === 0 ? (
        <p className="text-muted-foreground mt-12 py-12 text-center">
          {t("empty")}
        </p>
      ) : (
        <div className="bg-border mt-8 grid gap-px sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
          {/* Empty cells would otherwise show the hairline colour as a block. */}
          {products.length % 2 === 1 && (
            <div
              className="bg-depth-1 hidden sm:block lg:hidden"
              aria-hidden="true"
            />
          )}
          {Array.from({ length: (3 - (products.length % 3)) % 3 }).map(
            (_, i) => (
              <div
                key={`gap-${i}`}
                className="bg-depth-1 hidden lg:block"
                aria-hidden="true"
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
