import React, { useMemo } from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

interface ShakeTrigger {
  /** Frame at which the shake starts */
  atFrame: number;
  /** How intense the shake is (pixels) */
  intensity?: number;
  /** How long the shake lasts in frames */
  duration?: number;
}

interface Props {
  children: React.ReactNode;
  triggers: ShakeTrigger[];
}

export const CameraShake: React.FC<Props> = ({ children, triggers }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { translateX, translateY, rotate } = useMemo(() => {
    let totalX = 0;
    let totalY = 0;
    let totalRotate = 0;

    for (const trigger of triggers) {
      const intensity = trigger.intensity ?? 20;
      const duration = trigger.duration ?? 12;
      const elapsed = frame - trigger.atFrame;

      if (elapsed < 0 || elapsed > duration) continue;

      // Use spring for a punchy shake that decays quickly
      const decay = spring({
        frame: elapsed,
        fps,
        config: { damping: 8, stiffness: 200, mass: 0.5 },
        durationInFrames: duration,
      });

      // Different random directions per trigger, seeded by atFrame
      const seed = trigger.atFrame * 37;
      const angle1 = ((seed * 13) % 360) * (Math.PI / 180);
      const angle2 = ((seed * 23) % 360) * (Math.PI / 180);

      totalX += Math.cos(angle1) * intensity * decay;
      totalY += Math.sin(angle1) * intensity * decay;
      totalRotate += Math.sin(angle2) * (intensity * 0.05) * decay;
    }

    return { translateX: totalX, translateY: totalY, rotate: totalRotate };
  }, [frame, fps, triggers]);

  return (
    <div
      style={{
        transform: `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg)`,
        width: "100%",
        height: "100%",
      }}
    >
      {children}
    </div>
  );
};

/**
 * Generate shake triggers aligned with jump-cut points
 * for a cohesive feel — every cut gets a shake.
 */
export const shakeTriggersFromCuts = (
  cutPoints: number[],
  intensity: number = 18,
  duration: number = 10,
): ShakeTrigger[] => {
  return cutPoints.map((atFrame) => ({ atFrame, intensity, duration }));
};
