import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type HomeTab = "posts" | "help" | "news";

export const HOME_TABS: HomeTab[] = ["posts", "help", "news"];

export function parseHomeTab(value: string | undefined): HomeTab {
  return HOME_TABS.includes(value as HomeTab) ? (value as HomeTab) : "posts";
}

/**
 * Home holds three things people read: what the community posted, what it
 * needs help with, and what happened. Links rather than client state, so a
 * tab can be shared, opened in a new window and rendered on the server.
 */
export async function HomeTabs({ active }: { active: HomeTab }) {
  const t = await getTranslations("Home");

  return (
    <nav
      aria-label={t("tabsLabel")}
      className="flex gap-1 rounded-lg border border-border bg-card/40 p-1"
    >
      {HOME_TABS.map((tab) => (
        <Link
          key={tab}
          href={tab === "posts" ? "/feed" : `/feed?tab=${tab}`}
          aria-current={tab === active ? "page" : undefined}
          className={cn(
            "flex-1 rounded-md px-3 py-2 text-center text-sm font-medium transition-colors",
            tab === active
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t(tab)}
        </Link>
      ))}
    </nav>
  );
}
