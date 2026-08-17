"use client";

import { useTranslations } from "next-intl";
import {
  Bell,
  Eye,
  Globe2,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import { signOutAction } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({
  email,
  isAdmin,
}: {
  email: string | null;
  isAdmin?: boolean;
}) {
  const t = useTranslations("Nav");

  if (!email) {
    return (
      <div className="flex items-center gap-1.5">
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">{t("signIn")}</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/signup">{t("getStarted")}</Link>
        </Button>
      </div>
    );
  }

  const initial = email.trim().charAt(0).toUpperCase() || "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="rounded-full outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("account")}
        >
          <Avatar>
            <AvatarFallback className="bg-gradient-to-br from-cyan to-depth-4 text-primary-foreground">
              {initial}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[15rem]">
        <DropdownMenuLabel className="normal-case">
          <div className="text-[0.7rem] text-muted-foreground">
            {t("account")}
          </div>
          <div className="truncate text-sm font-medium text-foreground">
            {email}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/explore">
            <Globe2 />
            {t("explore")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserRound />
            {t("profile")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/views">
            <Eye />
            {t("whoViewed")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/match">
            <HeartHandshake />
            {t("match")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/messages">
            <MessageSquare />
            {t("messages")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/notifications">
            <Bell />
            {t("notifications")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LayoutDashboard />
            {t("dashboard")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings />
            {t("settings")}
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <ShieldCheck />
              {t("admin")}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={(e) => {
              // Radix closes the menu on select; keep the form submit alive.
              e.preventDefault();
              const el = e.target as HTMLElement | null;
              el?.closest("form")?.requestSubmit();
            }}
          >
            <LogOut />
            {t("signOut")}
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
