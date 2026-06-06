import React, { useMemo } from "react";
import { interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";

interface SpeedSegment {
  /** Frame at which this speed kicks in */
  atFrame: number;
  /** Speed multiplier (0.5 = half speed / slow-mo, 2 = 2x fast) */
  speed: number;
  /** Duration in frames to transition to this speed */
  transitionFrames?: number;
}

interface Props {
  children: React.ReactNode;
  segments: SpeedSegment[];
}

/**
 * SpeedRamp — varies playback speed across the timeline.
 * Wraps children and adjusts the time offset so the video
 * appears to speed up or slow down in the marked segments.
 */
export const SpeedRamp: React.FC<Props> = ({ children, segments }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const timeOffset = useMemo(() => {
    if (segments.length === 0) return 0;

    // Calculate the real time elapsed accounting for variable speed
    let realTime = 0; // in seconds
    let currentSpeed = 0; // speed at frame 0 (assume 1x before first segment)
    let lastFrame = 0;

    for (const seg of segments) {
      const framesUntilSegment = seg.atFrame - lastFrame;
      if (frame >= lastFrame) {
        const effectiveFrames = Math.min(frame - lastFrame, framesUntilSegment);
        realTime += (effectiveFrames / fps) * currentSpeed;
      }

      if (frame > seg.atFrame && seg.transitionFrames) {
        // Transition zone — interpolate speed
        const transitionProgress = Math.min(
          (frame - seg.atFrame) / seg.transitionFrames,
          1,
        );
        const easedProgress = interpolate(
          transitionProgress,
          [0, 1],
          [currentSpeed, seg.speed],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.ease) },
        );
        const transitionFrames = Math.min(
          frame - seg.atFrame,
          seg.transitionFrames,
        );
        realTime +=
          (transitionFrames / fps) *
          ((currentSpeed + easedProgress) / 2);
        currentSpeed = seg.speed;
      } else if (frame > seg.atFrame) {
        currentSpeed = seg.speed;
      }

      lastFrame = seg.atFrame;
    }

    // Remaining frames after last segment
    if (frame > lastFrame) {
      realTime += ((frame - lastFrame) / fps) * (segments.length > 0 ? segments[segments.length - 1].speed : 1);
    }

    return realTime;
  }, [frame, fps, segments]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      {children}
    </div>
  );
};

/** Simpler, pre-configured speed ramp: slow start, normal middle, slow end */
export const TikTokSpeedRamp: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { durationInFrames } = useVideoConfig();

  const segments: SpeedSegment[] = useMemo(
    () => [
      { atFrame: 0, speed: 0.8, transitionFrames: 15 },
      { atFrame: Math.floor(durationInFrames * 0.15), speed: 1.1, transitionFrames: 10 },
      { atFrame: Math.floor(durationInFrames * 0.6), speed: 1.0, transitionFrames: 15 },
      { atFrame: Math.floor(durationInFrames * 0.85), speed: 0.7, transitionFrames: 20 },
    ],
    [durationInFrames],
  );

  return <SpeedRamp segments={segments}>{children}</SpeedRamp>;
};
