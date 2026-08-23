"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Volume2, VolumeX } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReportButton } from "@/components/moderation/report-button";
import type { FeedItem } from "@/types/post";

/**
 * One reel per screen, snapped. Only the reel actually on screen is allowed to
 * play, and it starts muted — autoplay with sound is blocked by every mobile
 * browser anyway, and it is rude besides.
 */
export function ReelPlayer({ reels }: { reels: FeedItem[] }) {
  const t = useTranslations("Reels");
  const [muted, setMuted] = useState(true);

  if (reels.length === 0) {
    return (
      <p className="text-muted-foreground p-8 text-center text-sm">
        {t("empty")}
      </p>
    );
  }

  return (
    <div className="bg-depth-0 h-[calc(100dvh-8.5rem)] snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-xl lg:h-[calc(100dvh-6rem)]">
      {reels.map((reel) => (
        <Reel
          key={reel.id}
          reel={reel}
          muted={muted}
          onToggleMute={() => setMuted((m) => !m)}
        />
      ))}
    </div>
  );
}

function Reel({
  reel,
  muted,
  onToggleMute,
}: {
  reel: FeedItem;
  muted: boolean;
  onToggleMute: () => void;
}) {
  const t = useTranslations("Reels");
  const ref = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.intersectionRatio > 0.6),
      { threshold: [0, 0.6, 1] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (visible) {
      // A rejected play() is normal — the browser may refuse until the reader
      // has interacted with the page. Nothing to recover from.
      void el.play().catch(() => {});
    } else {
      el.pause();
      el.currentTime = 0;
    }
  }, [visible]);

  const video = reel.media[0];
  const who = reel.author.displayName ?? t("someone");

  return (
    <section className="relative flex h-full snap-start snap-always items-center justify-center">
      <video
        ref={ref}
        src={video}
        poster={reel.poster_url ?? undefined}
        muted={muted}
        loop
        playsInline
        preload="none"
        className="h-full w-full object-contain"
        onClick={onToggleMute}
      />

      <button
        onClick={onToggleMute}
        aria-label={muted ? t("unmute") : t("mute")}
        className="bg-depth-0/70 text-air hover:text-cyan absolute end-3 top-3 rounded-full p-2 backdrop-blur transition-colors"
      >
        {muted ? (
          <VolumeX className="size-4" />
        ) : (
          <Volume2 className="size-4" />
        )}
      </button>

      <div className="from-depth-0 via-depth-0/70 absolute inset-x-0 bottom-0 flex items-end gap-3 bg-gradient-to-t to-transparent p-4 pb-6">
        <Link
          href={`/u/${reel.author.profileId ?? ""}`}
          className="flex min-w-0 flex-1 items-center gap-2.5"
        >
          <Avatar className="ring-cyan/40 size-8 ring-1">
            {reel.author.avatarUrl && (
              <AvatarImage src={reel.author.avatarUrl} alt="" />
            )}
            <AvatarFallback className="text-xs">
              {who.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="text-air truncate text-sm font-medium">{who}</div>
            {reel.body && (
              <p className="text-air/80 line-clamp-2 text-xs">{reel.body}</p>
            )}
          </div>
        </Link>
        <ReportButton targetType="post" targetId={reel.id} />
      </div>
    </section>
  );
}
