"use client";

import { useEffect } from "react";

import { recordListingEvent } from "@/lib/business-actions";

/**
 * Counting what a listing's page does for its owner.
 *
 * One number per day and per kind — a visit, a tap on call, WhatsApp, the
 * website, directions or share. Nothing identifies the visitor, the owner's
 * own visits are not counted, and a failure is silent: nobody's evening is
 * interrupted because a counter did not increment.
 *
 * Taps are read from `data-stat` attributes on the links themselves, so the
 * markup stays ordinary anchors that work without JavaScript.
 */
export function ListingTracker({ listingId }: { listingId: string }) {
  useEffect(() => {
    // One visit per listing per browser session, not one per re-render.
    const key = `cihan:seen:${listingId}`;
    try {
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        void recordListingEvent(listingId, "view");
      }
    } catch {
      void recordListingEvent(listingId, "view");
    }

    function onClick(e: MouseEvent) {
      const el = (e.target as HTMLElement | null)?.closest?.("[data-stat]");
      const kind = el?.getAttribute("data-stat");
      if (kind) void recordListingEvent(listingId, kind);
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [listingId]);

  return null;
}
