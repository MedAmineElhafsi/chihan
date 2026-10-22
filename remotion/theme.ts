// The single source of truth for the Remotion compositions: colours per
// theme, easings and springs. Components never inline a hex or a curve.
// Colours mirror the Newroz (light) and Dusk (dark) tokens in
// app/globals.css, so the video sits in the page without a seam.
import { Easing } from "remotion";

export type SceneTheme = {
  /** Sky, top of frame to the horizon. */
  sky: readonly [string, string, string, string];
  /** The sun's core, its halo, and the haze it throws across the sky. */
  sun: string;
  sunCore: string;
  haze: string;
  /** Mountain ridges, farthest first. */
  ridges: readonly [string, string, string, string];
  /** Rising lights. */
  lantern: string;
  lanternGlow: string;
  /** The page background the bottom of the frame dissolves into. */
  page: string;
  grade: string;
  gradeOpacity: number;
  grainBlend: "multiply" | "overlay";
  vignette: string;
};

export const dawn: SceneTheme = {
  sky: ["#e9e1d3", "#efd9bf", "#f0c9a0", "#eab27f"],
  sun: "rgba(242, 166, 90, 0.55)",
  sunCore: "#fbe2b8",
  haze: "rgba(246, 201, 168, 0.55)",
  ridges: ["#d6c3a8", "#bcae8d", "#93976f", "#6f7c58"],
  lantern: "#fff4e0",
  lanternGlow: "rgba(242, 166, 90, 0.5)",
  page: "#e9e1d3",
  grade: "#d89a2b",
  gradeOpacity: 0.1,
  grainBlend: "multiply",
  vignette: "rgba(74, 48, 24, 0.16)",
};

export const dusk: SceneTheme = {
  sky: ["#15131c", "#2a2236", "#5a3442", "#a8563f"],
  sun: "rgba(242, 166, 90, 0.6)",
  sunCore: "#ffd59e",
  haze: "rgba(224, 137, 90, 0.4)",
  ridges: ["#4a3448", "#35283f", "#241c2e", "#17131e"],
  lantern: "#ffd08a",
  lanternGlow: "rgba(242, 166, 90, 0.55)",
  page: "#15131c",
  grade: "#e0895a",
  gradeOpacity: 0.18,
  grainBlend: "overlay",
  vignette: "rgba(0, 0, 0, 0.35)",
};

export const ease = {
  /** Entrances. */
  out: Easing.bezier(0.16, 1, 0.3, 1),
  /** Moves and breathing that has a start and an end. */
  inOut: Easing.bezier(0.83, 0, 0.17, 1),
  /** Exits only. */
  in: Easing.bezier(0.7, 0, 0.84, 0),
  /** Long, even travel (rising lights): eased at both ends, nearly constant
      in between, so nothing bunches at the start or the end of the path. */
  drift: Easing.bezier(0.33, 0, 0.67, 1),
} as const;

export const spring = {
  smooth: { damping: 20, stiffness: 90, mass: 1 },
} as const;
