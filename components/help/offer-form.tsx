"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { HandHeart, Loader2 } from "lucide-react";

import { Link, useRouter } from "@/i18n/navigation";
import { offerHelp } from "@/lib/help-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useVoiceRecorder } from "@/components/voice/use-voice-recorder";
import { VoiceField } from "@/components/voice/voice-recorder-ui";

export function OfferForm({
  requestId,
  isAuthenticated,
  userId,
  voiceEnabled = false,
  giving = false,
}: {
  requestId: string;
  isAuthenticated: boolean;
  userId?: string;
  /** Replying by voice is offered once migration 0028 has run. */
  voiceEnabled?: boolean;
  /** Answering a give: "I'd like it", not "I can help". */
  giving?: boolean;
}) {
  const t = useTranslations("Help");
  const router = useRouter();
  const recorder = useVoiceRecorder();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <div className="panel text-muted-foreground flex flex-wrap items-center justify-between gap-3 rounded-md p-4 text-sm">
        {t("signInToHelp")}
        <Button asChild size="sm">
          <Link href="/login">{t("signIn")}</Link>
        </Button>
      </div>
    );
  }

  const hasVoice = Boolean(recorder.result);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!body.trim() && !hasVoice) return;
    setLoading(true);
    const voice =
      recorder.result && userId ? await recorder.upload(userId) : null;
    if (recorder.result && !voice) {
      setLoading(false);
      return;
    }
    const res = await offerHelp(requestId, body, voice);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? t("errorGeneric"));
      return;
    }
    setBody("");
    recorder.reset();
    router.refresh();
  }

  return (
    <form
      onSubmit={submit}
      className="panel flex flex-col gap-3 rounded-md p-4"
    >
      <span className="label-mono">
        {giving ? t("claimLabel") : t("offerLabel")}
      </span>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={giving ? t("claimPlaceholder") : t("offerPlaceholder")}
        maxLength={1200}
      />
      {voiceEnabled && userId && (
        <VoiceField recorder={recorder} disabled={loading} />
      )}
      {error && <p className="text-destructive text-sm">{error}</p>}
      <div className="flex items-center justify-between gap-3">
        <p className="label-mono">{t("freeNote")}</p>
        <Button
          type="submit"
          disabled={
            loading ||
            recorder.status === "recording" ||
            (!body.trim() && !hasVoice)
          }
          className="gap-2"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <HandHeart className="size-4" />
          )}
          {giving ? t("claimCta") : t("offerCta")}
        </Button>
      </div>
    </form>
  );
}
