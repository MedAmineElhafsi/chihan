import { Composition } from "remotion";

import { AuthLoop } from "./AuthLoop";
import { HeroLoop } from "./HeroLoop";
import { OgCard } from "./OgCard";
import { dawn, dusk } from "./theme";

export const FPS = 30;
export const DURATION = 8 * FPS; // 8s loop

/** Sign-in / sign-up panel: 4:5, the panel's shape, 10s seamless loop. */
const AUTH = { fps: 30, durationInFrames: 10 * 30, width: 1080, height: 1350 };

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="HeroLoop"
        component={HeroLoop}
        durationInFrames={DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="AuthDawn"
        component={AuthLoop}
        defaultProps={{ scene: dawn }}
        {...AUTH}
      />
      <Composition
        id="AuthDusk"
        component={AuthLoop}
        defaultProps={{ scene: dusk }}
        {...AUTH}
      />
      <Composition
        id="OgCard"
        component={OgCard}
        durationInFrames={1}
        fps={30}
        width={1200}
        height={630}
      />
    </>
  );
}
