"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { unblockUser } from "@/lib/block-actions";
import type { BlockedUser } from "@/types/safety";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function BlockedList({ initial }: { initial: BlockedUser[] }) {
  const t = useTranslations("Safety");
  const [items, setItems] = useState(initial);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function onUnblock(userId: string) {
    setPendingId(userId);
    startTransition(async () => {
      const res = await unblockUser(userId);
      setPendingId(null);
      if (res.ok) {
        setItems((prev) => prev.filter((x) => x.userId !== userId));
      }
    });
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("blockedEmpty")}</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((u) => {
        const name = u.displayName ?? t("unknownUser");
        const initial = name.trim().charAt(0).toUpperCase() || "?";
        return (
          <li
            key={u.userId}
            className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/30 px-3 py-2.5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="size-9">
                {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt={name} />}
                <AvatarFallback className="bg-gradient-to-br from-cyan to-depth-4 text-sm text-primary-foreground">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                {u.profileId ? (
                  <Link
                    href={`/u/${u.profileId}`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {name}
                  </Link>
                ) : (
                  <span className="truncate text-sm font-medium">{name}</span>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pendingId === u.userId}
              onClick={() => onUnblock(u.userId)}
              className="gap-1.5"
            >
              {pendingId === u.userId && (
                <Loader2 className="size-3.5 animate-spin" />
              )}
              {t("unblock")}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
