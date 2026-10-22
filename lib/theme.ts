"use client";

import { useSyncExternalStore } from "react";

import { THEME_CHROME, THEME_STORAGE_KEY } from "./theme-script";

/**
 * The member's theme choice, and applying it.
 *
 * "system" follows the device and is the default; "light" and "dark" pin the
 * theme regardless of it. The choice lives in this browser only
 * (localStorage) — it is a display preference, not part of the profile.
 */
export type ThemePreference = "light" | "dark" | "system";
export type Theme = "light" | "dark";

const DARK_QUERY = "(prefers-color-scheme: dark)";
const CHANGE_EVENT = "cihan-theme-change";

function readPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function resolve(pref: ThemePreference): Theme {
  if (pref !== "system") return pref;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function apply(pref: ThemePreference) {
  const theme = resolve(pref);
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_CHROME[theme]);
}

export function setThemePreference(pref: ThemePreference) {
  try {
    if (pref === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // Storage blocked (private mode): the choice still applies to this page.
  }
  apply(pref);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribePreference(onChange: () => void) {
  // On "system", a device switch has to re-apply; another tab changing the
  // setting arrives as a storage event.
  const mq = window.matchMedia(DARK_QUERY);
  const onDevice = () => {
    if (readPreference() === "system") apply("system");
    onChange();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key !== THEME_STORAGE_KEY) return;
    apply(readPreference());
    onChange();
  };
  mq.addEventListener("change", onDevice);
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    mq.removeEventListener("change", onDevice);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** The stored choice. The server cannot know it, so it renders "system". */
export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(
    subscribePreference,
    readPreference,
    () => "system"
  );
}
