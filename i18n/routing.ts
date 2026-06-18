import { defineRouting } from "next-intl/routing";

/** Supported locales. English is the source-of-truth default. */
export const locales = ["en", "de", "ku", "ckb", "ar"] as const;
export type Locale = (typeof locales)[number];

/** Locales that render right-to-left. */
export const rtlLocales: readonly Locale[] = ["ckb", "ar"];

/** Display metadata for the language switcher. */
export const localeMeta: Record<
  Locale,
  { label: string; native: string; dir: "ltr" | "rtl" }
> = {
  en: { label: "English", native: "English", dir: "ltr" },
  de: { label: "German", native: "Deutsch", dir: "ltr" },
  ku: { label: "Kurmancî", native: "Kurmancî", dir: "ltr" },
  ckb: { label: "Soranî", native: "سۆرانی", dir: "rtl" },
  ar: { label: "Arabic", native: "العربية", dir: "rtl" },
};

export function getDir(locale: string): "ltr" | "rtl" {
  return rtlLocales.includes(locale as Locale) ? "rtl" : "ltr";
}

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
});
