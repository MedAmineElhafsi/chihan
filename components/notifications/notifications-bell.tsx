"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Bell, Heart, MessageCircle, MessageSquare, Users, HandHeart } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/env";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notification-actions";
import type { AppNotification } from "@/types/notification";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

function typeIcon(type: AppNotification["type"], isGroup = false, kind?: "chat" | "board" | "invite") {
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

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function NotificationsBell({
  initialItems,
  initialUnread,
}: {
  initialItems: AppNotification[];
  initialUnread: number;
}) {
  const t = useTranslations("Notifications");
  const [items, setItems] = useState(initialItems);
  const [unread, setUnread] = useState(initialUnread);
  const [, startT] = useTransition();

  // Re-sync when the server sends genuinely new data (e.g. after navigation).
  // Adjusting state during render is React's supported pattern for this —
  // doing it in an effect triggers a cascading re-render. Comparing a content
  // signature (not array identity) also preserves optimistic read marks when
  // the server re-renders with unchanged data.
  const serverSignature = `${initialUnread}|${initialItems
    .map((n) => `${n.id}:${n.read_at ? 1 : 0}`)
    .join(",")}`;
  const [syncedSignature, setSyncedSignature] = useState(serverSignature);
  if (serverSignature !== syncedSignature) {
    setSyncedSignature(serverSignature);
    setItems(initialItems);
    setUnread(initialUnread);
  }

  useEffect(() => {
    if (!supabaseConfigured) return;
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid || cancelled) return;

      // React Strict Mode remounts can leave a subscribed channel with the
      // same name; reusing it and calling .on() after subscribe() throws.
      for (const existing of supabase.getChannels()) {
        if (existing.topic.includes(`notifications:${uid}`)) {
          await supabase.removeChannel(existing);
        }
      }
      if (cancelled) return;

      const next = supabase.channel(
        `notifications:${uid}:${crypto.randomUUID()}`
      );
      next.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${uid}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            user_id: string;
            actor_id: string | null;
            type: AppNotification["type"];
            entity_id: string | null;
            link: string;
            read_at: string | null;
            created_at: string;
          };
          setItems((prev) => {
            if (prev.some((n) => n.id === row.id)) return prev;
            const nextItem: AppNotification = {
              ...row,
              actor_name: null,
              actor_avatar: null,
              context_label: null,
            };
            return [nextItem, ...prev].slice(0, 40);
          });
          setUnread((n) => n + 1);
        }
      );
      next.subscribe();
      if (cancelled) {
        await supabase.removeChannel(next);
        return;
      }
      channel = next;
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  function onOpen(n: AppNotification) {
    if (!n.read_at) {
      setItems((prev) =>
        prev.map((x) =>
          x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x
        )
      );
      setUnread((c) => Math.max(0, c - 1));
      startT(() => {
        void markNotificationRead(n.id);
      });
    }
  }

  function onMarkAll() {
    setItems((prev) =>
      prev.map((x) => ({
        ...x,
        read_at: x.read_at ?? new Date().toISOString(),
      }))
    );
    setUnread(0);
    startT(() => {
      void markAllNotificationsRead();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={t("title")}
        >
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute end-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.625rem] font-semibold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="p-0">{t("title")}</DropdownMenuLabel>
          {unread > 0 && (
            <button
              type="button"
              onClick={onMarkAll}
              className="text-xs font-medium text-cyan hover:underline"
            >
              {t("markAllRead")}
            </button>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-[22rem] overflow-y-auto py-1">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t("empty")}
            </p>
          ) : (
            items.slice(0, 8).map((n) => {
              const kind = isGroupNotification(n)
                ? groupNotifKind(n)
                : undefined;
              const Icon = typeIcon(n.type, isGroupNotification(n), kind);
              const name = n.actor_name || t("someone");
              const initial = name.trim().charAt(0).toUpperCase() || "?";
              return (
                <DropdownMenuItem
                  key={n.id}
                  asChild
                  className="cursor-pointer p-0"
                >
                  <Link
                    href={n.link}
                    onClick={() => onOpen(n)}
                    className={cn(
                      "flex w-full items-start gap-3 px-3 py-2.5",
                      !n.read_at && "bg-cyan/5"
                    )}
                  >
                    <Avatar className="size-9 shrink-0">
                      {n.actor_avatar && (
                        <AvatarImage src={n.actor_avatar} alt={name} />
                      )}
                      <AvatarFallback className="bg-secondary text-xs">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start gap-1.5 text-sm">
                        <Icon className="mt-0.5 size-3.5 shrink-0 text-cyan" />
                        <span className="leading-snug">
                          {notificationCopy(t, n)}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {relativeTime(n.created_at)}
                      </span>
                    </span>
                    {!n.read_at && (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-cyan" />
                    )}
                  </Link>
                </DropdownMenuItem>
              );
            })
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <DropdownMenuItem asChild className="justify-center rounded-none py-2.5">
          <Link href="/notifications" className="text-sm font-medium text-cyan">
            {t("seeAll")}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
