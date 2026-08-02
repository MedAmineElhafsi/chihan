"use client";

import { useEffect, useMemo, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import Globe, { type GlobeMethods } from "react-globe.gl";

export type GlobeDatum = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  color: string;
  icon: string;
  radius: number;
  selected: boolean;
  dimmed: boolean;
  subtitle: string;
  /** People only — realtime presence. Listings stay undefined. */
  online?: boolean;
  kind?: "person" | "listing";
};

export type RingDatum = { lat: number; lng: number };

type CountryFeature = {
  type: "Feature";
  properties: { name?: string };
  geometry: unknown;
};

/**
 * Above this many visible points we fall back to lightweight 3D dots instead of
 * DOM pins — the brief (§7) calls out not rendering thousands of DOM nodes.
 */
const HTML_MARKER_LIMIT = 300;

export default function GlobeGL({
  globeRef,
  width,
  height,
  points,
  rings,
  onPointClick,
  onGlobeReady,
  highlightCountry,
}: {
  globeRef: MutableRefObject<GlobeMethods | undefined>;
  width: number;
  height: number;
  points: GlobeDatum[];
  rings: RingDatum[];
  onPointClick: (id: string) => void;
  onGlobeReady?: () => void;
  highlightCountry?: string | null;
}) {
  const [countries, setCountries] = useState<CountryFeature[]>([]);

  // Land + country borders, lazy-loaded so they never block first paint.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ feature }, topo] = await Promise.all([
        import("topojson-client"),
        import("world-atlas/countries-110m.json"),
      ]);
      if (cancelled) return;
      const topology = (topo.default ?? topo) as unknown as Parameters<
        typeof feature
      >[0];
      const fc = feature(
        topology,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (topology as any).objects.countries
      ) as unknown as { features: CountryFeature[] };
      setCountries(fc.features);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Ocean sphere — land polygons sit on top.
  const globeMaterial = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: "#0d2b52",
        emissive: "#06182f",
        emissiveIntensity: 0.55,
        shininess: 6,
      }),
    []
  );

  const norm = (s?: string) => (s ?? "").toLowerCase();
  const highlight = norm(highlightCountry ?? undefined);
  const useHtmlMarkers = points.length <= HTML_MARKER_LIMIT;

  return (
    <Globe
      ref={globeRef}
      width={width}
      height={height}
      backgroundColor="rgba(0,0,0,0)"
      animateIn={false}
      globeMaterial={globeMaterial}
      showAtmosphere
      atmosphereColor="#7dd3fc"
      atmosphereAltitude={0.18}
      showGraticules
      onGlobeReady={onGlobeReady}
      /* Continents & country borders */
      polygonsData={countries}
      polygonAltitude={0.008}
      polygonCapColor={(d: object) => {
        const name = norm((d as CountryFeature).properties?.name);
        return highlight && name === highlight
          ? "rgba(225,177,44,0.55)"
          : "rgba(34,122,102,0.62)";
      }}
      polygonSideColor={() => "rgba(8,24,44,0.75)"}
      polygonStrokeColor={(d: object) => {
        const name = norm((d as CountryFeature).properties?.name);
        return highlight && name === highlight
          ? "#f2c84b"
          : "rgba(190,220,210,0.5)";
      }}
      polygonLabel={(d: object) =>
        `<div style="background:rgba(8,12,20,.88);border:1px solid rgba(255,255,255,.14);color:#e8ecf6;padding:4px 8px;border-radius:8px;font-size:12px;white-space:nowrap">${
          (d as CountryFeature).properties?.name ?? ""
        }</div>`
      }
      /* Icon pins — crisp, always face the camera, never z-fight */
      htmlElementsData={useHtmlMarkers ? points : []}
      htmlLat="lat"
      htmlLng="lng"
      htmlAltitude={0.02}
      htmlTransitionDuration={250}
      htmlElementVisibilityModifier={(el: HTMLElement, isVisible: boolean) => {
        el.style.opacity = isVisible ? "1" : "0";
        el.style.pointerEvents = isVisible ? "auto" : "none";
      }}
      htmlElement={(obj: object) => {
        const d = obj as GlobeDatum;
        const size = d.selected ? 30 : 22;
        const el = document.createElement("div");
        const status =
          d.kind === "person"
            ? d.online
              ? " · Online"
              : " · Offline"
            : "";
        el.title = `${d.name}${d.subtitle ? ` · ${d.subtitle}` : ""}${status}`;
        el.style.cssText = [
          "position:relative",
          "display:flex",
          "align-items:center",
          "justify-content:center",
          `width:${size}px`,
          `height:${size}px`,
          "border-radius:9999px",
          `background:${d.color}`,
          `border:2px solid ${d.selected ? "#ffffff" : "rgba(255,255,255,.75)"}`,
          `box-shadow:0 0 0 2px rgba(6,12,22,.55), 0 3px 10px rgba(0,0,0,.5)${
            d.selected
              ? `, 0 0 16px ${d.color}`
              : d.online
                ? ", 0 0 10px rgba(16,185,129,.85)"
                : ""
          }`,
          `font-size:${d.selected ? 15 : 11}px`,
          "line-height:1",
          "cursor:pointer",
          `opacity:${d.dimmed ? 0.28 : 1}`,
          "transition:opacity .2s, width .2s, height .2s",
          "user-select:none",
        ].join(";");
        el.textContent = d.icon;

        // Presence pip for people (green = online, muted = offline).
        if (d.kind === "person") {
          const pip = document.createElement("span");
          const pipSize = d.selected ? 9 : 7;
          pip.style.cssText = [
            "position:absolute",
            "top:-1px",
            "right:-1px",
            `width:${pipSize}px`,
            `height:${pipSize}px`,
            "border-radius:9999px",
            `background:${d.online ? "#10b981" : "rgba(148,163,184,.7)"}`,
            "border:1.5px solid rgba(6,12,22,.9)",
            d.online ? "box-shadow:0 0 6px rgba(16,185,129,.9)" : "",
          ]
            .filter(Boolean)
            .join(";");
          el.appendChild(pip);
        }

        el.onclick = () => onPointClick(d.id);
        return el;
      }}
      /* Fallback for very large datasets */
      pointsData={useHtmlMarkers ? [] : points}
      pointLat="lat"
      pointLng="lng"
      pointColor="color"
      pointRadius="radius"
      pointAltitude={0.02}
      pointResolution={12}
      pointLabel="name"
      onPointClick={(d: object) => onPointClick((d as GlobeDatum).id)}
      ringsData={rings}
      ringLat="lat"
      ringLng="lng"
      ringColor={() => "#f2c84b"}
      ringMaxRadius={4}
      ringPropagationSpeed={1.4}
      ringRepeatPeriod={900}
    />
  );
}
