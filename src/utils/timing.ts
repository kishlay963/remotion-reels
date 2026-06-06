import { interpolate, Easing } from "remotion";

export const easeInOut = (t: number) =>
  interpolate(t, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.ease),
  });

export const easeOut = (t: number) =>
  interpolate(t, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.ease),
  });

/** Generate an array of cut points evenly spaced across the duration */
export const generateCutPoints = (
  durationInFrames: number,
  minInterval: number,
  maxInterval: number,
): number[] => {
  const cuts: number[] = [0];
  let current = 0;
  while (current < durationInFrames) {
    const gap =
      minInterval + Math.floor(Math.random() * (maxInterval - minInterval));
    current += gap;
    if (current < durationInFrames - 10) {
      cuts.push(current);
    }
  }
  return cuts;
};

/** Map a frame number through a speed ramp: returns the source time in seconds */
export const applySpeedRamp = (
  frame: number,
  fps: number,
  segments: { startFrame: number; speedMultiplier: number }[],
): number => {
  let sourceTime = 0;
  let currentFrame = 0;

  for (const seg of segments) {
    const segEndFrame =
      segments.indexOf(seg) < segments.length - 1
        ? segments[segments.indexOf(seg) + 1].startFrame
        : Infinity;

    if (frame < seg.startFrame) break;

    const endFrame = Math.min(frame, segEndFrame);
    const segFrames = endFrame - Math.max(currentFrame, seg.startFrame);
    sourceTime += (segFrames / fps) * seg.speedMultiplier;
    currentFrame = endFrame;
  }

  return sourceTime;
};
