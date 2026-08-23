import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { BRAND } from "@/lib/constants";
import { BrandMark } from "./brand";

export async function SiteFooter() {
  const t = await getTranslations("Brand");
  const tp = await getTranslations("Privacy");
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-depth-0/60">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <BrandMark className="size-6" />
          <span className="text-sm text-muted-foreground">
            <span className="font-display font-semibold text-air">
              {BRAND.name}
            </span>
            <span className="mx-2 text-border">/</span>
            {t("tagline")}
          </span>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/privacy"
            className="label-mono transition-colors hover:text-cyan"
          >
            {tp("title")}
          </Link>
          <span className="label-mono">© {year}</span>
        </div>
      </div>
    </footer>
  );
}
