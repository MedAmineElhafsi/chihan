"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, Pause, Play, UserPlus, X } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import {
  endBuddy,
  leaveBuddies,
  requestBuddy,
  respondBuddy,
  setBuddyActive,
} from "@/lib/buddy-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** A newcomer asks one buddy, with a few words about themselves. */
export function AskBuddyButton({
  mentorId,
  name,
}: {
  mentorId: string;
  name: string;
}) {
  const t = useTranslations("Buddies");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    const res = await requestBuddy(mentorId, message);
    setLoading(false);
    if (!res.ok) {
      setError(t(`error_${res.error}` as never));
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <UserPlus className="size-4" aria-hidden="true" />
        {t("ask")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("askTitle", { name })}</DialogTitle>
            <DialogDescription>{t("askBody")}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("askPlaceholder")}
            maxLength={500}
            dir="auto"
          />
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              onClick={() => void submit()}
              disabled={loading}
              className="gap-2"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {t("askSend")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** The buddy's answer to a request. */
export function RespondButtons({ pairId }: { pairId: string }) {
  const t = useTranslations("Buddies");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const act = (accept: boolean) =>
    start(async () => {
      const res = await respondBuddy(pairId, accept);
      if (!res.ok) setError(t(`error_${res.error}` as never));
      router.refresh();
    });

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => act(true)}
          disabled={pending}
          className="gap-1.5"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" aria-hidden="true" />
          )}
          {t("accept")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => act(false)}
          disabled={pending}
          className="text-muted-foreground gap-1.5"
        >
          <X className="size-4" aria-hidden="true" />
          {t("decline")}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  );
}

const REASONS = ["done", "no_contact", "uncomfortable", "other"] as const;

/** Ending, from either side, with the uncomfortable case handled kindly. */
export function EndBuddyButton({ pairId }: { pairId: string }) {
  const t = useTranslations("Buddies");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("done");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    await endBuddy(pairId, reason);
    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setOpen(true)}
        className="text-muted-foreground"
      >
        {t("end")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("endTitle")}</DialogTitle>
            <DialogDescription>{t("endBody")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={reason === r}
                onClick={() => setReason(r)}
                className={cn(
                  "rounded-md border px-3 py-2 text-start text-sm transition-colors",
                  reason === r
                    ? "border-cyan bg-cyan/10 text-air"
                    : "border-border text-muted-foreground hover:text-air"
                )}
              >
                {t(`reason_${r}` as never)}
              </button>
            ))}
            {reason === "uncomfortable" && (
              <p className="text-muted-foreground text-sm">{t("reportHint")}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => void submit()}
              disabled={loading}
              className="gap-2"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {t("endConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Pause, resume, or leave the programme. */
export function EntryControls({ active }: { active: boolean }) {
  const t = useTranslations("Buddies");
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await setBuddyActive(!active);
            router.refresh();
          })
        }
        className="gap-1.5"
      >
        {active ? (
          <Pause className="size-3.5" aria-hidden="true" />
        ) : (
          <Play className="size-3.5" aria-hidden="true" />
        )}
        {t(active ? "pause" : "resume")}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(t("leaveConfirm"))) return;
          start(async () => {
            await leaveBuddies();
            router.refresh();
          });
        }}
        className="text-muted-foreground"
      >
        {t("leave")}
      </Button>
    </div>
  );
}
