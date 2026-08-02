import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/moderation";
import {
  getUnreadNotificationCount,
  listNotifications,
} from "@/lib/notifications";
import { BrandWordmark } from "./brand";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { MobileMenu } from "./mobile-menu";
import { NotificationsBell } from "@/components/notifications/notifications-bell";

export async function SiteHeader() {
  const t = await getTranslations("Nav");
  const user = await getCurrentUser();
  const email = user?.email ?? null;
  const admin = user ? await isAdmin(user.id) : false;
  const [notifItems, unread] = user
    ? await Promise.all([
        listNotifications(user.id, 8),
        getUnreadNotificationCount(user.id),
      ])
    : [[], 0];

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
            <Link
              href="/directory"
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
            >
              {t("directory")}
            </Link>
            <Link
              href="/people"
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
            >
              {t("people")}
            </Link>
            <Link
              href="/feed"
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
            >
              {t("feed")}
            </Link>
            <Link
              href="/news"
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
            >
              {t("news")}
            </Link>
            <Link
              href="/groups"
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
            >
              {t("groups")}
            </Link>
            <Link
              href="/search"
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
            >
              {t("search")}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="hidden items-center gap-1.5 lg:flex">
            <LanguageSwitcher />
            <ThemeToggle />
            {user && (
              <NotificationsBell
                initialItems={notifItems}
                initialUnread={unread}
              />
            )}
            <div className="mx-1 h-6 w-px bg-border" />
            <UserMenu email={email} isAdmin={admin} />
          </div>
          <div className="flex items-center gap-0.5 lg:hidden">
            {user && (
              <NotificationsBell
                initialItems={notifItems}
                initialUnread={unread}
              />
            )}
            <ThemeToggle />
            <MobileMenu email={email} isAdmin={admin} />
          </div>
        </div>
      </div>
    </header>
  );
}
