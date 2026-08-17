import { Composition } from "remotion";

import { HeroLoop } from "./HeroLoop";

export const FPS = 30;
export const DURATION = 8 * FPS; // 8s loop

export function RemotionRoot() {
  return (
    <Composition
      id="HeroLoop"
      component={HeroLoop}
      durationInFrames={DURATION}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
}
