import React, { useMemo } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

interface Props {
  children: React.ReactNode;
  startScale?: number;
  endScale?: number;
  /** Random seed for direction variation */
  seed?: number;
}

export const KenBurns: React.FC<Props> = ({
  children,
  startScale = 1.0,
  endScale = 1.12,
  seed = 0,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();

  const { scale, translateX, translateY } = useMemo(() => {
    const progress = frame / durationInFrames;

    const scale = interpolate(progress, [0, 1], [startScale, endScale], {
      extrapolateRight: "clamp",
      extrapolateLeft: "clamp",
    });

    // Slight pan based on seed — alternates direction each segment
    const panPhase = (seed * 1.7 + progress) % 1;
    const panX = interpolate(panPhase, [0, 0.5, 1], [-3, 3, -3], {
      extrapolateRight: "clamp",
      extrapolateLeft: "clamp",
    });
    const panY = interpolate(panPhase, [0, 0.5, 1], [2, -2, 2], {
      extrapolateRight: "clamp",
      extrapolateLeft: "clamp",
    });

    return {
      scale,
      translateX: (panX / 100) * width,
      translateY: (panY / 100) * height,
    };
  }, [frame, durationInFrames, startScale, endScale, seed, width, height]);

  return (
    <div
      style={{
        transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
        transformOrigin: "center center",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
};
