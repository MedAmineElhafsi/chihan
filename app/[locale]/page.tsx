import { setRequestLocale } from "next-intl/server";

import { getGlobePoints } from "@/lib/globe";
import { globeTotals } from "@/lib/globe-totals";
import { GlobeHome } from "@/components/globe/globe-home";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const points = await getGlobePoints();

  // The hero and the panel beside the globe count the same way, from the
  // same place, so they cannot drift apart and show a visitor two different
  // numbers under one word.
  return <GlobeHome points={points} stats={globeTotals(points)} />;
}
