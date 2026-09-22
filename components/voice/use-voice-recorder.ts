"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  VOICE_BARS,
  VOICE_BUCKET,
  VOICE_MAX_MS,
  VOICE_MIN_MS,
  type VoiceInput,
} from "@/types/voice";
import { createClient } from "@/lib/supabase/client";

export type RecorderStatus =
  | "idle"
  | "requesting"
  | "recording"
  | "recorded"
  | "uploading";

/** Why the last attempt did not produce a note, for a sentence under it. */
export type RecorderProblem =
  | "denied"
  | "no-mic"
  | "unsupported"
  | "too-short"
  | "limit"
  | "upload"
  | null;

/**
 * Formats a browser can both record and play back elsewhere, best first.
 * AAC in MP4 plays on every phone; Opus in WebM is what Chrome, Edge and
 * Firefox record; Safari records MP4 whatever it is asked.
 */
const CANDIDATES = [
  "audio/mp4;codecs=mp4a.40.2",
  "audio/webm;codecs=opus",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/webm",
];

function pickMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const type of CANDIDATES) {
    if (MediaRecorder.isTypeSupported?.(type)) return type;
  }
  return "";
}

function extensionFor(type: string): { ext: string; contentType: string } {
  if (type.includes("mp4") || type.includes("aac")) {
    return { ext: "m4a", contentType: "audio/mp4" };
  }
  if (type.includes("ogg")) return { ext: "ogg", contentType: "audio/ogg" };
  return { ext: "webm", contentType: "audio/webm" };
}

/** Bars in the live meter: about a second and a half of speech. */
export const METER_BARS = 28;

/** Down to `bars` columns, each the loudest moment in its slice, 0–100. */
function toPeaks(levels: number[], bars: number): number[] {
  if (levels.length === 0) return Array.from({ length: bars }, () => 6);
  const out: number[] = [];
  for (let i = 0; i < bars; i++) {
    const from = Math.floor((i * levels.length) / bars);
    const to = Math.max(from + 1, Math.floor(((i + 1) * levels.length) / bars));
    let max = 0;
    for (let j = from; j < to && j < levels.length; j++) {
      max = Math.max(max, levels[j]);
    }
    out.push(max);
  }
  // Scale to the loudest bar, with a floor so a quiet room is not amplified
  // into a shout, and a square root so speech reads as speech, not spikes.
  const loudest = Math.max(0.04, ...out);
  return out.map((v) =>
    Math.round(Math.min(1, Math.max(0.06, Math.sqrt(v / loudest))) * 100)
  );
}

/**
 * Tap to start, tap to stop: holding a button down for a minute is hard for
 * an older hand and impossible for a screen reader, so recording is a toggle.
 * Nothing leaves the device until `upload` is called.
 */
export function useVoiceRecorder() {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [problem, setProblem] = useState<RecorderProblem>(null);
  const [elapsed, setElapsed] = useState(0);
  // The last couple of seconds of loudness, 0–1, for the live meter.
  const [recent, setRecent] = useState<number[]>([]);
  const [result, setResult] = useState<{
    blob: Blob;
    url: string;
    ms: number;
    peaks: number[];
    type: string;
  } | null>(null);

  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const context = useRef<AudioContext | null>(null);
  const frame = useRef<number | null>(null);
  const levels = useRef<number[]>([]);
  const startedAt = useRef(0);
  const keep = useRef(true);
  const hitLimit = useRef(false);
  // The preview's object URL, so leaving the page can free it.
  const previewUrl = useRef<string | null>(null);

  const release = useCallback(() => {
    if (frame.current != null) cancelAnimationFrame(frame.current);
    frame.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    void context.current?.close().catch(() => {});
    context.current = null;
    recorder.current = null;
    setRecent([]);
  }, []);

  const stop = useCallback(() => {
    const r = recorder.current;
    if (r && r.state !== "inactive") r.stop();
  }, []);

  const start = useCallback(async () => {
    setProblem(null);
    const mime = pickMime();
    if (mime === null || !navigator.mediaDevices?.getUserMedia) {
      setProblem("unsupported");
      return;
    }

    // Made inside the tap, before anything is awaited: Safari only lets an
    // audio context run if it was created in answer to a gesture.
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    const ctx = AudioCtx ? new AudioCtx() : null;
    context.current = ctx;

    setStatus("requesting");
    let media: MediaStream;
    try {
      media = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err) {
      void ctx?.close().catch(() => {});
      context.current = null;
      setStatus("idle");
      const name = err instanceof DOMException ? err.name : "";
      setProblem(
        name === "NotFoundError" || name === "OverconstrainedError"
          ? "no-mic"
          : "denied"
      );
      return;
    }
    stream.current = media;

    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(
        media,
        mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined
      );
    } catch {
      release();
      setStatus("idle");
      setProblem("unsupported");
      return;
    }
    recorder.current = rec;
    chunks.current = [];
    levels.current = [];
    keep.current = true;
    hitLimit.current = false;

    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };
    rec.onstop = () => {
      const ms = Math.min(
        VOICE_MAX_MS,
        Math.round(performance.now() - startedAt.current)
      );
      const type = rec.mimeType || mime || "audio/webm";
      const peaks = toPeaks(levels.current, VOICE_BARS);
      release();
      if (!keep.current) {
        setStatus("idle");
        return;
      }
      if (ms < VOICE_MIN_MS || chunks.current.length === 0) {
        setStatus("idle");
        setProblem("too-short");
        return;
      }
      const blob = new Blob(chunks.current, {
        type: extensionFor(type).contentType,
      });
      const url = URL.createObjectURL(blob);
      previewUrl.current = url;
      setResult({ blob, url, ms, peaks, type });
      setStatus("recorded");
      if (hitLimit.current) setProblem("limit");
    };

    // The level meter and the waveform come from the same measurements, so
    // what the person watched while speaking is what they see afterwards.
    if (ctx) {
      try {
        const source = ctx.createMediaStreamSource(media);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        source.connect(analyser);
        const buf = new Float32Array(analyser.fftSize);
        let lastSample = 0;
        let lastPaint = 0;
        const tick = (now: number) => {
          analyser.getFloatTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
          const rms = Math.sqrt(sum / buf.length);
          if (now - lastSample >= 50) {
            levels.current.push(rms);
            lastSample = now;
          }
          const t = now - startedAt.current;
          // Ten repaints a second reads as live; sixty only costs battery.
          if (now - lastPaint >= 100) {
            setRecent(
              levels.current.slice(-METER_BARS).map((v) => Math.min(1, v * 4))
            );
            setElapsed(t);
            lastPaint = now;
          }
          if (t >= VOICE_MAX_MS) {
            hitLimit.current = true;
            stop();
            return;
          }
          frame.current = requestAnimationFrame(tick);
        };
        frame.current = requestAnimationFrame(tick);
        void ctx.resume().catch(() => {});
      } catch {
        // No meter, but the recording itself still works.
      }
    }

    startedAt.current = performance.now();
    setElapsed(0);
    rec.start(250);
    setStatus("recording");

    // Without an audio context there is no frame loop to enforce the limit.
    if (!ctx) {
      const timer = window.setInterval(() => {
        const t = performance.now() - startedAt.current;
        setElapsed(t);
        if (t >= VOICE_MAX_MS || recorder.current !== rec) {
          window.clearInterval(timer);
          if (t >= VOICE_MAX_MS) {
            hitLimit.current = true;
            stop();
          }
        }
      }, 250);
    }
  }, [release, stop]);

  const discard = useCallback(() => {
    setProblem(null);
    if (recorder.current && recorder.current.state !== "inactive") {
      keep.current = false;
      recorder.current.stop();
      return;
    }
    setResult((r) => {
      if (r) URL.revokeObjectURL(r.url);
      return null;
    });
    setStatus("idle");
    setElapsed(0);
  }, []);

  /** Sends the recording to the member's own folder; null when it failed. */
  const upload = useCallback(
    async (userId: string): Promise<VoiceInput | null> => {
      if (!result) return null;
      setStatus("uploading");
      const { ext, contentType } = extensionFor(result.type);
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await createClient()
        .storage.from(VOICE_BUCKET)
        .upload(path, result.blob, {
          contentType,
          upsert: false,
          cacheControl: "31536000",
        });
      if (error) {
        setStatus("recorded");
        setProblem("upload");
        return null;
      }
      return { path, ms: result.ms, peaks: result.peaks };
    },
    [result]
  );

  /** After a successful send: forget the recording, ready for the next. */
  const reset = useCallback(() => {
    setResult((r) => {
      if (r) URL.revokeObjectURL(r.url);
      return null;
    });
    setStatus("idle");
    setProblem(null);
    setElapsed(0);
  }, []);

  useEffect(
    () => () => {
      keep.current = false;
      if (recorder.current && recorder.current.state !== "inactive") {
        recorder.current.stop();
      }
      release();
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    },
    [release]
  );

  return {
    status,
    problem,
    elapsed,
    recent,
    result,
    start,
    stop,
    discard,
    upload,
    reset,
  };
}

export type VoiceRecorder = ReturnType<typeof useVoiceRecorder>;
