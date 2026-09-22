import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

/** Nav items that name a page of their own. */
type NavName =
  | "home"
  | "explore"
  | "reels"
  | "profile"
  | "help"
  | "directory"
  | "messages"
  | "search"
  | "news"
  | "buddies"
  | "jobs"
  | "housing"
  | "notifications"
  | "settings"
  | "dashboard";

/**
 * A page's document title is the name its nav item gives it.
 *
 * Every page used to share one title, and Next's route announcer only speaks
 * when `document.title` changes — so moving between tabs said nothing to a
 * screen reader, and every browser tab read the same. Taking the name from
 * the nav label, not a copy of it, means the tab you tap and the title you
 * hear cannot drift apart. The layout adds the brand (Metadata.titleTemplate).
 *
 *   export const generateMetadata = navTitle("help");
 */
export function navTitle(name: NavName) {
  return async function generateMetadata({
    params,
  }: {
    params: Promise<{ locale: string }>;
  }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Nav" });
    return { title: t(name) };
  };
}
