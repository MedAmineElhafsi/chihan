import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/moderation";
import {
  getUnreadNotificationCount,
  listNotifications,
} from "@/lib/notifications";
import { getUnreadMessageCount } from "@/lib/chat";
import { BrandWordmark } from "./brand";
import { LanguageSwitcher } from "./language-switcher";
import { UserMenu } from "./user-menu";
import { MobileMenu } from "./mobile-menu";
import { NotificationsBell } from "@/components/notifications/notifications-bell";
import { ChatIcon } from "./chat-icon";

// The same five destinations as the mobile tab bar, so the app has one
// shape on every screen size.
const NAV = [
  { href: "/explore", key: "home" },
  { href: "/feed", key: "explore" },
  { href: "/reels", key: "reels" },
  { href: "/help", key: "help" },
  { href: "/directory", key: "directory" },
] as const;

export async function SiteHeader() {
  const t = await getTranslations("Nav");
  const user = await getCurrentUser();
  const email = user?.email ?? null;
  const admin = user ? await isAdmin(user.id) : false;
  const [notifItems, unread, unreadMessages] = user
    ? await Promise.all([
        listNotifications(user.id, 8),
        getUnreadNotificationCount(user.id),
        getUnreadMessageCount(user.id),
      ])
    : [[], 0, 0];

  return (
    <header className="sticky top-0 z-40 bg-depth-0/70 backdrop-blur-xl after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-6 after:bg-gradient-to-b after:from-depth-0/60 after:to-transparent">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-10">
          <BrandWordmark />

          {/* Mono nav — reads like a system index, not a marketing menu */}
          <nav className="hidden items-center gap-7 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="group relative font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors duration-200 hover:text-cyan"
              >
                {t(item.key)}
                <span className="absolute -bottom-1.5 left-0 h-px w-full scale-x-0 bg-cyan transition-transform duration-300 group-hover:scale-x-100" />
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <div className="hidden items-center gap-1 lg:flex">
            <Link
              href="/search"
              className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-cyan"
            >
              {t("search")}
            </Link>
            <span className="mx-3 h-4 w-px bg-border" />
            <LanguageSwitcher />
            {user && <ChatIcon unread={unreadMessages} />}
            {user && (
              <NotificationsBell
                initialItems={notifItems}
                initialUnread={unread}
              />
            )}
            <span className="mx-1 h-4 w-px bg-border" />
            <UserMenu email={email} isAdmin={admin} />
          </div>

          <div className="flex items-center gap-0.5 lg:hidden">
            {user && <ChatIcon unread={unreadMessages} />}
            {user && (
              <NotificationsBell
                initialItems={notifItems}
                initialUnread={unread}
              />
            )}
            <MobileMenu email={email} isAdmin={admin} />
          </div>
        </div>
      </div>
    </header>
  );
}
