import { getLocale, getTranslations } from "next-intl/server";
import { Download } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { fileKind, fileSize, type Product } from "@/types/shop";

/** One piece of work on the shelf: what it is, who made it, what it costs. */
export async function ProductCard({ product }: { product: Product }) {
  const t = await getTranslations("Bazar");
  const locale = await getLocale();
  const kind = fileKind(product.file_type);
  const size = fileSize(product.file_bytes, locale);

  return (
    <Link
      href={`/bazar/${product.slug}`}
      className="group bg-depth-1 hover:bg-depth-2 relative flex flex-col transition-colors duration-300"
    >
      <span className="bg-cyan absolute inset-x-0 top-0 z-10 h-px scale-x-0 transition-transform duration-500 group-hover:scale-x-100" />

      <div className="bg-depth-2 relative aspect-[4/3] overflow-hidden">
        {product.preview_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={product.preview_url}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="text-muted-foreground flex size-full items-center justify-center font-mono text-3xl tracking-[0.18em]">
            {kind || "?"}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3
          dir="auto"
          className="font-display text-air text-base leading-snug font-semibold tracking-tight"
        >
          {product.title}
        </h3>
        {product.maker?.displayName && (
          <p className="text-muted-foreground text-xs">
            {t("by", { name: product.maker.displayName })}
          </p>
        )}
        <div className="text-muted-foreground mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-2 text-xs">
          <span className="text-cyan inline-flex items-center gap-1.5 font-medium">
            <Download className="size-3.5" aria-hidden="true" />
            {t("free")}
          </span>
          <span className="font-mono">
            {[kind, size].filter(Boolean).join(" · ")}
          </span>
        </div>
      </div>
    </Link>
  );
}
