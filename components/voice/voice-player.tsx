"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Pause, Play } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  VOICE_BARS,
  VOICE_BUCKET,
  formatVoiceTime,
  type VoiceNote,
} from "@/types/voice";

/** Starting one note pauses any other, as it would on a phone. */
const PLAY_EVENT = "cihan:voice-play";

const TONES = {
  // Inside the sender's own bubble, which is filled with the accent colour.
  mine: {
    button:
      "bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25",
    played: "bg-primary-foreground",
    rest: "bg-primary-foreground/35",
    time: "text-primary-foreground/80",
  },
  // On a card or panel.
  plain: {
    button: "bg-cyan/15 text-cyan hover:bg-cyan/25",
    played: "bg-cyan",
    rest: "bg-muted-foreground/40",
    time: "text-muted-foreground",
  },
} as const;

export function VoicePlayer({
  note,
  tone = "plain",
  className,
}: {
  note: VoiceNote;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  const t = useTranslations("Voice");
  const id = useId();
  const audio = useRef<HTMLAudioElement>(null);
  const frame = useRef<number | null>(null);
  const retried = useRef(false);

  const [src, setSrc] = useState<string | null>(note.url ?? null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [failed, setFailed] = useState(false);

  const total = Math.max(1, note.ms);
  const progress = Math.min(1, position / total);
  const peaks =
    note.peaks && note.peaks.length > 0
      ? note.peaks
      : Array.from({ length: VOICE_BARS }, () => 30);
  const style = TONES[tone];

  // A link made by the server can be missing (a note that arrived live) or
  // stale (a tab left open all afternoon). Either way, ask for a fresh one.
  const sign = useCallback(async () => {
    if (!note.path) return null;
    const { data } = await createClient()
      .storage.from(VOICE_BUCKET)
      .createSignedUrl(note.path, 60 * 60);
    return data?.signedUrl ?? null;
  }, [note.path]);

  useEffect(() => {
    if (src || !note.path) return;
    let cancelled = false;
    void sign().then((url) => {
      if (cancelled) return;
      if (url) setSrc(url);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [src, note.path, sign]);

  useEffect(() => {
    const onOther = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== id) audio.current?.pause();
    };
    window.addEventListener(PLAY_EVENT, onOther);
    return () => window.removeEventListener(PLAY_EVENT, onOther);
  }, [id]);

  // Follow the playhead while playing. The time and the bars move together.
  useEffect(() => {
    if (!playing) return;
    let last = 0;
    const tick = (now: number) => {
      if (now - last >= 50 && audio.current) {
        setPosition(audio.current.currentTime * 1000);
        last = now;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current != null) cancelAnimationFrame(frame.current);
    };
  }, [playing]);

  async function toggle() {
    const el = audio.current;
    if (!el || !src) return;
    if (!el.paused) {
      el.pause();
      return;
    }
    window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: id }));
    setLoading(true);
    try {
      await el.play();
    } catch {
      // Refused by the browser (autoplay rules) or unplayable; onError
      // below handles the second.
    } finally {
      setLoading(false);
    }
  }

  function seekTo(ms: number) {
    const clamped = Math.max(0, Math.min(total, ms));
    setPosition(clamped);
    if (audio.current) audio.current.currentTime = clamped / 1000;
  }

  function onPointer(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    seekTo(((e.clientX - rect.left) / rect.width) * total);
  }

  function onKey(e: React.KeyboardEvent<HTMLDivElement>) {
    const step = 5000;
    const next =
      e.key === "ArrowRight" || e.key === "ArrowUp"
        ? position + step
        : e.key === "ArrowLeft" || e.key === "ArrowDown"
          ? position - step
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? total
              : null;
    if (next == null) return;
    e.preventDefault();
    seekTo(next);
  }

  async function onError() {
    // One retry with a fresh link covers an expired one; a second failure
    // means this browser cannot play the format.
    if (!retried.current && note.path) {
      retried.current = true;
      const url = await sign();
      if (url) {
        setSrc(url);
        return;
      }
    }
    setPlaying(false);
    setFailed(true);
  }

  const shown = playing || position > 0 ? position : total;

  return (
    <div
      // Time runs left to right in every language, like a tape.
      dir="ltr"
      className={cn("flex min-w-0 items-center gap-2.5", className)}
    >
      <button
        type="button"
        onClick={toggle}
        disabled={!src || failed}
        aria-label={
          playing ? t("pause") : t("play", { time: formatVoiceTime(total) })
        }
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-50",
          style.button
        )}
      >
        {loading || (!src && !failed) ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : playing ? (
          <Pause className="size-4 fill-current" aria-hidden="true" />
        ) : (
          <Play
            className="size-4 translate-x-px fill-current"
            aria-hidden="true"
          />
        )}
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div
          role="slider"
          tabIndex={src && !failed ? 0 : -1}
          aria-label={t("seek")}
          aria-valuemin={0}
          aria-valuemax={Math.round(total / 1000)}
          aria-valuenow={Math.round(position / 1000)}
          aria-valuetext={t("position", {
            current: formatVoiceTime(position),
            total: formatVoiceTime(total),
          })}
          onPointerDown={src && !failed ? onPointer : undefined}
          onKeyDown={onKey}
          className="focus-visible:ring-ring/60 flex h-7 w-40 cursor-pointer touch-none items-center gap-[2px] rounded-sm outline-none focus-visible:ring-2 sm:w-48"
        >
          {peaks.map((p, i) => (
            <span
              key={i}
              aria-hidden="true"
              style={{ height: `${Math.max(14, p)}%` }}
              className={cn(
                "min-w-[2px] flex-1 rounded-full",
                (i + 0.5) / peaks.length <= progress ? style.played : style.rest
              )}
            />
          ))}
        </div>
        {failed ? (
          <span className={cn("text-[0.6875rem] leading-none", style.time)}>
            {t("cantPlay")}
            {src && (
              <>
                {" "}
                <a href={src} download className="underline underline-offset-2">
                  {t("download")}
                </a>
              </>
            )}
          </span>
        ) : (
          <span
            className={cn(
              "font-mono text-[0.6875rem] leading-none tabular-nums",
              style.time
            )}
          >
            {formatVoiceTime(shown)}
          </span>
        )}
      </div>

      {src && (
        <audio
          ref={audio}
          src={src}
          preload={src.startsWith("blob:") ? "auto" : "none"}
          onPlay={() => setPlaying(true)}
          onPause={() => {
            setPlaying(false);
            if (audio.current) setPosition(audio.current.currentTime * 1000);
          }}
          onEnded={() => {
            setPlaying(false);
            setPosition(0);
          }}
          onError={onError}
          className="hidden"
        />
      )}
    </div>
  );
}
