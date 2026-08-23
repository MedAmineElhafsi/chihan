"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Video, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { createReel } from "@/lib/reel-actions";
import { useRouter } from "@/i18n/navigation";
import { REEL_ACCEPT, REEL_MAX_BYTES, REEL_MAX_SECONDS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Picked = {
  file: File;
  url: string;
  duration: number;
  poster: Blob | null;
};

/**
 * Reading the video and cutting a still frame both happen here, in the
 * browser. A server that had to open the file would need ffmpeg and somewhere
 * to run it; a canvas needs neither.
 */
async function inspect(file: File): Promise<Picked> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.playsInline = true;
  video.src = url;

  const duration = await new Promise<number>((resolve, reject) => {
    video.onloadedmetadata = () => resolve(video.duration);
    video.onerror = () => reject(new Error("unreadable"));
  });

  // A frame a little way in: the very first frame of a phone recording is
  // often black.
  let poster: Blob | null = null;
  try {
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      video.currentTime = Math.min(0.5, duration / 4);
    });
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    poster = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.72)
    );
  } catch {
    // A missing poster is survivable — the player falls back to the video.
  }

  return { file, url, duration, poster };
}

export function ReelComposer({ userId }: { userId: string }) {
  const t = useTranslations("Reels");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(file: File | undefined) {
    if (!file) return;
    setError(null);

    if (!(REEL_ACCEPT as readonly string[]).includes(file.type)) {
      return setError(t("errorType"));
    }
    if (file.size > REEL_MAX_BYTES) {
      return setError(
        t("errorSize", { mb: Math.round(REEL_MAX_BYTES / 1024 / 1024) })
      );
    }

    try {
      const p = await inspect(file);
      if (p.duration > REEL_MAX_SECONDS) {
        URL.revokeObjectURL(p.url);
        return setError(t("errorLength", { seconds: REEL_MAX_SECONDS }));
      }
      setPicked(p);
    } catch {
      setError(t("errorUnreadable"));
    }
  }

  function clear() {
    if (picked) URL.revokeObjectURL(picked.url);
    setPicked(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function publish() {
    if (!picked) return;
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const stamp = Date.now();
    const ext = picked.file.name.split(".").pop()?.toLowerCase() ?? "mp4";
    const videoPath = `${userId}/reels/${stamp}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("post-media")
      .upload(videoPath, picked.file, { contentType: picked.file.type });

    if (upErr) {
      setBusy(false);
      return setError(t("errorUpload"));
    }

    const videoUrl = supabase.storage.from("post-media").getPublicUrl(videoPath)
      .data.publicUrl;

    let posterUrl: string | null = null;
    if (picked.poster) {
      const posterPath = `${userId}/reels/${stamp}.jpg`;
      const { error: pErr } = await supabase.storage
        .from("post-media")
        .upload(posterPath, picked.poster, { contentType: "image/jpeg" });
      if (!pErr) {
        posterUrl = supabase.storage.from("post-media").getPublicUrl(posterPath)
          .data.publicUrl;
      }
    }

    const res = await createReel({
      videoUrl,
      posterUrl,
      caption,
      durationSeconds: Math.round(picked.duration),
    });
    setBusy(false);

    if (!res.ok) return setError(t("errorSave"));
    clear();
    setCaption("");
    router.refresh();
  }

  return (
    <div className="panel flex flex-col gap-3 rounded-2xl p-4">
      {!picked ? (
        <>
          <label className="border-border hover:border-cyan/50 flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center transition-colors">
            <Video className="text-cyan size-6" />
            <span className="text-air text-sm font-medium">{t("pick")}</span>
            <span className="text-muted-foreground text-xs">
              {t("limits", {
                seconds: REEL_MAX_SECONDS,
                mb: Math.round(REEL_MAX_BYTES / 1024 / 1024),
              })}
            </span>
            <input
              ref={inputRef}
              type="file"
              accept={REEL_ACCEPT.join(",")}
              className="hidden"
              onChange={(e) => choose(e.target.files?.[0])}
            />
          </label>
          {error && <p className="text-destructive text-xs">{error}</p>}
        </>
      ) : (
        <>
          <div className="bg-depth-0 relative mx-auto w-full max-w-[240px] overflow-hidden rounded-xl">
            <video
              src={picked.url}
              controls
              playsInline
              className="aspect-[9/16] w-full object-cover"
            />
            <button
              onClick={clear}
              aria-label={t("remove")}
              className="bg-depth-0/80 text-air hover:text-cyan absolute end-2 top-2 rounded-full p-1.5 backdrop-blur transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          <p className="text-muted-foreground text-center font-mono text-[0.65rem] tracking-[0.12em] uppercase">
            {t("duration", { seconds: Math.round(picked.duration) })}
          </p>

          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={t("captionPlaceholder")}
            rows={2}
            maxLength={500}
          />

          {error && <p className="text-destructive text-xs">{error}</p>}

          <Button
            onClick={publish}
            disabled={busy}
            className="gap-2 self-start"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {t("publish")}
          </Button>
        </>
      )}
    </div>
  );
}
