"use client";

import { usePathname } from "next/navigation";
import { Clapperboard, Compass, Home, Plus, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";

import { Link } from "@/i18n/navigation";
import { springFlick } from "@/lib/motion";
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

/* A visitor has no "you" yet. /profile would only bounce them to sign-in
   after a spinner, so for a visitor the tab goes there directly and says so. */
const SIGN_IN = { href: "/login", key: "signIn", Icon: User } as const;

export function TabBar({ signedIn }: { signedIn: boolean }) {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  // Strip the locale prefix so /de/feed and /feed both match.
  const path = pathname.replace(/^\/[a-z]{2,3}(?=\/|$)/, "") || "/";
  const isOn = (href: string) => path === href || path.startsWith(`${href}/`);

  const tabs = signedIn ? TABS : [...TABS.slice(0, 3), SIGN_IN];
  const [left, right] = [tabs.slice(0, 2), tabs.slice(2)];

  return (
    // A floating glass pill rather than a bar welded to the screen edge: the
    // page scrolls on underneath and shows through it.
    <nav
      aria-label={t("primary")}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <div className="glass-strong pointer-events-auto mx-auto grid max-w-lg grid-cols-5 items-center rounded-full px-1.5">
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
              className="press liquid-fill flex size-11 items-center justify-center rounded-full bg-brand text-primary-foreground"
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
        "press relative isolate my-1.5 flex flex-col items-center gap-1 rounded-full py-1.5",
        active ? "text-brand" : "text-muted-foreground hover:text-ink"
      )}
    >
      {/* The lens: one shared element that springs from the old tab to the
          new one (layoutId), with a little overshoot because a tab change is
          a deliberate move. Motion starts it from wherever it is on screen,
          so a quick second tap redirects it mid-flight. */}
      {active && (
        <motion.span
          layoutId="tab-lens"
          transition={springFlick}
          className="absolute inset-0 -z-10 rounded-full bg-brand/12 shadow-[inset_0_1px_0_0_var(--glass-edge)]"
        />
      )}
      <Icon className="size-5" strokeWidth={active ? 2.1 : 1.7} />
      <span className="font-mono text-[0.625rem] uppercase tracking-[0.1em]">
        {label}
      </span>
    </Link>
  );
}
