"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { checkInTicket } from "@/lib/ticket-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * The door. One code, typed or read off a phone, and an answer big enough
 * to see at arm's length in the dark.
 */
export function CheckInBox() {
  const t = useTranslations("Tickets");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<{
    ok: boolean;
    reason: string;
    quantity: number;
  } | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    start(async () => {
      const res = await checkInTicket(code);
      setResult(res);
      if (res.ok) setCode("");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="CIH-XXXX-XXXX"
          aria-label={t("checkInLabel")}
          className="w-52 font-mono tracking-wider"
          dir="ltr"
        />
        <Button type="submit" disabled={pending || !code.trim()}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {t("checkIn")}
        </Button>
      </form>

      {result && (
        <div
          role="status"
          className={
            result.ok
              ? "text-success inline-flex items-center gap-2 text-sm font-medium"
              : "text-destructive inline-flex items-center gap-2 text-sm font-medium"
          }
        >
          {result.ok ? (
            <CheckCircle2 className="size-5 shrink-0" />
          ) : (
            <XCircle className="size-5 shrink-0" />
          )}
          {result.ok
            ? t("checkInOk", { count: result.quantity })
            : t(`checkIn_${result.reason}` as never)}
        </div>
      )}
    </div>
  );
}
