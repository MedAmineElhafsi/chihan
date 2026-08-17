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
  CalendarDays,
  ChevronLeft,
  Crosshair,
  Globe2,
  MapPin,
  Stethoscope,
  UserRound,
  Users,
  Utensils,
} from "lucide-react";
import type { GlobeMethods } from "react-globe.gl";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CategoryIcon } from "@/components/directory/category-icon";
import { CATEGORY_COLORS, pointStyle } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useOnlineProfiles } from "@/lib/use-online";
import type { GlobePoint } from "@/lib/globe";

const GlobeGL = dynamic(() => import("./globe-gl"), {
  ssr: false,
  loading: () => null,
});

type Layer = "all" | "people" | "restaurants" | "doctors" | "events";

export function ExploreClient({ points }: { points: GlobePoint[] }) {
  const t = useTranslations("Explore");
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const [layer, setLayer] = useState<Layer>("all");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const online = useOnlineProfiles();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const filtered = useMemo(
    () =>
      points.filter((p) => {
        if (layer === "people") return p.kind === "person";
        if (layer === "restaurants") return p.category === "restaurant";
        if (layer === "doctors") return p.category === "doctor";
        if (layer === "events") return p.kind === "event";
        return true;
      }),
    [points, layer]
  );

  const countries = useMemo(() => {
    const map = new Map<
      string,
      { country: string; count: number; lat: number; lng: number }
    >();
    for (const p of filtered) {
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
  }, [filtered]);

  const selectedItem = useMemo(
    () => filtered.find((p) => p.id === selectedId) ?? null,
    [filtered, selectedId]
  );
  const countryItems = useMemo(
    () =>
      selectedCountry
        ? filtered.filter((p) => (p.country || "—") === selectedCountry)
        : [],
    [filtered, selectedCountry]
  );

  const globeData = useMemo(
    () =>
      filtered.map((p) => {
        const style = pointStyle(p.kind, p.kind === "person" ? p.profession : p.category);
        return {
          id: p.id,
          name: p.name,
          lat: p.lat,
          lng: p.lng,
          color: style.color,
          icon: style.icon,
          radius: p.id === selectedId ? 0.9 : 0.45,
          selected: p.id === selectedId,
          dimmed:
            selectedCountry != null && (p.country || "—") !== selectedCountry,
          subtitle: p.city ?? "",
          kind: p.kind,
          online: p.kind === "person" ? online.has(p.id) : undefined,
        };
      }),
    [filtered, selectedId, selectedCountry, online]
  );

  /** Colour key for whatever is currently on screen. */
  const legend = useMemo(() => {
    const seen = new Map<string, { color: string; icon: string; label: string }>();
    for (const p of filtered) {
      const key =
        p.kind === "person"
          ? p.profession || "other"
          : p.kind === "event"
            ? "event"
            : p.category;
      const id = `${p.kind}:${key}`;
      if (seen.has(id)) continue;
      const style = pointStyle(p.kind, key);
      seen.set(id, {
        color: style.color,
        icon: style.icon,
        label:
          p.kind === "person"
            ? t(`prof_${key}` as never)
            : p.kind === "event"
              ? t("events")
              : t(`cat_${p.category}` as never),
      });
    }
    return [...seen.values()];
  }, [filtered, t]);

  const rings = useMemo(
    () =>
      selectedItem ? [{ lat: selectedItem.lat, lng: selectedItem.lng }] : [],
    [selectedItem]
  );

  /** Hand control to the user the moment they touch the globe. */
  function stopAutoRotate() {
    const controls = globeRef.current?.controls() as
      | { autoRotate?: boolean }
      | undefined;
    if (controls) controls.autoRotate = false;
  }

  function flyTo(lat: number, lng: number, altitude = 1.6) {
    const g = globeRef.current;
    if (!g) return;
    stopAutoRotate();
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

  function selectItem(id: string) {
    const p = filtered.find((x) => x.id === id);
    if (!p) return;
    setSelectedId(id);
    setSelectedCountry(p.country || "—");
    flyTo(p.lat, p.lng, 1.1);
  }

  function changeLayer(next: Layer) {
    setLayer(next);
    setSelectedCountry(null);
    setSelectedId(null);
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

  const layers: { key: Layer; label: string; icon: typeof Users }[] = [
    { key: "all", label: t("all"), icon: Globe2 },
    { key: "people", label: t("people"), icon: Users },
    { key: "restaurants", label: t("restaurants"), icon: Utensils },
    { key: "doctors", label: t("doctors"), icon: Stethoscope },
    { key: "events", label: t("events"), icon: CalendarDays },
  ];

  return (
    <div className="relative h-[calc(100dvh-4rem)] w-full overflow-hidden">
      <div
        ref={containerRef}
        className="absolute inset-0"
        onPointerDown={stopAutoRotate}
        onWheel={stopAutoRotate}
      >
        {size.w > 0 && (
          <GlobeGL
            globeRef={globeRef as MutableRefObject<GlobeMethods | undefined>}
            width={size.w}
            height={size.h}
            points={globeData}
            rings={rings}
            onPointClick={selectItem}
            onGlobeReady={handleReady}
            highlightCountry={selectedCountry}
          />
        )}
      </div>

      {/* Center reticle */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <svg width="46" height="46" viewBox="0 0 46 46" className="opacity-70">
          <circle cx="23" cy="23" r="13" fill="none" stroke="#f2c84b" strokeWidth="1.5" />
          <line x1="23" y1="4" x2="23" y2="14" stroke="#f2c84b" strokeWidth="1.5" />
          <line x1="23" y1="32" x2="23" y2="42" stroke="#f2c84b" strokeWidth="1.5" />
          <line x1="4" y1="23" x2="14" y2="23" stroke="#f2c84b" strokeWidth="1.5" />
          <line x1="32" y1="23" x2="42" y2="23" stroke="#f2c84b" strokeWidth="1.5" />
        </svg>
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={recenter}
        aria-label={t("recenter")}
        className="panel absolute end-4 top-4 z-10"
      >
        <Crosshair className="size-5" />
      </Button>

      {/* Results panel */}
      <div className="panel-solid absolute inset-x-4 bottom-4 z-10 flex max-h-[55dvh] flex-col overflow-hidden rounded-2xl md:inset-x-auto md:bottom-auto md:start-4 md:top-4 md:max-h-[calc(100%-2rem)] md:w-[360px]">
        <div className="flex flex-col gap-3 border-b border-border/60 p-4">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-lg font-semibold">{t("title")}</h1>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {t("memberCount", { count: filtered.length })}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {layers.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => changeLayer(key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  layer === key
                    ? "border-cyan/50 bg-cyan/15 text-cyan"
                    : "border-border bg-card/40 text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>

          {legend.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 border-t border-border/60 pt-2.5">
              {legend.map((l) => (
                <span
                  key={l.label + l.color}
                  className="inline-flex items-center gap-1.5 text-[0.7rem] text-muted-foreground"
                >
                  <span
                    className="flex size-3.5 items-center justify-center rounded-full text-[0.5rem] ring-1 ring-white/40"
                    style={{ backgroundColor: l.color }}
                  >
                    {l.icon}
                  </span>
                  {l.label}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
                <span className="size-2.5 rounded-full bg-emerald-500 ring-1 ring-white/40" />
                {t("online")}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
                <span className="size-2.5 rounded-full bg-muted-foreground/50 ring-1 ring-white/40" />
                {t("offline")}
              </span>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <MapPin className="size-7 text-cyan" />
              <p className="text-sm text-muted-foreground">{t("empty")}</p>
              <Button asChild size="sm" className="mt-1">
                <Link href="/onboarding">{t("emptyCta")}</Link>
              </Button>
            </div>
          ) : selectedItem ? (
            <ItemDetail
              item={selectedItem}
              online={online.has(selectedItem.id)}
              backLabel={t("backToCountry", {
                country: selectedItem.country || "—",
              })}
              onBack={() => setSelectedId(null)}
              viewLabel={
                selectedItem.kind === "listing"
                  ? t("viewListing")
                  : selectedItem.kind === "event"
                    ? t("viewEvent")
                    : t("viewProfile")
              }
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
                {selectedCountry} ·{" "}
                {t("memberCount", { count: countryItems.length })}
              </div>
              {countryItems.map((p) => (
                <ItemRow
                  key={p.id}
                  item={p}
                  online={online.has(p.id)}
                  onClick={() => selectItem(p.id)}
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
                    <MapPin className="size-4 text-cyan" />
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

function ItemAvatar({ item, online }: { item: GlobePoint; online?: boolean }) {
  if (item.kind === "listing") {
    const color = CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.other;
    return (
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: `${color}cc` }}
      >
        <CategoryIcon category={item.category} className="size-4" />
      </span>
    );
  }
  if (item.kind === "event") {
    const style = pointStyle("event", "event");
    return (
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: `${style.color}cc` }}
      >
        <CalendarDays className="size-4" />
      </span>
    );
  }
  const initial = item.name.trim().charAt(0).toUpperCase() || "?";
  const style = pointStyle("person", item.profession);
  return (
    <span className="relative shrink-0">
      <Avatar className="size-9">
        {item.avatarUrl && <AvatarImage src={item.avatarUrl} alt={item.name} />}
        <AvatarFallback className="bg-gradient-to-br from-cyan to-depth-4 text-xs text-primary-foreground">
          {initial}
        </AvatarFallback>
      </Avatar>
      <span
        className="absolute -bottom-0.5 -end-0.5 flex size-4 items-center justify-center rounded-full text-[0.55rem] ring-2 ring-card"
        style={{ backgroundColor: style.color }}
        aria-hidden="true"
      >
        {style.icon}
      </span>
      <span
        className={cn(
          "absolute -top-0.5 -end-0.5 size-2.5 rounded-full ring-2 ring-card",
          online ? "bg-emerald-500" : "bg-muted-foreground/40"
        )}
        aria-hidden="true"
      />
    </span>
  );
}

function OnlineStatus({ online }: { online?: boolean }) {
  const t = useTranslations("Explore");
  return (
    <span
      className={cn(
        "font-medium",
        online ? "text-emerald-400" : "text-muted-foreground/70"
      )}
    >
      {online ? t("online") : t("offline")}
    </span>
  );
}

function ItemRow({
  item,
  online,
  onClick,
}: {
  item: GlobePoint;
  online?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-start transition-colors hover:bg-accent"
    >
      <ItemAvatar item={item} online={online} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium">{item.name}</span>
        <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
          {item.kind === "person" && (
            <>
              <OnlineStatus online={online} />
              {item.city && <span aria-hidden="true">·</span>}
            </>
          )}
          {item.kind === "event" && item.eventAt && (
            <>
              <span className="truncate">
                {new Date(item.eventAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
              {item.city && <span aria-hidden="true">·</span>}
            </>
          )}
          {item.city && <span className="truncate">{item.city}</span>}
        </span>
      </span>
    </button>
  );
}

function ItemDetail({
  item,
  online,
  backLabel,
  onBack,
  viewLabel,
}: {
  item: GlobePoint;
  online?: boolean;
  backLabel: string;
  onBack: () => void;
  viewLabel: string;
}) {
  const place = [item.city, item.country].filter(Boolean).join(", ");
  const href =
    item.kind === "listing"
      ? `/directory/${item.id}`
      : item.kind === "event"
        ? "/feed"
        : `/u/${item.id}`;
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
        <div className="scale-150">
          <ItemAvatar item={item} online={online} />
        </div>
        <div className="min-w-0 ps-2">
          <div className="truncate font-display text-lg font-semibold">
            {item.name}
          </div>
          {place && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5 text-cyan" />
              {place}
            </div>
          )}
          {item.kind === "person" && (
            <div className="text-sm">
              <OnlineStatus online={online} />
            </div>
          )}
          {item.kind === "event" && item.eventAt && (
            <div className="text-sm text-muted-foreground">
              {new Date(item.eventAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </div>
          )}
        </div>
      </div>
      <Button asChild className="gap-2">
        <Link href={href}>
          {item.kind === "listing" ? (
            <CategoryIcon category={item.category} className="size-4" />
          ) : item.kind === "event" ? (
            <CalendarDays className="size-4" />
          ) : (
            <UserRound className="size-4" />
          )}
          {viewLabel}
        </Link>
      </Button>
    </div>
  );
}
