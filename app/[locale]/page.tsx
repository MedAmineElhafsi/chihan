import { setRequestLocale } from "next-intl/server";

import { getGlobePoints } from "@/lib/globe";
import { GlobeHome } from "@/components/globe/globe-home";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const points = await getGlobePoints();
  const people = points.filter((p) => p.kind === "person");

  return (
    <GlobeHome
      points={points}
      // Members, and where the members are — counted the same way for the
      // hero and for the panel that stays beside the globe, so the two can
      // never drift apart and show a visitor different numbers for the same
      // word. City by name alone would fold Berlin, Germany into Berlin,
      // Maryland, so the country goes into the key.
      stats={{
        members: people.length,
        places: points.filter((p) => p.kind === "listing").length,
        cities: new Set(
          people.filter((p) => p.city).map((p) => `${p.city}, ${p.country}`)
        ).size,
        countries: new Set(people.map((p) => p.country).filter(Boolean)).size,
      }}
    />
  );
}
