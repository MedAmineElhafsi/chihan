"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BadgeCheck, ExternalLink, Loader2, ShieldX } from "lucide-react";

import { decideVerification } from "@/lib/verification-actions";
import { useRouter } from "@/i18n/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { VerificationRequest } from "@/lib/verification";

/**
 * The queue that makes the badge mean something. If this goes unread, the
 * badge tells people "we checked" when nobody did — worse than no badge.
 */
export function VerificationQueue({
  requests,
  documentUrls,
}: {
  requests: VerificationRequest[];
  /** Short-lived signed links, keyed by request id. */
  documentUrls: Record<string, string | null>;
}) {
  const t = useTranslations("Admin");

  if (requests.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("verifyEmpty")}</p>;
  }

  return (
    <ul className="flex flex-col gap-px overflow-hidden rounded-xl border border-border bg-border">
      {requests.map((r) => (
        <QueueRow key={r.id} request={r} documentUrl={documentUrls[r.id] ?? null} />
      ))}
    </ul>
  );
}

function QueueRow({
  request,
  documentUrl,
}: {
  request: VerificationRequest;
  documentUrl: string | null;
}) {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(approve ? "approve" : "reject");
    setError(null);
    const res = await decideVerification(request.id, approve, note);
    setBusy(null);
    if (!res.ok) return setError(t("verifyFailed"));
    router.refresh();
  }

  const who = request.display_name ?? request.user_id.slice(0, 8);
  const place = [request.city, request.country].filter(Boolean).join(", ");

  return (
    <li className="flex flex-col gap-3 bg-card p-4">
      <div className="flex items-center gap-3">
        <Avatar className="size-9">
          {request.avatar_url && <AvatarImage src={request.avatar_url} alt="" />}
          <AvatarFallback>{who.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-air">{who}</div>
          <div className="truncate text-xs text-muted-foreground">
            {[request.profession, place].filter(Boolean).join(" · ") || "—"}
          </div>
        </div>
        {documentUrl ? (
          <a
            href={documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-[0.12em] transition-colors hover:border-cyan/50 hover:text-cyan"
          >
            <ExternalLink className="size-3" />
            {t("verifyOpenDoc")}
          </a>
        ) : (
          <span className="label-mono text-destructive">{t("verifyNoDoc")}</span>
        )}
      </div>

      {request.note && (
        <p className="rounded-md bg-secondary/50 p-3 text-sm leading-relaxed">
          {request.note}
        </p>
      )}

      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t("verifyNotePlaceholder")}
        maxLength={500}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button size="sm" disabled={busy !== null} onClick={() => decide(true)} className="gap-1.5">
          {busy === "approve" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <BadgeCheck className="size-3.5" />
          )}
          {t("verifyApprove")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy !== null}
          onClick={() => decide(false)}
          className="gap-1.5"
        >
          {busy === "reject" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <ShieldX className="size-3.5" />
          )}
          {t("verifyReject")}
        </Button>
      </div>
    </li>
  );
}
