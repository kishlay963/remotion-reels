import React from "react";
import {
  AbsoluteFill,
  Audio,
  Video,
  Img,
  Series,
  interpolate,
  useCurrentFrame,
  staticFile,
} from "remotion";

// ═══════════════════════════════════════════════════════════════════
// COMPOSITION VITALS
// Update Root.tsx / remotion.config.ts to match:
//   width: 1080, height: 1620, fps: 30
//
// TOTAL DURATION — get exact audio length:
//   ffprobe -v error -select_streams a:0 \
//     -show_entries stream=duration -of csv=p=0 public/skandel3.mp4
//   TOTAL_FRAMES = Math.ceil(seconds * 30) + 15
// ═══════════════════════════════════════════════════════════════════
const TOTAL_FRAMES = 1770;

// ═══════════════════════════════════════════════════════════════════
// CAMERA PROFILES
// Single source file (skandel3.mp4) made to look like 5 cameras via
// zoom, crop anchor, color grade, rotation, flip, and shake.
//
// Source is 2:3 (1080×1620). objectFit:"cover" on a 2:3 composition
// fills frame exactly — no upscaling penalty.
// CLOSE uses 1.35 (not 1.55) to avoid softness on the native res.
// ═══════════════════════════════════════════════════════════════════
type CameraProfile = {
  scale: number;
  translateX: number;
  translateY: number;
  rotation: number;
  flipH: boolean;
  shake: boolean;
  filter: string;
};

const CAMERAS: Record<string, CameraProfile> = {
  WIDE: {
    scale: 1.05,
    translateX: 0,
    translateY: 0,
    rotation: 0,
    flipH: false,
    shake: false,
    filter: "contrast(1.06) saturate(1.08) brightness(1.01)",
  },
  CLOSE: {
    scale: 1.35,
    translateX: 0,
    translateY: -40,
    rotation: 0.4,
    flipH: false,
    shake: false,
    filter:
      "contrast(1.1) saturate(1.05) brightness(1.04) sepia(0.08) hue-rotate(-6deg)",
  },
  MEDIUM_L: {
    scale: 1.28,
    translateX: -55,
    translateY: 10,
    rotation: -0.6,
    flipH: false,
    shake: false,
    filter:
      "contrast(1.07) saturate(0.88) brightness(0.97) hue-rotate(8deg)",
  },
  MEDIUM_R: {
    scale: 1.22,
    translateX: 50,
    translateY: 0,
    rotation: 0.5,
    flipH: true,
    shake: false,
    filter:
      "contrast(1.14) saturate(1.12) brightness(1.0) hue-rotate(-10deg)",
  },
  HANDHELD: {
    scale: 1.18,
    translateX: 0,
    translateY: 20,
    rotation: 0,
    flipH: false,
    shake: true,
    filter: "contrast(1.09) saturate(1.1) brightness(0.99)",
  },
};

// ═══════════════════════════════════════════════════════════════════
// TIMELINE
//
// Video clips:  { type, camera, startFrame, endFrame }
//   → startFrom={startFrame} keeps lips locked to master audio
//   → just change camera: to switch "angle"
//
// Image clips:  { type, source, startFrame, endFrame,
//                 startScale, endScale, driftX, driftY }
//   → full-bleed Ken Burns scene, audio plays through uninterrupted
//   → next video clip resumes from startFrame so sync never breaks
// ═══════════════════════════════════════════════════════════════════
type VideoClipData = {
  type: "video";
  camera: string;
  startFrame: number;
  endFrame: number;
};

type ImageClipData = {
  type: "image";
  source: string;
  startFrame: number;
  endFrame: number;
  startScale: number;
  endScale: number;
  driftX: number;
  driftY: number;
};

type ClipData = VideoClipData | ImageClipData;

const TIMELINE_DATA: ClipData[] = [
  // 0–1.5s   | Hook — CLOSE punch, grab attention immediately
  {
    type: "video",
    camera: "CLOSE",
    startFrame: 0,
    endFrame: 45,
  },
  // 1.5–4s   | Main book cover reveal
  {
    type: "image",
    source: "ChatGPT Image May 27, 2026, 02_46_10 AM.png",
    startFrame: 46,
    endFrame: 120,
    startScale: 1.0,
    endScale: 1.08,
    driftX: -8,
    driftY: -6,
  },
  // 4–7s     | WIDE — establish full frame after cover
  {
    type: "video",
    camera: "WIDE",
    startFrame: 121,
    endFrame: 210,
  },
  // 7–10s    | Aesthetic plot image — tropes drop
  {
    type: "image",
    source: "ChatGPT Image May 27, 2026, 02_43_13 AM.png",
    startFrame: 211,
    endFrame: 300,
    startScale: 1.1,
    endScale: 1.02,
    driftX: 10,
    driftY: 5,
  },
  // 10–13s   | MEDIUM_L — side anchor energy, tropes continue
  {
    type: "video",
    camera: "MEDIUM_L",
    startFrame: 301,
    endFrame: 390,
  },
  // 13–15s   | CLOSE — re-emphasise face on key pitch beat
  {
    type: "video",
    camera: "CLOSE",
    startFrame: 391,
    endFrame: 450,
  },
  // 15–18s   | Cover re-lock — product recognition
  {
    type: "image",
    source: "ChatGPT Image May 27, 2026, 02_46_10 AM.png",
    startFrame: 451,
    endFrame: 540,
    startScale: 1.02,
    endScale: 1.1,
    driftX: 6,
    driftY: -8,
  },
  // 18–22s   | MEDIUM_R — mirrored angle, visual refresh
  {
    type: "video",
    camera: "MEDIUM_R",
    startFrame: 541,
    endFrame: 660,
  },
  // 22–25s   | HANDHELD — hype build, energy spike
  {
    type: "video",
    camera: "HANDHELD",
    startFrame: 661,
    endFrame: 750,
  },
  // 25–30s   | Buying graphic — conversion push
  {
    type: "image",
    source: "d738d789-24e3-4613-9a07-782ff830ee88.png",
    startFrame: 751,
    endFrame: 900,
    startScale: 1.0,
    endScale: 1.07,
    driftX: -5,
    driftY: 5,
  },
  // 30–35s   | WIDE — settle into mid-pitch
  {
    type: "video",
    camera: "WIDE",
    startFrame: 901,
    endFrame: 1050,
  },
  // 35–40s   | MEDIUM_L — keep visual rhythm
  {
    type: "video",
    camera: "MEDIUM_L",
    startFrame: 1051,
    endFrame: 1200,
  },
  // 40–45s   | CLOSE — intimacy on emotional beat
  {
    type: "video",
    camera: "CLOSE",
    startFrame: 1201,
    endFrame: 1350,
  },
  // 45–48s   | Final aesthetic flash
  {
    type: "image",
    source: "ChatGPT Image May 27, 2026, 02_43_13 AM.png",
    startFrame: 1351,
    endFrame: 1440,
    startScale: 1.05,
    endScale: 1.12,
    driftX: 8,
    driftY: -4,
  },
  // 48–52s   | MEDIUM_R — punchy CTA start
  {
    type: "video",
    camera: "MEDIUM_R",
    startFrame: 1441,
    endFrame: 1560,
  },
  // 52–end   | WIDE — final wide pullback to close
  {
    type: "video",
    camera: "WIDE",
    startFrame: 1561,
    endFrame: TOTAL_FRAMES,
  },
];

// ─── CONSTANTS ────────────────────────────────────────────────────
const FADE_FRAMES = 6;
const FLASH_FRAMES = 2;

// ─── VIGNETTE ─────────────────────────────────────────────────────
const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(0,0,0,0.72) 100%)",
      pointerEvents: "none",
      zIndex: 10,
    }}
  />
);

// ─── FILM GRAIN ───────────────────────────────────────────────────
const FilmGrain: React.FC = () => {
  const frame = useCurrentFrame();
  const seed = (frame * 97) % 200;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        zIndex: 11,
        opacity: 0.05,
        overflow: "hidden",
      }}
    >
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <filter id="grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.72"
            numOctaves="4"
            seed={seed}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

// ─── CUT FLASH ────────────────────────────────────────────────────
const CutFlash: React.FC = () => {
  const frame = useCurrentFrame();
  const flashOpacity = interpolate(
    frame,
    [0, FLASH_FRAMES, FLASH_FRAMES + 1],
    [0.4, 0.4, 0],
    { extrapolateRight: "clamp" },
  );
  return (
    <AbsoluteFill
      style={{
        backgroundColor: `rgba(255,255,255,${flashOpacity})`,
        pointerEvents: "none",
        zIndex: 12,
      }}
    />
  );
};

// ─── VIDEO CLIP ───────────────────────────────────────────────────
const VideoClipEl: React.FC<{ clip: VideoClipData; duration: number }> = ({
  clip,
  duration,
}) => {
  const frame = useCurrentFrame();
  const cam = CAMERAS[clip.camera];

  const opacity = interpolate(
    frame,
    [0, FADE_FRAMES, duration - FADE_FRAMES, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const pushScale = interpolate(
    frame,
    [0, duration],
    [cam.scale, cam.scale + 0.035],
    { extrapolateRight: "clamp" },
  );

  const shakeX = cam.shake
    ? Math.sin(frame * 0.4) * 3 + Math.sin(frame * 1.1) * 1.5
    : 0;
  const shakeY = cam.shake
    ? Math.cos(frame * 0.35) * 2 + Math.cos(frame * 0.9) * 1.0
    : 0;
  const shakeRot = cam.shake ? Math.sin(frame * 0.25) * 0.3 : 0;

  const scaleX = cam.flipH ? -pushScale : pushScale;

  const transform = [
    `scaleX(${scaleX})`,
    `scaleY(${pushScale})`,
    `translateX(${cam.translateX + shakeX}px)`,
    `translateY(${cam.translateY + shakeY}px)`,
    `rotate(${cam.rotation + shakeRot}deg)`,
  ].join(" ");

  return (
    <AbsoluteFill style={{ opacity, backgroundColor: "#000" }}>
      <Video
        src={staticFile("skandel3.mp4")}
        startFrom={clip.startFrame}
        endAt={clip.startFrame + duration}
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform,
          filter: cam.filter,
        }}
      />
      <Vignette />
      <FilmGrain />
      <CutFlash />
    </AbsoluteFill>
  );
};

// ─── IMAGE CLIP ───────────────────────────────────────────────────
const ImageClipEl: React.FC<{ clip: ImageClipData; duration: number }> = ({
  clip,
  duration,
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(
    frame,
    [0, FADE_FRAMES, duration - FADE_FRAMES, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const scale = interpolate(
    frame,
    [0, duration],
    [clip.startScale, clip.endScale],
    { extrapolateRight: "clamp" },
  );

  const driftX = interpolate(frame, [0, duration], [0, clip.driftX], {
    extrapolateRight: "clamp",
  });

  const driftY = interpolate(frame, [0, duration], [0, clip.driftY], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{ opacity, backgroundColor: "#000", overflow: "hidden" }}
    >
      <Img
        src={staticFile(clip.source)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center center",
          filter: "contrast(1.08) saturate(1.1) brightness(1.01)",
          transform: `scale(${scale}) translate(${driftX}px, ${driftY}px)`,
          transformOrigin: "center center",
        }}
      />
      <Vignette />
      <FilmGrain />
      <CutFlash />
    </AbsoluteFill>
  );
};

// ─── ROOT COMPOSITION ─────────────────────────────────────────────
export const BookTokImpactEdit: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Audio src={staticFile("skandel3.mp4")} volume={1.0} />

      <Series>
        {TIMELINE_DATA.map((clip, index) => {
          const duration = clip.endFrame - clip.startFrame + 1;
          return (
            <Series.Sequence key={index} durationInFrames={duration}>
              {clip.type === "video" ? (
                <VideoClipEl clip={clip} duration={duration} />
              ) : (
                <ImageClipEl clip={clip as ImageClipData} duration={duration} />
              )}
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
};
