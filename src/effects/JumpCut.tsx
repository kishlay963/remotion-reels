import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig, Sequence } from "remotion";

interface Props {
  children: React.ReactNode;
  /** Number of cuts across the duration */
  cutCount?: number;
  /** How many frames to skip forward on each cut (creates stutter) */
  skipFrames?: number;
}

export const JumpCut: React.FC<Props> = ({
  children,
  cutCount = 8,
  skipFrames = 4,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const cutPoints = useMemo(() => {
    const cuts: number[] = [0];
    // Distribute cuts with some randomness
    const avgInterval = durationInFrames / (cutCount + 1);
    for (let i = 1; i <= cutCount; i++) {
      const jitter = (Math.random() - 0.5) * avgInterval * 0.4;
      const point = Math.floor(avgInterval * i + jitter);
      if (point < durationInFrames - 10 && point > cuts[cuts.length - 1] + 5) {
        cuts.push(point);
      }
    }
    return cuts;
  }, [durationInFrames, cutCount]);

  // Find which segment the current frame falls in
  let segmentStart = 0;
  let cutIndex = -1;
  for (let i = 0; i < cutPoints.length; i++) {
    if (frame >= cutPoints[i]) {
      segmentStart = cutPoints[i];
      cutIndex = i;
    }
  }

  // Accumulate skipped frames from previous cuts
  const accumulatedSkip = cutIndex * skipFrames;
  const sourceFrame = frame + accumulatedSkip;

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Sequence from={0} durationInFrames={durationInFrames}>
        {/* We use a trick: render the children offset by the accumulated skip */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            clipPath: `inset(0 0 0 0)`,
          }}
        >
          {children}
        </div>
      </Sequence>
    </div>
  );
};

/**
 * JumpCutVideo — a more direct implementation that renders video segments
 * with frame skipping, similar to the beat-cut effect on TikTok.
 */
export const JumpCutVideo: React.FC<{
  videoSrc: string;
  cutCount?: number;
  skipFrames?: number;
}> = ({ videoSrc, cutCount = 8, skipFrames = 4 }) => {
  const { durationInFrames } = useVideoConfig();

  const cutPoints = useMemo(() => {
    const cuts: number[] = [0];
    const avgInterval = durationInFrames / (cutCount + 1);
    for (let i = 1; i <= cutCount; i++) {
      const jitter = (Math.random() - 0.5) * avgInterval * 0.3;
      const point = Math.floor(avgInterval * i + jitter);
      if (point < durationInFrames - 10 && point > cuts[cuts.length - 1] + 5) {
        cuts.push(point);
      }
    }
    return cuts;
  }, [durationInFrames, cutCount]);

  // Build segments: each segment plays a clip starting from a further-ahead time
  const segments = useMemo(() => {
    return cutPoints.map((cutStart, i) => {
      const nextCut = cutPoints[i + 1] ?? durationInFrames;
      const segmentDuration = nextCut - cutStart;
      return {
        from: cutStart,
        duration: segmentDuration,
        // Each segment jumps ahead in the source by skipFrames
        srcStartFrame: cutStart + i * skipFrames,
      };
    });
  }, [cutPoints, durationInFrames, skipFrames]);

  return (
    <>
      {segments.map((seg) => (
        <Sequence
          key={seg.from}
          from={seg.from}
          durationInFrames={seg.duration}
        >
          <JumpCutSegment
            videoSrc={videoSrc}
            srcStartFrame={seg.srcStartFrame}
          />
        </Sequence>
      ))}
    </>
  );
};

const JumpCutSegment: React.FC<{
  videoSrc: string;
  srcStartFrame: number;
}> = ({ videoSrc, srcStartFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        position: "absolute",
        left: -(srcStartFrame / fps) * 100 + "%",
        top: 0,
        width: "100%",
        height: "100%",
      }}
    />
  );
};
