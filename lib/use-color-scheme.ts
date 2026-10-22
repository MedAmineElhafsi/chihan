"use client";

import { useSyncExternalStore } from "react";

/**
 * The theme the page is actually showing, live.
 *
 * CSS keys off `data-theme` on <html> on its own; this exists for the few
 * things CSS cannot reach — the WebGL globe and the map tiles — so they change
 * with the page. It watches the attribute rather than the device setting,
 * because the member can pin a theme (lib/theme.ts). The server cannot know
 * the theme, so it renders light and the client corrects on hydration.
 */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

export type ColorScheme = "light" | "dark";

export function useColorScheme(): ColorScheme {
  return useSyncExternalStore(
    subscribe,
    () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"),
    () => "light"
  );
}
