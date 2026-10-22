"use client";

import { useEffect, useMemo, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import Globe, { type GlobeMethods } from "react-globe.gl";

import { useColorScheme } from "@/lib/use-color-scheme";

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

/**
 * WebGL cannot read CSS variables, so the globe carries its own copy of the
 * two themes. Keep these in step with the tokens in app/globals.css.
 */
const GLOBE_THEME = {
  light: {
    // NASA Blue Marble, graded warm (public/globe, made from three-globe's
    // bundled example images — no third-party request at runtime).
    image: "/globe/earth-day.webp",
    atmosphere: "#c39572",
    highlight: "rgba(242,166,90,0.35)",
    highlightEdge: "#f6efe4",
    dimmed: "rgba(241,233,224,0.45)",
    ring: "#83390f",
    tooltip:
      "background:rgba(241,235,225,.97);border:1px solid rgba(42,36,32,.14);color:#26201c;box-shadow:0 10px 28px -14px rgba(74,48,24,.35)",
  },
  dark: {
    // The same Earth at night: city lights, pushed toward sodium orange.
    image: "/globe/earth-night.webp",
    atmosphere: "#b8704a",
    highlight: "rgba(242,166,90,0.3)",
    highlightEdge: "#f2a65a",
    dimmed: "rgba(179,168,158,0.4)",
    ring: "#f2a65a",
    tooltip:
      "background:rgba(29,26,38,.95);border:1px solid rgba(242,166,90,.3);color:#fff6ec;box-shadow:0 10px 28px -12px rgba(0,0,0,.6)",
  },
} as const;

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

  const t = GLOBE_THEME[useColorScheme()];

  // A matte material for the satellite picture: no shine, so the texture
  // reads as the Earth rather than a glossy ball. The library puts the image
  // and the relief map onto it.
  const globeMaterial = useMemo(
    () => new THREE.MeshPhongMaterial({ shininess: 0, bumpScale: 4 }),
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
      globeImageUrl={t.image}
      bumpImageUrl="/globe/earth-relief.webp"
      showAtmosphere
      atmosphereColor={t.atmosphere}
      atmosphereAltitude={0.16}
      onGlobeReady={onGlobeReady}
      /* The picture is the land; countries are drawn invisibly on top so
         hovering still names one and a selected country can light up. Only
         the selected one gets a fill and an edge. */
      polygonsData={countries}
      polygonAltitude={0.005}
      polygonCapColor={(d: object) => {
        const name = norm((d as CountryFeature).properties?.name);
        return highlight && name === highlight ? t.highlight : "rgba(0,0,0,0)";
      }}
      polygonSideColor={() => "rgba(0,0,0,0)"}
      polygonStrokeColor={(d: object) => {
        const name = norm((d as CountryFeature).properties?.name);
        return highlight && name === highlight ? t.highlightEdge : false;
      }}
      polygonLabel={(d: object) =>
        `<div style="${t.tooltip};padding:4px 8px;border-radius:10px;font-size:12px;white-space:nowrap">${
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
        if (p.dimmed) return t.dimmed;
        return p.color;
      }}
      pointRadius={(d: object) => ((d as GlobeDatum).selected ? 0.7 : 0.34)}
      pointAltitude={(d: object) => ((d as GlobeDatum).selected ? 0.06 : 0.02)}
      pointResolution={16}
      pointsMerge={false}
      pointLabel={(d: object) => {
        const p = d as GlobeDatum;
        const status =
          p.kind === "person" ? (p.online ? " · Online" : "") : "";
        return `<div style="${t.tooltip};padding:5px 10px;border-radius:10px;font-size:12px;white-space:nowrap">
          <span style="color:${p.color}">${p.icon}</span> ${escapeHtml(p.name)}${
            p.subtitle ? ` · ${escapeHtml(p.subtitle)}` : ""
          }${status}
        </div>`;
      }}
      onPointClick={(d: object) => onPointClick((d as GlobeDatum).id)}
      ringsData={rings}
      ringLat="lat"
      ringLng="lng"
      ringColor={() => t.ring}
      ringMaxRadius={5}
      ringPropagationSpeed={1.6}
      ringRepeatPeriod={800}
      ringAltitude={0.021}
    />
  );
}
