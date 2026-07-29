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
  radius: number;
  label: string;
};

export type RingDatum = { lat: number; lng: number };

type CountryFeature = {
  type: "Feature";
  properties: { name?: string };
  geometry: unknown;
};

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

  // Ocean sphere — the land polygons sit on top of this.
  const globeMaterial = useMemo(() => {
    return new THREE.MeshPhongMaterial({
      color: "#0a1120",
      emissive: "#07101f",
      emissiveIntensity: 0.6,
      shininess: 2,
    });
  }, []);

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
      atmosphereColor="#e1b12c"
      atmosphereAltitude={0.16}
      showGraticules
      onGlobeReady={onGlobeReady}
      /* Continents & country borders */
      polygonsData={countries}
      polygonAltitude={0.006}
      polygonCapColor={(d: object) => {
        const name = norm((d as CountryFeature).properties?.name);
        return highlight && name === highlight
          ? "rgba(225,177,44,0.35)"
          : "rgba(64,92,140,0.42)";
      }}
      polygonSideColor={() => "rgba(10,17,32,0.6)"}
      polygonStrokeColor={(d: object) => {
        const name = norm((d as CountryFeature).properties?.name);
        return highlight && name === highlight ? "#f2c84b" : "rgba(150,180,220,0.55)";
      }}
      polygonLabel={(d: object) =>
        `<div style="background:rgba(8,12,20,.85);border:1px solid rgba(255,255,255,.12);color:#e8ecf6;padding:4px 8px;border-radius:8px;font-size:12px;white-space:nowrap">${
          (d as CountryFeature).properties?.name ?? ""
        }</div>`
      }
      /* Community points */
      pointsData={points}
      pointLat="lat"
      pointLng="lng"
      pointColor="color"
      pointRadius="radius"
      pointAltitude={0.02}
      pointResolution={18}
      pointLabel="label"
      pointsMerge={false}
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
