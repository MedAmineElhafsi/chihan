"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import {
  ChevronLeft,
  Crosshair,
  MapPin,
  Stethoscope,
  Store,
  UserRound,
  Users,
} from "lucide-react";
import type { GlobeMethods } from "react-globe.gl";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { GlobePoint } from "@/lib/globe";

const GlobeGL = dynamic(() => import("./globe-gl"), {
  ssr: false,
  loading: () => null,
});

function esc(s: string) {
  return s.replace(
    /[&<>"]/g,
    (c) =>
      (({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }) as Record<
        string,
        string
      >)[c]
  );
}

export function ExploreClient({ points }: { points: GlobePoint[] }) {
  const t = useTranslations("Explore");
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Measure the globe container.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () =>
      setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const countries = useMemo(() => {
    const map = new Map<
      string,
      { country: string; count: number; lat: number; lng: number }
    >();
    for (const p of points) {
      const key = p.country || "—";
      const e = map.get(key) ?? { country: key, count: 0, lat: 0, lng: 0 };
      e.count += 1;
      e.lat += p.lat;
      e.lng += p.lng;
      map.set(key, e);
    }
    return [...map.values()]
      .map((e) => ({ ...e, lat: e.lat / e.count, lng: e.lng / e.count }))
      .sort((a, b) => b.count - a.count);
  }, [points]);

  const selectedPerson = useMemo(
    () => points.find((p) => p.id === selectedId) ?? null,
    [points, selectedId]
  );
  const countryPeople = useMemo(
    () =>
      selectedCountry
        ? points.filter((p) => (p.country || "—") === selectedCountry)
        : [],
    [points, selectedCountry]
  );

  const globeData = useMemo(
    () =>
      points.map((p) => {
        const dimmed =
          selectedCountry != null && (p.country || "—") !== selectedCountry;
        return {
          id: p.id,
          name: p.name,
          lat: p.lat,
          lng: p.lng,
          color:
            p.id === selectedId ? "#ffffff" : dimmed ? "#7c6420" : "#e1b12c",
          radius: p.id === selectedId ? 0.95 : 0.5,
          label: `<div style="background:rgba(8,12,20,.85);border:1px solid rgba(255,255,255,.12);color:#e8ecf6;padding:4px 8px;border-radius:8px;font-size:12px;white-space:nowrap">${esc(
            p.name
          )}${p.city ? ` · ${esc(p.city)}` : ""}</div>`,
        };
      }),
    [points, selectedId, selectedCountry]
  );

  const rings = useMemo(
    () =>
      selectedPerson
        ? [{ lat: selectedPerson.lat, lng: selectedPerson.lng }]
        : [],
    [selectedPerson]
  );

  function flyTo(lat: number, lng: number, altitude = 1.6) {
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls() as { autoRotate?: boolean } | undefined;
    if (controls) controls.autoRotate = false;
    g.pointOfView({ lat, lng, altitude }, 1200);
  }

  function handleReady() {
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls() as {
      autoRotate?: boolean;
      autoRotateSpeed?: number;
    };
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.45;
    g.pointOfView({ lat: 42, lng: 24, altitude: 2.5 }, 0);
  }

  function selectCountry(country: string) {
    setSelectedCountry(country);
    setSelectedId(null);
    const c = countries.find((x) => x.country === country);
    if (c) flyTo(c.lat, c.lng, 1.8);
  }

  function selectPerson(id: string) {
    const p = points.find((x) => x.id === id);
    if (!p) return;
    setSelectedId(id);
    setSelectedCountry(p.country || "—");
    flyTo(p.lat, p.lng, 1.1);
  }

  function recenter() {
    setSelectedCountry(null);
    setSelectedId(null);
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls() as { autoRotate?: boolean };
    if (controls) controls.autoRotate = true;
    g.pointOfView({ lat: 42, lng: 24, altitude: 2.5 }, 1000);
  }

  const layers = [
    { key: "people", label: t("people"), icon: Users, active: true },
    { key: "restaurants", label: t("restaurants"), icon: Store, active: false },
    { key: "doctors", label: t("doctors"), icon: Stethoscope, active: false },
  ];

  return (
    <div className="relative h-[calc(100dvh-4rem)] w-full overflow-hidden">
      {/* Globe */}
      <div ref={containerRef} className="absolute inset-0">
        {size.w > 0 && (
          <GlobeGL
            globeRef={globeRef as MutableRefObject<GlobeMethods | undefined>}
            width={size.w}
            height={size.h}
            points={globeData}
            rings={rings}
            onPointClick={selectPerson}
            onGlobeReady={handleReady}
          />
        )}
      </div>

      {/* Center reticle */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <svg width="46" height="46" viewBox="0 0 46 46" className="opacity-70">
          <circle
            cx="23"
            cy="23"
            r="13"
            fill="none"
            stroke="#f2c84b"
            strokeWidth="1.5"
          />
          <line x1="23" y1="4" x2="23" y2="14" stroke="#f2c84b" strokeWidth="1.5" />
          <line x1="23" y1="32" x2="23" y2="42" stroke="#f2c84b" strokeWidth="1.5" />
          <line x1="4" y1="23" x2="14" y2="23" stroke="#f2c84b" strokeWidth="1.5" />
          <line x1="32" y1="23" x2="42" y2="23" stroke="#f2c84b" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Recenter */}
      <Button
        variant="outline"
        size="icon"
        onClick={recenter}
        aria-label={t("recenter")}
        className="glass absolute end-4 top-4 z-10"
      >
        <Crosshair className="size-5" />
      </Button>

      {/* Results panel */}
      <div className="glass-strong absolute inset-x-4 bottom-4 z-10 flex max-h-[55dvh] flex-col overflow-hidden rounded-2xl md:inset-x-auto md:bottom-auto md:start-4 md:top-4 md:max-h-[calc(100%-2rem)] md:w-[360px]">
        <div className="flex flex-col gap-3 border-b border-border/60 p-4">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-lg font-semibold">{t("title")}</h1>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {t("memberCount", { count: points.length })}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {layers.map(({ key, label, icon: Icon, active }) => (
              <span
                key={key}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                  active
                    ? "border-gold/50 bg-gold/15 text-gold"
                    : "border-border bg-card/40 text-muted-foreground"
                )}
              >
                <Icon className="size-3.5" />
                {label}
                {!active && (
                  <span className="rounded-full bg-secondary px-1.5 text-[0.6rem] uppercase">
                    {t("soon")}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {points.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <MapPin className="size-7 text-gold" />
              <p className="text-sm text-muted-foreground">{t("empty")}</p>
              <Button asChild size="sm" className="mt-1">
                <Link href="/onboarding">{t("emptyCta")}</Link>
              </Button>
            </div>
          ) : selectedPerson ? (
            <PersonDetail
              person={selectedPerson}
              backLabel={t("backToCountry", {
                country: selectedPerson.country || "—",
              })}
              onBack={() => setSelectedId(null)}
              viewLabel={t("viewProfile")}
            />
          ) : selectedCountry ? (
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setSelectedCountry(null)}
                className="mb-1 inline-flex items-center gap-1 self-start rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronLeft className="size-4" />
                {t("allCountries")}
              </button>
              <div className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {selectedCountry} · {t("memberCount", { count: countryPeople.length })}
              </div>
              {countryPeople.map((p) => (
                <PersonRow
                  key={p.id}
                  person={p}
                  onClick={() => selectPerson(p.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("countries")}
              </div>
              {countries.map((c) => (
                <button
                  key={c.country}
                  onClick={() => selectCountry(c.country)}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-start transition-colors hover:bg-accent"
                >
                  <span className="flex items-center gap-2.5 font-medium">
                    <MapPin className="size-4 text-gold" />
                    {c.country}
                  </span>
                  <span className="text-sm text-muted-foreground">{c.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PersonRow({
  person,
  onClick,
}: {
  person: GlobePoint;
  onClick: () => void;
}) {
  const initial = person.name.trim().charAt(0).toUpperCase() || "?";
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-start transition-colors hover:bg-accent"
    >
      <Avatar className="size-9">
        {person.avatarUrl && <AvatarImage src={person.avatarUrl} alt={person.name} />}
        <AvatarFallback className="bg-gradient-to-br from-gold to-kurd-red text-xs text-primary-foreground">
          {initial}
        </AvatarFallback>
      </Avatar>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium">{person.name}</span>
        {person.city && (
          <span className="truncate text-xs text-muted-foreground">
            {person.city}
          </span>
        )}
      </span>
    </button>
  );
}

function PersonDetail({
  person,
  backLabel,
  onBack,
  viewLabel,
}: {
  person: GlobePoint;
  backLabel: string;
  onBack: () => void;
  viewLabel: string;
}) {
  const initial = person.name.trim().charAt(0).toUpperCase() || "?";
  const place = [person.city, person.country].filter(Boolean).join(", ");
  return (
    <div className="flex flex-col gap-4 p-2">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 self-start rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {backLabel}
      </button>
      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          {person.avatarUrl && <AvatarImage src={person.avatarUrl} alt={person.name} />}
          <AvatarFallback className="bg-gradient-to-br from-gold to-kurd-red text-xl text-primary-foreground">
            {initial}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate font-display text-lg font-semibold">
            {person.name}
          </div>
          {place && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5 text-gold" />
              {place}
            </div>
          )}
        </div>
      </div>
      <Button asChild className="gap-2">
        <Link href={`/u/${person.id}`}>
          <UserRound className="size-4" />
          {viewLabel}
        </Link>
      </Button>
    </div>
  );
}
