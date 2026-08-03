"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Ban, BellOff, BellRing, Loader2 } from "lucide-react";

import {
  blockUser,
  muteUser,
  unblockUser,
  unmuteUser,
} from "@/lib/block-actions";
import { ReportButton } from "@/components/moderation/report-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SafetyActions({
  targetUserId,
  profileId,
  initiallyBlocked,
  initiallyMuted,
}: {
  targetUserId: string;
  profileId: string;
  initiallyBlocked: boolean;
  initiallyMuted: boolean;
}) {
  const t = useTranslations("Safety");
  const [blocked, setBlocked] = useState(initiallyBlocked);
  const [muted, setMuted] = useState(initiallyMuted || initiallyBlocked);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onBlock() {
    setError(null);
    const next = !blocked;
    setBlocked(next);
    if (next) setMuted(true);
    startTransition(async () => {
      const res = next
        ? await blockUser(targetUserId)
        : await unblockUser(targetUserId);
      if (!res.ok) {
        setBlocked(!next);
        setMuted(initiallyMuted || initiallyBlocked);
        setError(res.error);
      }
    });
  }

  function onMute() {
    if (blocked) return;
    setError(null);
    const next = !muted;
    setMuted(next);
    startTransition(async () => {
      const res = next
        ? await muteUser(targetUserId)
        : await unmuteUser(targetUserId);
      if (!res.ok) {
        setMuted(!next);
        setError(res.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "gap-1.5",
            muted && !blocked && "border-gold/40 text-gold"
          )}
          disabled={pending || blocked}
          onClick={onMute}
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : muted ? (
            <BellRing className="size-3.5" />
          ) : (
            <BellOff className="size-3.5" />
          )}
          {muted ? t("unmute") : t("mute")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "gap-1.5",
            blocked && "border-destructive/40 text-destructive"
          )}
          disabled={pending}
          onClick={onBlock}
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Ban className="size-3.5" />
          )}
          {blocked ? t("unblock") : t("block")}
        </Button>
        <ReportButton targetType="profile" targetId={profileId} />
      </div>
      {blocked && (
        <p className="text-xs text-muted-foreground">{t("blockedHint")}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
