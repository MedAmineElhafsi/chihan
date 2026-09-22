/**
 * The languages a member can speak are stored under one fixed name each
 * ("German", "Soranî"), so matching works whatever language the interface is
 * in. Shown to a person, the widely spoken ones read better in their own
 * interface language — "Almanî", "ئەڵمانی", "Deutsch". The Kurdish varieties
 * keep the names their speakers use.
 */
const ISO: Record<string, string> = {
  Arabic: "ar",
  Turkish: "tr",
  Persian: "fa",
  English: "en",
  German: "de",
  French: "fr",
  Swedish: "sv",
  Dutch: "nl",
};

/**
 * The Kurdish varieties, for readers of the Arabic script. Their Latin
 * endonyms stay in Latin-script interfaces, as their speakers write them.
 */
const KURDISH_IN_ARABIC_SCRIPT: Record<string, Record<string, string>> = {
  ckb: {
    Kurmancî: "کورمانجی",
    Soranî: "سۆرانی",
    Zazakî: "زازاکی",
    Hewramî: "هەورامی",
    "Southern Kurdish": "کوردیی باشووری",
  },
  ar: {
    Kurmancî: "الكرمانجية",
    Soranî: "السورانية",
    Zazakî: "الزازاكية",
    Hewramî: "الهورامية",
    "Southern Kurdish": "الكردية الجنوبية",
  },
};

const cache = new Map<string, Intl.DisplayNames | null>();

function namesFor(locale: string): Intl.DisplayNames | null {
  if (!cache.has(locale)) {
    try {
      cache.set(locale, new Intl.DisplayNames([locale], { type: "language" }));
    } catch {
      cache.set(locale, null);
    }
  }
  return cache.get(locale) ?? null;
}

export function languageLabel(language: string, locale: string): string {
  const kurdish = KURDISH_IN_ARABIC_SCRIPT[locale]?.[language];
  if (kurdish) return kurdish;
  const code = ISO[language];
  if (!code) return language;
  const name = namesFor(locale)?.of(code);
  // An engine without names for this locale echoes the code back.
  if (!name || name === code) return language;
  return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
}
