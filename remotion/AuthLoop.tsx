import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { ease, type SceneTheme } from "./theme";

/**
 * Newroz over the mountains — the sign-in / sign-up panel.
 *
 * Layered ridges, a sun breathing behind them, and small lanterns of light
 * rising off the hills: "every diaspora is a constellation, add your light".
 * There is no text in the video; the page writes it in HTML, in the reader's
 * language, over the bottom of the frame.
 *
 * A seamless loop. Every motion is a whole number of cycles across the
 * composition (`t` runs 0→1), so the last frame flows into the first.
 *
 * Five layers, bottom to top: sky mesh → sun and ridges → lanterns → grade →
 * grain and vignette.
 */

const TAU = Math.PI * 2;

/** Deterministic pseudo-random in [0, 1) — renders must be repeatable. */
function rand(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** A mountain ridge as an SVG path: layered sines, deterministic per seed. */
function ridgePath(
  width: number,
  height: number,
  baseY: number,
  amp: number,
  seed: number
) {
  const steps = 64;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width;
    const u = i / steps;
    // |sin| folds each wave into a peak, so the sum reads as mountains with
    // ridgelines rather than rolling dunes.
    const y =
      baseY -
      amp *
        (0.6 * Math.abs(Math.sin(u * 3.1 + seed)) +
          0.28 * Math.abs(Math.sin(u * 7.7 + seed * 2.3)) +
          0.12 * Math.abs(Math.sin(u * 19.3 + seed * 4.1)));
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `M0,${height} L${pts.join(" L")} L${width},${height} Z`;
}

const RIDGES = [
  { base: 0.64, amp: 0.14, seed: 1.3, drift: 10, cycles: 1 },
  { base: 0.7, amp: 0.11, seed: 4.7, drift: 16, cycles: 1 },
  { base: 0.77, amp: 0.08, seed: 8.2, drift: 24, cycles: 1 },
  { base: 0.84, amp: 0.06, seed: 2.9, drift: 34, cycles: 1 },
] as const;

const LANTERNS = Array.from({ length: 22 }, (_, i) => ({
  x: 0.06 + rand(i + 1) * 0.88,
  phase: rand(i + 40),
  size: 5 + rand(i + 80) * 7,
  sway: 6 + rand(i + 120) * 14,
  // Integer cycles keep the loop seamless; most rise once, a few twice.
  cycles: rand(i + 160) > 0.75 ? 2 : 1,
}));

export function AuthLoop({ scene }: { scene: SceneTheme }) {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const t = frame / durationInFrames;

  return (
    <AbsoluteFill style={{ background: scene.page }}>
      <Sky scene={scene} t={t} />
      <Sun scene={scene} t={t} width={width} height={height} />
      <Ridges scene={scene} t={t} width={width} height={height} />
      <Lanterns scene={scene} t={t} width={width} height={height} />
      <Grade scene={scene} />
      <Grain scene={scene} frame={frame} />
      <Vignette scene={scene} />
    </AbsoluteFill>
  );
}

/* --- 1. background mesh ------------------------------------------------- */

function Sky({ scene, t }: { scene: SceneTheme; t: number }) {
  // Two soft bodies of haze that wander on whole cycles: the sky is never
  // a flat gradient, and never still.
  const d1 = Math.sin(t * TAU) * 6;
  const d2 = Math.cos(t * TAU) * 5;
  const [a, b, c, d] = scene.sky;
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${a} 0%, ${b} 32%, ${c} 52%, ${d} 64%, ${d} 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 30% at ${30 + d1}% 48%, ${scene.haze}, transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(45% 22% at ${74 - d2}% 40%, ${scene.haze}, transparent 70%)`,
          opacity: 0.7,
        }}
      />
    </AbsoluteFill>
  );
}

/* --- 2. assets: the sun and the mountains ----------------------------- */

function Sun({
  scene,
  t,
  width,
  height,
}: {
  scene: SceneTheme;
  t: number;
  width: number;
  height: number;
}) {
  // The hero element — the only thing in the frame that glows. It breathes
  // in size and lifts a few pixels, once per loop.
  const breathe = 1 + Math.sin(t * TAU) * 0.025;
  const lift = Math.sin(t * TAU - Math.PI / 2) * 10;
  const r = width * 0.13;
  const halo = r * 3.2;
  const cx = width * 0.5;
  const cy = height * 0.53 + lift;
  // Halo and disc are separate layers, each a gradient that falls all the
  // way to transparent — no box-shadow, which left a hard ring and seams.
  return (
    <AbsoluteFill style={{ transform: `scale(${breathe})`, transformOrigin: `${cx}px ${cy}px` }}>
      <div
        style={{
          position: "absolute",
          left: cx - halo,
          top: cy - halo,
          width: halo * 2,
          height: halo * 2,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${scene.sun} 0%, transparent 65%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: cx - r,
          top: cy - r,
          width: r * 2,
          height: r * 2,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${scene.sunCore} 0%, ${scene.sunCore} 55%, transparent 71%)`,
        }}
      />
    </AbsoluteFill>
  );
}

function Ridges({
  scene,
  t,
  width,
  height,
}: {
  scene: SceneTheme;
  t: number;
  width: number;
  height: number;
}) {
  // Parallax: nearer ridges drift further. Drawn wider than the frame so the
  // drift never reveals an edge.
  const over = 80;
  return (
    <AbsoluteFill>
      {RIDGES.map((r, i) => {
        const x = Math.sin(t * TAU * r.cycles + i) * r.drift;
        return (
          <svg
            key={i}
            width={width + over * 2}
            height={height}
            viewBox={`0 0 ${width + over * 2} ${height}`}
            style={{
              position: "absolute",
              left: -over,
              top: 0,
              transform: `translateX(${x}px)`,
            }}
          >
            <path
              d={ridgePath(
                width + over * 2,
                height,
                height * r.base,
                height * r.amp,
                r.seed
              )}
              fill={scene.ridges[i]}
            />
          </svg>
        );
      })}
    </AbsoluteFill>
  );
}

/* --- 3. graphics: rising lights --------------------------------------- */

function Lanterns({
  scene,
  t,
  width,
  height,
}: {
  scene: SceneTheme;
  t: number;
  width: number;
  height: number;
}) {
  return (
    <AbsoluteFill>
      {LANTERNS.map((l, i) => {
        // Each light rises from the hills to the upper sky on its own phase;
        // the wrap happens while it is invisible, so the loop has no seam.
        const p = (t * l.cycles + l.phase) % 1;
        const y = interpolate(p, [0, 1], [height * 0.8, height * 0.08], {
          easing: ease.drift,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const x = l.x * width + Math.sin(p * TAU + i) * l.sway;
        const opacity = interpolate(p, [0, 0.12, 0.7, 1], [0, 1, 0.85, 0], {
          easing: ease.inOut,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const scale = interpolate(p, [0, 0.12, 1], [0.4, 1, 0.7], {
          easing: ease.out,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - l.size,
              top: y - l.size,
              width: l.size * 2,
              height: l.size * 2,
              borderRadius: "50%",
              opacity,
              transform: `scale(${scale})`,
              background: `radial-gradient(circle, ${scene.lantern} 0%, ${scene.lantern} 35%, ${scene.lanternGlow} 60%, transparent 75%)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

/* --- 4. grade, 5. grain and vignette ---------------------------------- */

function Grade({ scene }: { scene: SceneTheme }) {
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          backgroundColor: scene.grade,
          mixBlendMode: "soft-light",
          opacity: scene.gradeOpacity,
        }}
      />
      {/* The bottom dissolves into the page, so the HTML text there sits on
          the page colour and the panel has no hard edge. */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, transparent 72%, ${scene.page} 100%)`,
        }}
      />
    </AbsoluteFill>
  );
}

const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;

function Grain({ scene, frame }: { scene: SceneTheme; frame: number }) {
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        backgroundImage: NOISE,
        backgroundSize: "220px",
        backgroundPosition: `${(frame * 7) % 220}px ${(frame * 13) % 220}px`,
        opacity: 0.06,
        mixBlendMode: scene.grainBlend,
      }}
    />
  );
}

function Vignette({ scene }: { scene: SceneTheme }) {
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        background: `radial-gradient(ellipse at center, transparent 58%, ${scene.vignette} 100%)`,
      }}
    />
  );
}
