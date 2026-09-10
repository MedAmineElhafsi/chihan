"use client";

import { usePathname } from "next/navigation";
import { Clapperboard, Compass, Home, Plus, User } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ComposeSheet } from "./compose-sheet";

/**
 * Five destinations, with create in the middle.
 *
 * Reels is a place you go, not a thing you make — burying it in the create
 * menu meant nobody could find it. Chat lives in the header with an unread
 * badge instead, which is where a messages icon belongs and keeps this bar
 * symmetrical around the create button.
 */
const TABS = [
  { href: "/explore", key: "home", Icon: Home },
  { href: "/feed", key: "explore", Icon: Compass },
  { href: "/reels", key: "reels", Icon: Clapperboard },
  { href: "/profile", key: "you", Icon: User },
] as const;

export function TabBar({ signedIn }: { signedIn: boolean }) {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  // Strip the locale prefix so /de/feed and /feed both match.
  const path = pathname.replace(/^\/[a-z]{2,3}(?=\/|$)/, "") || "/";
  const isOn = (href: string) => path === href || path.startsWith(`${href}/`);

  const [left, right] = [TABS.slice(0, 2), TABS.slice(2)];

  return (
    <nav
      aria-label={t("primary")}
      className="bg-depth-0/75 before:from-depth-0/70 fixed inset-x-0 bottom-0 z-50 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:h-6 before:bg-gradient-to-t before:to-transparent lg:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 items-center px-2">
        {left.map((tab) => (
          <TabLink
            key={tab.key}
            href={tab.href}
            Icon={tab.Icon}
            active={isOn(tab.href)}
            label={t(tab.key)}
          />
        ))}

        <div className="flex items-center justify-center py-2">
          {signedIn ? (
            <ComposeSheet />
          ) : (
            <Link
              href="/signup"
              aria-label={t("getStarted")}
              className="flex size-11 items-center justify-center rounded-xl bg-cyan text-depth-0 shadow-glow transition-transform active:scale-95"
            >
              <Plus className="size-5" strokeWidth={2.2} />
            </Link>
          )}
        </div>

        {right.map((tab) => (
          <TabLink
            key={tab.key}
            href={tab.href}
            Icon={tab.Icon}
            active={isOn(tab.href)}
            label={t(tab.key)}
          />
        ))}
      </div>
    </nav>
  );
}

function TabLink({
  href,
  Icon,
  label,
  active,
}: {
  href: string;
  Icon: typeof Home;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg py-2 transition-colors",
        active ? "text-cyan" : "text-muted-foreground hover:text-air"
      )}
    >
      <Icon className="size-5" strokeWidth={active ? 2.1 : 1.7} />
      <span className="font-mono text-[0.625rem] uppercase tracking-[0.1em]">
        {label}
      </span>
    </Link>
  );
}
