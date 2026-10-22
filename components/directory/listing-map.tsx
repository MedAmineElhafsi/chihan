"use client";

import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

import { useColorScheme } from "@/lib/use-color-scheme";

/**
 * The basemap.
 *
 * This was CARTO's `dark_all` raster, which was key-less for years and quietly
 * stopped being so — every tile now arrives stamped "API KEY REQUIRED", on
 * every listing that has coordinates.
 *
 * OpenFreeMap serves OpenStreetMap data as vector tiles with no key, no
 * registration and no request limit, and it hosts its own fonts and sprites,
 * so nothing here depends on a second service. If its public instance ever
 * becomes a problem, the same tiles can be self-hosted — that is the point of
 * it. The style's attribution travels with the tiles, so the control below
 * credits OpenStreetMap without us restating it.
 *
 * Two of its styles, one per theme: Positron is a pale, quiet map that sits
 * on the cream page; Dark matches the dusk theme.
 */
const STYLES = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;

export function ListingMap({ lat, lng }: { lat: number; lng: number }) {
  const container = useRef<HTMLDivElement>(null);
  const scheme = useColorScheme();

  useEffect(() => {
    if (!container.current) return;
    let map: import("maplibre-gl").Map | undefined;
    let cancelled = false;

    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !container.current) return;
      map = new maplibregl.Map({
        container: container.current,
        style: STYLES[scheme],
        center: [lng, lat],
        zoom: 12,
        attributionControl: false,
      });
      map.addControl(
        new maplibregl.AttributionControl({ compact: true }),
        "bottom-right"
      );
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right"
      );
      new maplibregl.Marker({ color: "#d89a2b" })
        .setLngLat([lng, lat])
        .addTo(map);
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [lat, lng, scheme]);

  return (
    <div
      ref={container}
      className="h-72 w-full overflow-hidden rounded-xl border border-border"
    />
  );
}
