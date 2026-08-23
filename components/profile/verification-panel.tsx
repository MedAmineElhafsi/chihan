"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { BadgeCheck, Clock, Loader2, ShieldX, Upload } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import {
  requestVerification,
  withdrawVerification,
} from "@/lib/verification-actions";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Status = "pending" | "approved" | "rejected";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/**
 * Applying for the badge. The document goes to a private bucket only the
 * applicant and an administrator can read — it is somebody's ID, not a photo.
 */
export function VerificationPanel({
  userId,
  isVerified,
  request,
}: {
  userId: string;
  isVerified: boolean;
  request: { id: string; status: Status; decision_note: string | null } | null;
}) {
  const t = useTranslations("Verification");
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isVerified) {
    return (
      <Panel>
        <Row icon={<BadgeCheck className="size-4" />} tone="good">
          <strong className="text-air">{t("verifiedTitle")}</strong>
          <span className="text-muted-foreground">{t("verifiedBody")}</span>
        </Row>
      </Panel>
    );
  }

  if (request?.status === "pending") {
    return (
      <Panel>
        <Row icon={<Clock className="size-4" />}>
          <strong className="text-air">{t("pendingTitle")}</strong>
          <span className="text-muted-foreground">{t("pendingBody")}</span>
        </Row>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          className="self-start"
          onClick={async () => {
            setBusy(true);
            await withdrawVerification(request.id);
            setBusy(false);
            router.refresh();
          }}
        >
          {busy && <Loader2 className="size-3.5 animate-spin" />}
          {t("withdraw")}
        </Button>
      </Panel>
    );
  }

  async function submit() {
    const file = fileRef.current?.files?.[0];
    if (!file) return setError(t("errorNoFile"));
    if (!ACCEPTED.includes(file.type)) return setError(t("errorType"));
    if (file.size > MAX_BYTES) return setError(t("errorSize"));

    setBusy(true);
    setError(null);

    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const path = `${userId}/${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("verification-docs")
      .upload(path, file, { upsert: false });

    if (upErr) {
      setBusy(false);
      return setError(t("errorUpload"));
    }

    const res = await requestVerification(path, note);
    setBusy(false);
    if (!res.ok) {
      return setError(
        res.error === "already_pending" ? t("errorPending") : t("errorGeneric")
      );
    }
    router.refresh();
  }

  return (
    <Panel>
      <Row icon={<BadgeCheck className="size-4" />}>
        <strong className="text-air">{t("title")}</strong>
        <span className="text-muted-foreground">{t("body")}</span>
      </Row>

      {request?.status === "rejected" && (
        <p className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <ShieldX className="mt-0.5 size-4 shrink-0 text-destructive" />
          <span>
            {t("rejected")}
            {request.decision_note && (
              <span className="mt-1 block text-muted-foreground">
                {request.decision_note}
              </span>
            )}
          </span>
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="block w-full text-sm text-muted-foreground file:me-3 file:rounded-sm file:border file:border-border file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:text-foreground"
      />
      <p className="text-xs text-muted-foreground">{t("fileHint")}</p>

      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t("notePlaceholder")}
        rows={2}
        maxLength={500}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button onClick={submit} disabled={busy} size="sm" className="gap-2 self-start">
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Upload className="size-3.5" />
        )}
        {t("submit")}
      </Button>

      <p className="text-xs text-muted-foreground">{t("privacyNote")}</p>
    </Panel>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="panel flex flex-col gap-3 rounded-2xl p-5">{children}</div>
  );
}

function Row({
  icon,
  tone,
  children,
}: {
  icon: React.ReactNode;
  tone?: "good";
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={
          tone === "good"
            ? "inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-cyan/15 text-cyan ring-1 ring-cyan/40"
            : "inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-cyan ring-1 ring-border"
        }
      >
        {icon}
      </div>
      <div className="flex flex-col gap-1 text-sm leading-relaxed">{children}</div>
    </div>
  );
}
