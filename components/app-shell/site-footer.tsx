import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { BRAND } from "@/lib/constants";
import { BrandMark } from "./brand";

export async function SiteFooter() {
  const t = await getTranslations("Brand");
  const tp = await getTranslations("Privacy");
  const tl = await getTranslations("Legal");
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-depth-0/60">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <BrandMark className="size-6" />
          <span className="text-sm text-muted-foreground">
            <span className="font-display font-semibold text-ink">
              {BRAND.name}
            </span>
            <span className="mx-2 text-border">/</span>
            {t("tagline")}
          </span>
        </div>
        {/* An imprint has to be reachable from every page in no more than
            two clicks (§ 5 DDG), which is why these live in the footer. */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link
            href="/privacy"
            className="label-mono transition-colors hover:text-brand"
          >
            {tp("title")}
          </Link>
          <Link
            href="/terms"
            className="label-mono transition-colors hover:text-brand"
          >
            {tl("termsTitle")}
          </Link>
          <Link
            href="/imprint"
            className="label-mono transition-colors hover:text-brand"
          >
            {tl("imprintTitle")}
          </Link>
          <span className="label-mono">© {year}</span>
        </div>
      </div>
    </footer>
  );
}
