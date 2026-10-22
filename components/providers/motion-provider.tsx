"use client";

import { MotionConfig } from "motion/react";

/**
 * Every Motion animation in the app honours the device's reduced-motion
 * setting: movement (layout, position, scale) is dropped and opacity is
 * kept, so feedback still happens without travel. CSS motion does the same
 * in globals.css.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
