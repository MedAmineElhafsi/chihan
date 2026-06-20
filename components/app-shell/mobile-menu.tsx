"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Check,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  UserRound,
} from "lucide-react";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { locales, localeMeta, type Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MobileMenu({ email }: { email: string | null }) {
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
          <Link href="/explore">{tNav("explore")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/directory">{tNav("directory")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/people">{tNav("people")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/feed">{tNav("feed")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/news">{tNav("news")}</Link>
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
            {l === locale && <Check className="size-4 text-gold" />}
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
              <Link href="/messages">
                <MessageSquare />
                {tNav("messages")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard">
                <LayoutDashboard />
                {tNav("dashboard")}
              </Link>
            </DropdownMenuItem>
            <form action="/auth/signout" method="post">
              <DropdownMenuItem asChild>
                <button
                  type="submit"
                  className="w-full text-kurd-red focus:text-kurd-red"
                >
                  <LogOut />
                  {tNav("signOut")}
                </button>
              </DropdownMenuItem>
            </form>
          </>
        ) : (
          <>
            <DropdownMenuItem asChild>
              <Link href="/login">{tNav("signIn")}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/signup" className="font-medium text-gold">
                {tNav("getStarted")}
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
