import { setRequestLocale } from "next-intl/server";

import { getGlobePoints } from "@/lib/globe";
import { ExploreClient } from "@/components/globe/explore-client";

export default async function ExplorePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const points = await getGlobePoints();

  return <ExploreClient points={points} />;
}
