"use client";

import { createContext, useContext } from "react";

/**
 * Whether this reader can ask for translations: the feature is on, a key is
 * configured, and they are signed in. Decided once, in the layout, so every
 * post and request can ask without being handed a prop.
 */
const CanTranslate = createContext(false);

export function TranslateProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <CanTranslate.Provider value={enabled}>{children}</CanTranslate.Provider>
  );
}

export function useCanTranslate(): boolean {
  return useContext(CanTranslate);
}
