/**
 * Groups globe pins that would overlap on screen into one bubble.
 *
 * Distance is measured as the angle between two points on the sphere, and
 * the threshold scales with the camera's altitude: from far away a pin
 * covers several degrees, close up a fraction of one. So zooming in splits
 * a bubble into its pins, and zooming out merges them again.
 *
 * Greedy and deterministic: points are taken in a fixed order and each joins
 * the first group whose centre is close enough. A selected point never joins
 * a group — what you picked always stays visible.
 */

export type Clusterable = {
  id: string;
  lat: number;
  lng: number;
  selected: boolean;
  dimmed: boolean;
  subtitle: string;
};

export type Cluster<T extends Clusterable> = {
  cluster: true;
  id: string;
  lat: number;
  lng: number;
  members: T[];
  /** Every member filtered out. */
  dimmed: boolean;
  /** Largest angle (degrees) from the centre to a member. Close to zero
   *  means they share an address, and zooming will never separate them. */
  spread: number;
};

/** How many degrees one pin covers per unit of camera altitude. Tuned on a
 *  1280×800 window, where the whole globe sits at altitude 2.5. */
const DEGREES_PER_ALTITUDE = 4.5;

const RAD = Math.PI / 180;

/** Great-circle angle between two points, in degrees. */
export function angleBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const dLat = (b.lat - a.lat) * RAD;
  const dLng = (b.lng - a.lng) * RAD;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLng / 2) ** 2;
  return (2 * Math.asin(Math.min(1, Math.sqrt(h)))) / RAD;
}

export function clusterPoints<T extends Clusterable>(
  points: T[],
  altitude: number
): Array<T | Cluster<T>> {
  const threshold = altitude * DEGREES_PER_ALTITUDE;
  const groups: { lat: number; lng: number; members: T[] }[] = [];
  const out: Array<T | Cluster<T>> = [];

  const ordered = [...points].sort((a, b) => a.id.localeCompare(b.id));
  for (const p of ordered) {
    if (p.selected) {
      out.push(p);
      continue;
    }
    const near = groups.find((g) => angleBetween(g, p) < threshold);
    if (near) {
      near.members.push(p);
      const n = near.members.length;
      near.lat += (p.lat - near.lat) / n;
      near.lng += (p.lng - near.lng) / n;
    } else {
      groups.push({ lat: p.lat, lng: p.lng, members: [p] });
    }
  }

  for (const g of groups) {
    if (g.members.length === 1) {
      out.push(g.members[0]);
      continue;
    }
    out.push({
      cluster: true,
      id: `cluster:${g.members[0].id}`,
      lat: g.lat,
      lng: g.lng,
      members: g.members,
      dimmed: g.members.every((m) => m.dimmed),
      spread: Math.max(...g.members.map((m) => angleBetween(g, m))),
    });
  }
  return out;
}

export function isCluster<T extends Clusterable>(
  d: T | Cluster<T>
): d is Cluster<T> {
  return (d as Cluster<T>).cluster === true;
}
