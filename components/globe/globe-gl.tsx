"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import * as THREE from "three";
import Globe, { type GlobeMethods } from "react-globe.gl";

import { useColorScheme } from "@/lib/use-color-scheme";
import { pinGlyph } from "./pin-glyphs";

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
  /** Profession (people) or category (listings): picks the pin's icon. */
  category?: string;
};

/**
 * One glass pin. The library positions the outer element by its centre; the
 * pin inside is lifted by half its height so its tip, not its middle, sits
 * on the coordinate.
 */
function pinElement(p: GlobeDatum, onClick: (id: string) => void) {
  const wrap = document.createElement("div");
  wrap.className = "globe-pin-anchor";

  const pin = document.createElement("button");
  pin.type = "button";
  pin.className = "globe-pin";
  pin.style.setProperty("--pin", p.color);
  if (p.selected) pin.dataset.selected = "";
  if (p.dimmed) pin.dataset.dimmed = "";
  pin.setAttribute(
    "aria-label",
    p.subtitle ? `${p.name}, ${p.subtitle}` : p.name
  );
  pin.innerHTML = `<span class="globe-pin-head">${pinGlyph(p.kind, p.category)}${
    p.online ? '<span class="globe-pin-online"></span>' : ""
  }</span><span class="globe-pin-tip"></span><span class="globe-pin-label">${escapeHtml(
    p.name
  )}${p.subtitle ? `<span> · ${escapeHtml(p.subtitle)}</span>` : ""}</span>`;
  // The globe's drag controls capture the pointer on pointerdown, after which
  // the click never lands on the pin. A pin is for tapping, not dragging.
  pin.addEventListener("pointerdown", (e) => e.stopPropagation());
  pin.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick(p.id);
  });

  wrap.appendChild(pin);
  return wrap;
}

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

  // Pins are built once per datum, outside React, so they call through a ref
  // that always holds the latest handler.
  const clickRef = useRef(onPointClick);
  useEffect(() => {
    clickRef.current = onPointClick;
  }, [onPointClick]);

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
      /* Glass pins: HTML elements the library keeps on their coordinates,
         styled in globals.css (.globe-pin). Pins on the far side of the
         planet fade out rather than showing through it. */
      htmlElementsData={points}
      htmlLat="lat"
      htmlLng="lng"
      htmlAltitude={0.005}
      htmlTransitionDuration={0}
      htmlElement={(d: object) => pinElement(d as GlobeDatum, (id) => clickRef.current(id))}
      htmlElementVisibilityModifier={(el: HTMLElement, visible: boolean) => {
        el.toggleAttribute("data-far", !visible);
      }}
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
