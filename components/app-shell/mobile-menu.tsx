"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Bell,
  Check,
  Eye,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { locales, localeMeta, type Locale } from "@/i18n/routing";
import { signOutAction } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MobileMenu({
  email,
  isAdmin,
}: {
  email: string | null;
  isAdmin?: boolean;
}) {
  const tNav = useTranslations("Nav");
  const tCommon = useTranslations("Common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale) return;
    startTransition(() => router.replace(pathname, { locale: next }));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={tNav("openMenu")}>
          <Menu className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[15rem]">
        <DropdownMenuItem asChild>
          <Link href="/help" className="font-medium text-cyan">
            {tNav("help")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/explore">{tNav("explore")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/directory">{tNav("directory")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/people">{tNav("people")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/match">{tNav("match")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/feed">{tNav("feed")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/news">{tNav("news")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/groups">{tNav("groups")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/search">{tNav("search")}</Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>{tCommon("language")}</DropdownMenuLabel>
        {locales.map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => switchTo(l)}
            dir={localeMeta[l].dir}
          >
            <span className="flex-1 font-medium">{localeMeta[l].native}</span>
            {l === locale && <Check className="size-4 text-cyan" />}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        {email ? (
          <>
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <UserRound />
                {tNav("profile")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/views">
                <Eye />
                {tNav("whoViewed")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/match">
                <HeartHandshake />
                {tNav("match")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/messages">
                <MessageSquare />
                {tNav("messages")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/notifications">
                <Bell />
                {tNav("notifications")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard">
                <LayoutDashboard />
                {tNav("dashboard")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings />
                {tNav("settings")}
              </Link>
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem asChild>
                <Link href="/admin">
                  <ShieldCheck />
                  {tNav("admin")}
                </Link>
              </DropdownMenuItem>
            )}
            <form action={signOutAction}>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={(e) => {
                  e.preventDefault();
                  const el = e.target as HTMLElement | null;
                  el?.closest("form")?.requestSubmit();
                }}
              >
                <LogOut />
                {tNav("signOut")}
              </DropdownMenuItem>
            </form>
          </>
        ) : (
          <>
            <DropdownMenuItem asChild>
              <Link href="/login">{tNav("signIn")}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/signup" className="font-medium text-cyan">
                {tNav("getStarted")}
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
