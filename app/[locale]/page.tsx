import { setRequestLocale } from "next-intl/server";

import { getGlobePoints } from "@/lib/globe";
import { GlobeHome } from "@/components/globe/globe-home";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const points = await getGlobePoints();

  return (
    <GlobeHome
      points={points}
      stats={{
        members: points.filter((p) => p.kind === "person").length,
        places: points.filter((p) => p.kind === "listing").length,
        countries: new Set(points.map((p) => p.country).filter(Boolean)).size,
      }}
    />
  );
}
