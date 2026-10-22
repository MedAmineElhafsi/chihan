"use client";

import { useState, useSyncExternalStore } from "react";

import { useColorScheme } from "@/lib/use-color-scheme";

/**
 * The sign-in / sign-up panel's film: Newroz over the mountains, rendered
 * with Remotion (`remotion/AuthLoop.tsx`, compositions AuthDawn / AuthDusk —
 * `npm run video:auth` re-renders both).
 *
 * The poster for the current theme is painted by CSS (`--auth-poster`), so
 * the panel is right on first paint with no flash. Once mounted, the
 * matching loop fades in over it. Under reduced motion the poster stays and
 * no video is fetched at all.
 */
const REDUCED = "(prefers-reduced-motion: reduce)";

function subscribeReduced(onChange: () => void) {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function AuthMotion() {
  const scheme = useColorScheme();
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED).matches,
    () => true
  );
  const film = scheme === "dark" ? "dusk" : "dawn";
  // Which film has started playing. A theme switch loads the other one,
  // which is not playing yet, so it fades in afresh.
  const [playing, setPlaying] = useState<string | null>(null);
  const ready = playing === film;

  return (
    <div aria-hidden="true" className="auth-poster absolute inset-0">
      {!reduced && (
        <video
          key={film}
          className="size-full object-cover transition-opacity duration-700 ease-out"
          style={{ opacity: ready ? 1 : 0 }}
          src={`/video/auth-${film}.mp4`}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onPlaying={() => setPlaying(film)}
        />
      )}
    </div>
  );
}
