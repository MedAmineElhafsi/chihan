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
import { GlobeSearch, type TagOption } from "./globe-search";

const GlobeGL = dynamic(() => import("./globe-gl"), {
  ssr: false,
  loading: () => null,
});

type Layer = "all" | "people" | "restaurants" | "doctors" | "events";

/** One key covering both a person's profession and a place's category. */
function tagOf(p: GlobePoint): string {
  if (p.kind === "person") return `person:${p.profession || "other"}`;
  if (p.kind === "event") return "event:event";
  return `listing:${p.category}`;
}

export function ExploreClient({
  points,
  chrome = true,
  offsetRight = false,
}: {
  points: GlobePoint[];
  /** Hide the panel/controls — used while the home hero curtain is up. */
  chrome?: boolean;
  /** Push the globe off-centre so hero copy gets clean space. */
  offsetRight?: boolean;
}) {
  const t = useTranslations("Explore");
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const [layer, setLayer] = useState<Layer>("all");
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [tag, setTag] = useState("");
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

  /** Layer is a hard filter: "show me people" means only people. */
  const layerPoints = useMemo(
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

  const searching = Boolean(query.trim() || country || tag);

  /** Search is a soft filter: non-matches stay on the globe, dimmed. */
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return layerPoints.filter((p) => {
      if (country && (p.country || "—") !== country) return false;
      if (tag && tagOf(p) !== tag) return false;
      if (!q) return true;
      return [p.name, p.city, p.country, p.profession, p.category]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q));
    });
  }, [layerPoints, query, country, tag]);

  const matchIds = useMemo(() => new Set(matches.map((p) => p.id)), [matches]);

  /** Countries and professions offered come from the whole layer, so the
   *  dropdowns never collapse to whatever is already selected. */
  const countryOptions = useMemo(
    () =>
      [...new Set(layerPoints.map((p) => p.country || "—"))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [layerPoints]
  );

  const tagOptions = useMemo<TagOption[]>(() => {
    const seen = new Map<string, TagOption>();
    for (const p of layerPoints) {
      const value = tagOf(p);
      if (seen.has(value)) continue;
      seen.set(value, {
        value,
        group: p.kind === "person" ? "people" : "places",
        label:
          p.kind === "person"
            ? t(`prof_${p.profession || "other"}` as never)
            : p.kind === "event"
              ? t("events")
              : t(`cat_${p.category}` as never),
      });
    }
    return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [layerPoints, t]);

  const countries = useMemo(() => {
    const map = new Map<
      string,
      { country: string; count: number; lat: number; lng: number }
    >();
    for (const p of matches) {
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
  }, [matches]);

  const selectedItem = useMemo(
    () => matches.find((p) => p.id === selectedId) ?? null,
    [matches, selectedId]
  );
  const countryItems = useMemo(
    () =>
      selectedCountry
        ? matches.filter((p) => (p.country || "—") === selectedCountry)
        : [],
    [matches, selectedCountry]
  );

  const globeData = useMemo(
    () =>
      layerPoints.map((p) => {
        const style = pointStyle(p.kind, p.kind === "person" ? p.profession : p.category);
        return {
          id: p.id,
          name: p.name,
          lat: p.lat,
          lng: p.lng,
          color: style.color,
          icon: style.icon,
          radius: p.id === selectedId ? 0.9 : searching && matchIds.has(p.id) ? 0.62 : 0.45,
          selected: p.id === selectedId,
          dimmed:
            (searching && !matchIds.has(p.id)) ||
            (selectedCountry != null && (p.country || "—") !== selectedCountry),
          subtitle: p.city ?? "",
          kind: p.kind,
          online: p.kind === "person" ? online.has(p.id) : undefined,
        };
      }),
    [layerPoints, matchIds, searching, selectedId, selectedCountry, online]
  );

  /** Colour key for whatever is currently on screen. */
  const legend = useMemo(() => {
    const seen = new Map<string, { color: string; icon: string; label: string }>();
    for (const p of matches) {
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
  }, [matches, t]);

  const rings = useMemo(
    () =>
      selectedItem ? [{ lat: selectedItem.lat, lng: selectedItem.lng }] : [],
    [selectedItem]
  );

  /** Point the globe at the results as the search narrows. */
  const aim = useMemo(() => {
    if (!searching || matches.length === 0) return null;
    if (matches.length === 1) {
      return { lat: matches[0].lat, lng: matches[0].lng, altitude: 1.1 };
    }
    const lat = matches.reduce((a, p) => a + p.lat, 0) / matches.length;
    const lng = matches.reduce((a, p) => a + p.lng, 0) / matches.length;
    const spread = Math.max(
      ...matches.map((p) => Math.abs(p.lat - lat) + Math.abs(p.lng - lng))
    );
    return { lat, lng, altitude: Math.min(2.5, Math.max(1.2, spread / 22)) };
  }, [searching, matches]);

  const aimKey = aim ? `${aim.lat.toFixed(2)}:${aim.lng.toFixed(2)}:${aim.altitude.toFixed(2)}` : "";

  useEffect(() => {
    if (!aim) return;
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls() as { autoRotate?: boolean };
    if (controls) controls.autoRotate = false;
    g.pointOfView({ lat: aim.lat, lng: aim.lng, altitude: aim.altitude }, 1200);
    // aimKey is the stable signature of aim — re-run only when it really moves.
  }, [aimKey]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const p = matches.find((x) => x.id === id);
    if (!p) return;
    setSelectedId(id);
    setSelectedCountry(p.country || "—");
    flyTo(p.lat, p.lng, 1.1);
  }

  function clearSearch() {
    setQuery("");
    setCountry("");
    setTag("");
    setSelectedCountry(null);
    setSelectedId(null);
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
        className={cn(
          "absolute inset-0 transition-transform duration-1000 ease-out",
          offsetRight && "lg:translate-x-[22%]"
        )}
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

      {/* Search sits over the globe, centred on desktop, full width on phones */}
      <GlobeSearch
        query={query}
        onQuery={setQuery}
        country={country}
        onCountry={setCountry}
        countries={countryOptions}
        tag={tag}
        onTag={setTag}
        tags={tagOptions}
        matches={matches.length}
        active={searching}
        onClear={clearSearch}
        className={cn(
          // Sits clear of the results panel on the left and the recenter button on
          // the right, rather than centring on the viewport and colliding with both.
          "absolute inset-x-4 top-4 z-20 transition-opacity duration-500 md:start-[23rem] md:end-16 md:w-auto md:max-w-[460px]",
          !chrome && "pointer-events-none opacity-0"
        )}
      />

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
        className={cn(
          "panel absolute end-4 top-4 z-10 transition-opacity duration-500",
          !chrome && "pointer-events-none opacity-0"
        )}
      >
        <Crosshair className="size-5" />
      </Button>

      {/* Results panel */}
      <div
        className={cn(
          "panel-solid absolute inset-x-4 bottom-4 z-10 flex max-h-[55dvh] flex-col overflow-hidden rounded-md transition-opacity duration-500 md:inset-x-auto md:bottom-auto md:start-4 md:top-4 md:max-h-[calc(100%-2rem)] md:w-[340px]",
          !chrome && "pointer-events-none opacity-0"
        )}
      >
        <div className="flex flex-col gap-3 border-b border-border/60 p-4">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-lg font-semibold">{t("title")}</h1>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {t("memberCount", { count: matches.length })}
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
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <span
                    className="flex size-3.5 items-center justify-center rounded-full text-[0.625rem] ring-1 ring-white/40"
                    style={{ backgroundColor: l.color }}
                  >
                    {l.icon}
                  </span>
                  {l.label}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2.5 rounded-full bg-emerald-500 ring-1 ring-white/40" />
                {t("online")}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2.5 rounded-full bg-muted-foreground/50 ring-1 ring-white/40" />
                {t("offline")}
              </span>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {matches.length === 0 ? (
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
        className="absolute -bottom-0.5 -end-0.5 flex size-4 items-center justify-center rounded-full text-[0.625rem] ring-2 ring-card"
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
