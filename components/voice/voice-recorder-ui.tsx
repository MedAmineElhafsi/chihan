"use client";

import { useTranslations } from "next-intl";
import { Loader2, Mic, Square, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VOICE_MAX_MS, formatVoiceTime } from "@/types/voice";
import {
  METER_BARS,
  type RecorderProblem,
  type VoiceRecorder,
} from "./use-voice-recorder";
import { VoicePlayer } from "./voice-player";

const PROBLEM_KEY = {
  denied: "denied",
  "no-mic": "noMic",
  unsupported: "unsupported",
  "too-short": "tooShort",
  limit: "limit",
  upload: "upload",
} as const;

/** One sentence saying why there is no voice note, or nothing. */
export function VoiceProblem({
  problem,
  className,
}: {
  problem: RecorderProblem;
  className?: string;
}) {
  const t = useTranslations("Voice");
  if (!problem) return null;
  return (
    <p
      role={problem === "limit" ? "status" : "alert"}
      className={cn(
        "text-sm",
        problem === "limit" ? "text-muted-foreground" : "text-destructive",
        className
      )}
    >
      {t(PROBLEM_KEY[problem])}
    </p>
  );
}

/**
 * While recording: a steady red dot, the time so far, and the last second
 * and a half of loudness — so the person can see it is hearing them before
 * they have said very much.
 */
export function RecordingStrip({
  recorder,
  className,
}: {
  recorder: VoiceRecorder;
  className?: string;
}) {
  const t = useTranslations("Voice");
  const bars = Array.from(
    { length: METER_BARS },
    (_, i) => recorder.recent[recorder.recent.length - METER_BARS + i] ?? 0
  );
  return (
    <div
      dir="ltr"
      className={cn("flex min-w-0 flex-1 items-center gap-2.5", className)}
    >
      <span
        aria-hidden="true"
        className="bg-destructive size-2.5 shrink-0 rounded-full motion-safe:animate-pulse"
      />
      <span className="sr-only">{t("recording")}</span>
      <span className="text-foreground font-mono text-sm tabular-nums">
        {formatVoiceTime(recorder.elapsed)}
      </span>
      <span
        aria-hidden="true"
        className="flex h-6 min-w-0 flex-1 items-center gap-[2px] overflow-hidden"
      >
        {bars.map((v, i) => (
          <span
            key={i}
            style={{ height: `${Math.max(12, Math.round(v * 100))}%` }}
            className="bg-destructive/70 min-w-[2px] flex-1 rounded-full"
          />
        ))}
      </span>
      <span className="text-muted-foreground hidden font-mono text-xs tabular-nums sm:inline">
        {formatVoiceTime(VOICE_MAX_MS)}
      </span>
    </div>
  );
}

/**
 * A voice note as a form field: for the help composer and replies, where it
 * rides along with the text and is sent when the form is.
 */
export function VoiceField({
  recorder,
  disabled,
}: {
  recorder: VoiceRecorder;
  disabled?: boolean;
}) {
  const t = useTranslations("Voice");
  const { status, result } = recorder;

  return (
    <div className="flex flex-col gap-2">
      {status === "recording" ? (
        <div className="border-destructive/40 bg-destructive/5 flex items-center gap-2 rounded-md border p-2 ps-3">
          <RecordingStrip recorder={recorder} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={recorder.discard}
            aria-label={t("cancel")}
            className="text-muted-foreground shrink-0"
          >
            <X className="size-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={recorder.stop}
            className="shrink-0 gap-1.5"
          >
            <Square className="size-3.5 fill-current" aria-hidden="true" />
            {t("stop")}
          </Button>
        </div>
      ) : result && (status === "recorded" || status === "uploading") ? (
        <div className="border-border bg-card/40 flex items-center gap-2 rounded-md border p-2 ps-2.5">
          <VoicePlayer
            note={{
              path: "",
              ms: result.ms,
              peaks: result.peaks,
              url: result.url,
            }}
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={recorder.discard}
            disabled={disabled || status === "uploading"}
            aria-label={t("discard")}
            className="text-muted-foreground shrink-0"
          >
            {status === "uploading" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void recorder.start()}
            disabled={disabled || status === "requesting"}
            className="gap-1.5"
          >
            {status === "requesting" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Mic className="size-4" aria-hidden="true" />
            )}
            {status === "requesting" ? t("requesting") : t("record")}
          </Button>
          <span className="text-muted-foreground text-xs">{t("hint")}</span>
        </div>
      )}
      <VoiceProblem problem={recorder.problem} />
    </div>
  );
}
