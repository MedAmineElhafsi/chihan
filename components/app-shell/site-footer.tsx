import { getTranslations } from "next-intl/server";

import { BRAND } from "@/lib/constants";
import { BrandMark } from "./brand";

export async function SiteFooter() {
  const t = await getTranslations("Brand");
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
        <div>
          © {year} {BRAND.name}
        </div>
      </div>
    </footer>
  );
}
