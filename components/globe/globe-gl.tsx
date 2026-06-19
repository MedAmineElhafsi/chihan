"use client";

import { useMemo, type MutableRefObject } from "react";
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

export default function GlobeGL({
  globeRef,
  width,
  height,
  points,
  rings,
  onPointClick,
  onGlobeReady,
}: {
  globeRef: MutableRefObject<GlobeMethods | undefined>;
  width: number;
  height: number;
  points: GlobeDatum[];
  rings: RingDatum[];
  onPointClick: (id: string) => void;
  onGlobeReady?: () => void;
}) {
  // Stylized dark globe (no photo texture) that sits over the cosmic backdrop.
  const globeMaterial = useMemo(() => {
    return new THREE.MeshPhongMaterial({
      color: "#0b1326",
      emissive: "#0a1a33",
      emissiveIntensity: 0.5,
      shininess: 4,
    });
  }, []);

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
      pointsData={points}
      pointLat="lat"
      pointLng="lng"
      pointColor="color"
      pointRadius="radius"
      pointAltitude={0.012}
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
