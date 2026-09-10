"use client";

import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
} from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

import type { AuthorStories } from "@/types/story";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const STORY_MS = 5000;

export function StoryViewer({
  group,
  open,
  onClose,
}: {
  group: AuthorStories | null;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("Stories");
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const stories = group?.stories ?? [];
  const current = stories[index] ?? null;
  const name = group?.author.displayName?.trim() || t("member");
  const initial = name.charAt(0).toUpperCase() || "?";

  // A plain callback, not useEffectEvent: this is also called from the "next"
  // click handler, and Effect Events may only be called from Effects.
  const advance = useCallback(() => {
    if (index >= stories.length - 1) {
      onClose();
      return;
    }
    setIndex((i) => i + 1);
    setProgress(0);
  }, [index, stories.length, onClose]);

  // Restart from the first story whenever the viewer opens or switches author.
  // Adjusting state during render is React's supported pattern for this;
  // doing it in an effect triggers a cascading re-render.
  const resetKey = `${open ? 1 : 0}:${group?.author.userId ?? ""}`;
  const [syncedResetKey, setSyncedResetKey] = useState(resetKey);
  if (resetKey !== syncedResetKey) {
    setSyncedResetKey(resetKey);
    setIndex(0);
    setProgress(0);
  }

  useEffect(() => {
    if (!open || !current) return;
    const start = Date.now();
    const tick = window.setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / STORY_MS);
      setProgress(p);
      if (p >= 1) advance();
    }, 50);
    return () => window.clearInterval(tick);
  }, [open, current, advance]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") advance();
      if (e.key === "ArrowLeft") {
        setIndex((i) => Math.max(0, i - 1));
        setProgress(0);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, advance]);

  if (!open || !group || !current) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("viewerLabel", { name })}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={t("close")}
        onClick={onClose}
      />

      <div className="animate-story-in relative z-10 flex h-dvh w-full max-w-md flex-col overflow-hidden bg-black shadow-elev-3 sm:h-auto sm:max-h-[90dvh] sm:rounded-lg sm:ring-1 sm:ring-white/10">
        <div className="absolute inset-x-0 top-0 z-20 flex gap-1 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          {stories.map((s, i) => (
            <div
              key={s.id}
              className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30"
            >
              <div
                className="h-full rounded-full bg-white transition-[width] duration-75 ease-linear"
                style={
                  {
                    width:
                      i < index
                        ? "100%"
                        : i === index
                          ? `${progress * 100}%`
                          : "0%",
                  } as CSSProperties
                }
              />
            </div>
          ))}
        </div>

        <div className="absolute inset-x-0 top-3 z-20 flex items-center gap-2.5 px-4 pt-4">
          <Avatar className="size-9 ring-2 ring-white/70">
            {group.author.avatarUrl && (
              <AvatarImage src={group.author.avatarUrl} alt={name} />
            )}
            <AvatarFallback className="bg-secondary text-xs">
              {initial}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white drop-shadow-elev-2">
            {name}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-black/45 p-2 text-white backdrop-blur-sm hover:bg-black/65"
            aria-label={t("close")}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="relative min-h-0 flex-1 bg-black sm:aspect-[9/16] sm:max-h-[85dvh] sm:flex-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.media_url}
            alt=""
            className="size-full object-contain"
          />
          <button
            type="button"
            className="absolute inset-y-0 start-0 w-[28%]"
            aria-label={t("prev")}
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => Math.max(0, i - 1));
              setProgress(0);
            }}
          />
          <button
            type="button"
            className="absolute inset-y-0 end-0 w-[28%]"
            aria-label={t("next")}
            onClick={(e) => {
              e.stopPropagation();
              advance();
            }}
          />
          {current.caption && (
            <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-5 pb-8 pt-16 text-center text-sm leading-relaxed text-white">
              {current.caption}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
