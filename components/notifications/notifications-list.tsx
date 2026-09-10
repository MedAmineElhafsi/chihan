"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Heart, MessageCircle, MessageSquare, Users, HandHeart } from "lucide-react";

import { Link } from "@/i18n/navigation";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notification-actions";
import type { AppNotification } from "@/types/notification";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function isGroupNotification(n: AppNotification) {
  return (
    n.type === "group_message" ||
    n.link.startsWith("/groups/") ||
    n.link.includes("/groups/")
  );
}

function groupNotifKind(n: AppNotification): "chat" | "board" | "invite" {
  if (n.link.includes("#board")) return "board";
  if (n.link.includes("invite=")) return "invite";
  return "chat";
}

function typeIcon(
  type: AppNotification["type"],
  isGroup = false,
  kind?: "chat" | "board" | "invite"
) {
  if (type === "help_match") return HandHeart;
  if (type === "like") return Heart;
  if (type === "comment") return MessageSquare;
  if (kind === "board") return MessageSquare;
  if (type === "group_message" || isGroup) return Users;
  return MessageCircle;
}

function notificationCopy(
  t: ReturnType<typeof useTranslations<"Notifications">>,
  n: AppNotification
) {
  const name = n.actor_name || t("someone");
  if (isGroupNotification(n)) {
    const group = n.context_label || t("aGroup");
    const kind = groupNotifKind(n);
    if (kind === "board") return t("group_post", { name, group });
    if (kind === "invite") return t("group_invite", { name, group });
    return t("group_message", { name, group });
  }
  if (n.type === "help_match") return t("help_match", { name });
  if (n.type === "like" || n.type === "comment" || n.type === "message") {
    return t(n.type, { name });
  }
  return t("message", { name });
}

export function NotificationsList({ items }: { items: AppNotification[] }) {
  const t = useTranslations("Notifications");
  const [, startT] = useTransition();

  if (items.length === 0) {
    return (
      <p className="mt-16 text-center text-muted-foreground">{t("empty")}</p>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-2">
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            startT(() => {
              void markAllNotificationsRead();
            })
          }
        >
          {t("markAllRead")}
        </Button>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((n) => {
          const kind = isGroupNotification(n) ? groupNotifKind(n) : undefined;
          const Icon = typeIcon(n.type, isGroupNotification(n), kind);
          const name = n.actor_name || t("someone");
          const initial = name.trim().charAt(0).toUpperCase() || "?";
          return (
            <li key={n.id}>
              <Link
                href={n.link}
                onClick={() => {
                  if (!n.read_at)
                    startT(() => {
                      void markNotificationRead(n.id);
                    });
                }}
                className={cn(
                  "panel flex items-start gap-3 rounded-xl p-4 transition-colors hover:bg-accent/40",
                  !n.read_at && "border-cyan/30"
                )}
              >
                <Avatar className="size-10 shrink-0">
                  {n.actor_avatar && (
                    <AvatarImage src={n.actor_avatar} alt={name} />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-cyan to-depth-4 text-primary-foreground">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2 text-sm">
                    <Icon className="mt-0.5 size-4 shrink-0 text-cyan" />
                    <span>{notificationCopy(t, n)}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
                {!n.read_at && (
                  <span className="mt-2 size-2.5 shrink-0 rounded-full bg-cyan" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
