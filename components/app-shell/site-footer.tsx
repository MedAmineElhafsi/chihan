import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { BRAND } from "@/lib/constants";
import { BrandMark } from "./brand";

export async function SiteFooter() {
  const t = await getTranslations("Brand");
  const tp = await getTranslations("Privacy");
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-border/60">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <div className="flex items-center gap-2.5">
          <BrandMark className="size-6" />
          <span>
            <span className="font-medium text-foreground">{BRAND.name}</span>{" "}
            — {t("tagline")}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            {tp("title")}
          </Link>
          <span>
            © {year} {BRAND.name}
          </span>
        </div>
      </div>
    </footer>
  );
}
