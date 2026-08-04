"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";

import { getDir } from "@/i18n/routing";

/** Keeps <html lang/dir> in sync when the root layout cannot see [locale]. */
export function DocumentAttributes() {
  const locale = useLocale();

  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = getDir(locale);
  }, [locale]);

  return null;
}
