import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { BrandWordmark } from "./brand";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { MobileMenu } from "./mobile-menu";

const NAV_KEYS = ["explore", "directory", "people", "feed", "news"] as const;

export async function SiteHeader() {
  const t = await getTranslations("Nav");
  const user = await getCurrentUser();
  const email = user?.email ?? null;

  return (
    <header className="sticky top-0 z-40 border-b border-border glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <BrandWordmark />
          <nav className="hidden items-center gap-0.5 lg:flex">
            <Link
              href="/explore"
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
            >
              {t("explore")}
            </Link>
            {NAV_KEYS.filter((key) => key !== "explore").map((key) => (
              <span
                key={key}
                className="group flex cursor-default items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {t(key)}
                <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-gold/90">
                  {t("soon")}
                </span>
              </span>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="hidden items-center gap-1.5 lg:flex">
            <LanguageSwitcher />
            <ThemeToggle />
            <div className="mx-1 h-6 w-px bg-border" />
            <UserMenu email={email} />
          </div>
          <div className="flex items-center gap-0.5 lg:hidden">
            <ThemeToggle />
            <MobileMenu email={email} />
          </div>
        </div>
      </div>
    </header>
  );
}
