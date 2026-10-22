import { renderToStaticMarkup } from "react-dom/server";
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  Car,
  ChefHat,
  Cog,
  GraduationCap,
  Handshake,
  HeartPulse,
  Hospital,
  Landmark,
  Palette,
  Scale,
  Scissors,
  ShoppingBasket,
  Stethoscope,
  Store,
  User,
  Utensils,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/**
 * The line icon inside each globe pin, by what the point is.
 *
 * Pins are plain DOM elements the globe library positions itself, so the
 * icon is needed as SVG markup, not a component. Each one is rendered to a
 * string once and reused; nothing mounts React per pin.
 */
const PERSON: Record<string, LucideIcon> = {
  student: GraduationCap,
  worker: Wrench,
  engineer: Cog,
  doctor: Stethoscope,
  nurse: HeartPulse,
  teacher: BookOpen,
  artist: Palette,
  business: Briefcase,
  driver: Car,
  chef: ChefHat,
  lawyer: Scale,
  other: User,
};

const LISTING: Record<string, LucideIcon> = {
  restaurant: Utensils,
  doctor: Hospital,
  grocery: ShoppingBasket,
  lawyer: Landmark,
  hairdresser: Scissors,
  community: Handshake,
  classes: BookOpen,
  other: Store,
};

const cache = new Map<string, string>();

export function pinGlyph(
  kind: "person" | "listing" | "event" | undefined,
  category: string | undefined
): string {
  const key = `${kind}:${category}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const Icon =
    kind === "event"
      ? CalendarDays
      : kind === "person"
        ? (PERSON[category ?? ""] ?? PERSON.other)
        : (LISTING[category ?? ""] ?? LISTING.other);
  const svg = renderToStaticMarkup(
    <Icon size={14} strokeWidth={2.2} aria-hidden="true" />
  );
  cache.set(key, svg);
  return svg;
}
