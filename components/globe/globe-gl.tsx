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
  kind?: "person" | "listing" | "event";
};

export type RingDatum = { lat: number; lng: number };

type CountryFeature = {
  type: "Feature";
  properties: { name?: string };
  geometry: unknown;
};

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"]/g,
    (c) =>
      (({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }) as Record<
        string,
        string
      >)[c]
  );
}

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
      /* Signal nodes.
         Small, low-profile discs rather than fat spheres: at city scale several
         entries share almost identical coordinates, and large markers turned
         into overlapping multi-coloured blobs. Radius scales only on selection,
         and the results panel + legend carry identification. */
      pointsData={points}
      pointLat="lat"
      pointLng="lng"
      pointColor={(d: object) => {
        const p = d as GlobeDatum;
        if (p.dimmed) return "rgba(120,150,160,0.35)";
        return p.color;
      }}
      pointRadius={(d: object) => ((d as GlobeDatum).selected ? 0.55 : 0.2)}
      pointAltitude={(d: object) => ((d as GlobeDatum).selected ? 0.05 : 0.014)}
      pointResolution={14}
      pointsMerge={false}
      pointLabel={(d: object) => {
        const p = d as GlobeDatum;
        const status =
          p.kind === "person" ? (p.online ? " · Online" : "") : "";
        return `<div style="background:rgba(0,22,25,.92);border:1px solid rgba(80,232,244,.35);color:#c7f8fe;padding:5px 9px;border-radius:4px;font-size:12px;font-family:ui-monospace,monospace;white-space:nowrap;box-shadow:0 0 18px -4px rgba(80,232,244,.6)">
          <span style="color:${p.color}">${p.icon}</span> ${escapeHtml(p.name)}${
            p.subtitle ? ` · ${escapeHtml(p.subtitle)}` : ""
          }${status}
        </div>`;
      }}
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
