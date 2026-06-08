import React from "react";
import {
  AbsoluteFill,
  Audio,
  Video,
  Img,
  Sequence,
  Series,
  interpolate,
  useCurrentFrame,
  staticFile,
} from "remotion";
import type { WordTiming, CaptionChunk } from "./captions-data";
import { CAPTIONS, TOTAL_FRAMES } from "./captions-data";
import CONFIG from "./reel-config.json";

// ─── Asset resolution ────────────────────────────────────────────
function resolveSource(type: "video" | "image", assetId: string): string {
  if (type === "video") return CONFIG.assets.video;
  const broll = CONFIG.assets.broll.find((b) => b.id === assetId);
  if (!broll) throw new Error(`Unknown broll assetId: "${assetId}"`);
  return broll.filename;
}

// ─── Internal render types ──────────────────────────────────────
type VideoClipData = {
  type: "video";
  source: string;
  scale: number;
  yOffset?: number;
  startFrame: number;
  endFrame: number;
  isMasterSync?: boolean;
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
  objectPosition?: string;
  colorOverlay?: string;
  fadeInFrames?: number;
  fadeOutFrames?: number;
};

type EmojiClipData = {
  type: "emoji";
  emoji: string;
  startFrame: number;
  endFrame: number;
  size: number;
  positionX: string;
  positionY: string;
  fadeInFrames: number;
  fadeOutFrames: number;
  scalePop: boolean;
};

type ClipData = VideoClipData | ImageClipData | EmojiClipData;

// ─── Build timeline from config ──────────────────────────────────
const ALL_CLIPS: ClipData[] = CONFIG.timeline.map((clip: any) => {
  if (clip.type === "emoji") {
    return {
      type: "emoji",
      emoji:        clip.emoji,
      startFrame:   clip.startFrame,
      endFrame:     clip.endFrame,
      size:         clip.size         ?? 160,
      positionX:    clip.positionX    ?? "50%",
      positionY:    clip.positionY    ?? "50%",
      fadeInFrames: clip.fadeInFrames ?? 8,
      fadeOutFrames:clip.fadeOutFrames?? 8,
      scalePop:     clip.scalePop     ?? true,
    } as EmojiClipData;
  }

  if (clip.type === "video") {
    return {
      type: "video",
      source:       resolveSource("video", clip.assetId),
      scale:        clip.scale    ?? 1.0,
      yOffset:      clip.yOffset,
      startFrame:   clip.startFrame,
      endFrame:     clip.endFrame,
      isMasterSync: clip.isAudioSource ?? false,
    } as VideoClipData;
  }

  return {
    type:          "image",
    source:        resolveSource("image", clip.assetId),
    startFrame:    clip.startFrame,
    endFrame:      clip.endFrame,
    startScale:    clip.kenBurns.startScale,
    endScale:      clip.kenBurns.endScale,
    driftX:        clip.kenBurns.driftX,
    driftY:        clip.kenBurns.driftY,
    objectPosition:clip.objectPosition,
    colorOverlay:  clip.colorOverlay,
    fadeInFrames:  clip.fadeInFrames,
    fadeOutFrames: clip.fadeOutFrames,
  } as ImageClipData;
});

// Separate sequential clips (video/image) from overlay clips (emoji)
const TIMELINE_DATA = ALL_CLIPS.filter((c) => c.type !== "emoji") as (VideoClipData | ImageClipData)[];
const EMOJI_OVERLAYS = ALL_CLIPS.filter((c) => c.type === "emoji") as EmojiClipData[];

// ─── Caption style from config ───────────────────────────────────
const CAPTION_STYLE = CONFIG.captions;

// Find the video source used as audio
const AUDIO_SOURCE =
  (CONFIG.timeline.find((c) => c.type === "video" && c.isAudioSource) as any)
    ?.assetId === "video"
    ? CONFIG.assets.video
    : CONFIG.assets.video;

// ─── CONSTANTS ──────────────────────────────────────────────────
const FADE_FRAMES  = 5;
const FLASH_FRAMES = 1;

// ─── EFFECTS ────────────────────────────────────────────────────
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

const FilmGrain: React.FC = () => {
  const frame = useCurrentFrame();
  const seed  = (frame * 97) % 200;
  return (
    <AbsoluteFill
      style={{ pointerEvents: "none", zIndex: 11, opacity: 0.04, overflow: "hidden" }}
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

const CutFlash: React.FC = () => {
  const frame = useCurrentFrame();
  const flashOpacity = interpolate(
    frame,
    [0, FLASH_FRAMES, FLASH_FRAMES + 1],
    [0.15, 0.15, 0],
    { extrapolateRight: "clamp" }
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

// ─── CAPTIONS LAYER ─────────────────────────────────────────────
const CaptionsLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const s     = CAPTION_STYLE;

  const chunk = CAPTIONS.find((c) => frame >= c.startFrame && frame <= c.endFrame);
  if (!chunk) return null;

  const chunkDuration = chunk.endFrame - chunk.startFrame;
  const frameInChunk  = frame - chunk.startFrame;
  const activeWordIdx = chunk.words.findIndex(
    (w) => frame >= w.startFrame && frame < w.endFrame
  );

  const chunkEntrance = interpolate(frameInChunk, [0, 6], [18, 0], { extrapolateRight: "clamp" });
  const chunkOpacity  = interpolate(frameInChunk, [0, 5], [0, 1],  { extrapolateRight: "clamp" });
  const exitOpacity   = interpolate(
    frameInChunk,
    [chunkDuration - 4, chunkDuration],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const finalOpacity = Math.min(chunkOpacity, exitOpacity);

  return (
    <AbsoluteFill
      style={{
        zIndex: 20,
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "absolute",
        top: s.positionY,
        left: 0,
        width: "100%",
        paddingLeft:  (1080 - s.maxWidth) / 2,
        paddingRight: (1080 - s.maxWidth) / 2,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: "0 16px",
          opacity: finalOpacity,
          transform: `translateY(${chunkEntrance}px)`,
          borderRadius: 16,
        }}
      >
        {chunk.words.map((timing, i) => {
          const isActive =
            i === activeWordIdx ||
            (activeWordIdx === -1 &&
              i === chunk.words.length - 1 &&
              frame >= timing.startFrame);

          const framesSinceActive = frame - timing.startFrame;
          const wordScale = interpolate(
            framesSinceActive,
            [0, 3, 6],
            [isActive ? 0.88 : 1.0, isActive ? 1.12 : 1.0, 1.0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          return (
            <span
              key={i}
              style={{
                fontFamily: s.fontFamily,
                fontSize:   s.fontSize,
                fontWeight: 900,
                lineHeight: 1.15,
                letterSpacing: 1,
                textTransform: "uppercase",
                color: isActive ? s.activeColor : s.inactiveColor,
                textShadow: [
                  `${s.strokeWidth / 2}px 0 0 ${s.strokeColor}`,
                  `-${s.strokeWidth / 2}px 0 0 ${s.strokeColor}`,
                  `0 ${s.strokeWidth / 2}px 0 ${s.strokeColor}`,
                  `0 -${s.strokeWidth / 2}px 0 ${s.strokeColor}`,
                  `${s.strokeWidth / 3}px ${s.strokeWidth / 3}px 0 ${s.strokeColor}`,
                  `-${s.strokeWidth / 3}px ${s.strokeWidth / 3}px 0 ${s.strokeColor}`,
                  `${s.strokeWidth / 3}px -${s.strokeWidth / 3}px 0 ${s.strokeColor}`,
                  `-${s.strokeWidth / 3}px -${s.strokeWidth / 3}px 0 ${s.strokeColor}`,
                  isActive ? `0 0 40px rgba(255,230,0,0.6)` : "",
                ]
                  .filter(Boolean)
                  .join(", "),
                display: "inline-block",
                transform: `scale(${wordScale})`,
                transformOrigin: "center bottom",
                whiteSpace: "nowrap",
              }}
            >
              {timing.word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ─── VIDEO CLIP ─────────────────────────────────────────────────
const VideoClipEl: React.FC<{ clip: VideoClipData; duration: number }> = ({
  clip,
  duration,
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(
    frame,
    [0, FADE_FRAMES, duration - FADE_FRAMES, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const pushScale = interpolate(frame, [0, duration], [clip.scale, clip.scale + 0.01], {
    extrapolateRight: "clamp",
  });

  const transform = [`scale(${pushScale})`, `translateY(${clip.yOffset || 0}px)`].join(" ");

  const startFrom = clip.isMasterSync ? clip.startFrame : 0;
  const endAt     = clip.isMasterSync ? clip.startFrame + duration : duration;

  return (
    <AbsoluteFill style={{ opacity, backgroundColor: "#000" }}>
      <Video
        src={staticFile(clip.source)}
        startFrom={startFrom}
        endAt={endAt}
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover", transform }}
      />
      <Vignette />
      <FilmGrain />
      <CutFlash />
    </AbsoluteFill>
  );
};

// ─── IMAGE CLIP ─────────────────────────────────────────────────
const ImageClipEl: React.FC<{ clip: ImageClipData; duration: number }> = ({
  clip,
  duration,
}) => {
  const frame = useCurrentFrame();

  const fadeIn  = clip.fadeInFrames  ?? FADE_FRAMES;
  const fadeOut = clip.fadeOutFrames ?? FADE_FRAMES;

  const opacity = interpolate(
    frame,
    [0, fadeIn, duration - fadeOut, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const scale  = interpolate(frame, [0, duration], [clip.startScale, clip.endScale],  { extrapolateRight: "clamp" });
  const driftX = interpolate(frame, [0, duration], [0, clip.driftX],                  { extrapolateRight: "clamp" });
  const driftY = interpolate(frame, [0, duration], [0, clip.driftY],                  { extrapolateRight: "clamp" });

  const entryPulse = interpolate(frame, [0, 6, 16], [0.97, 1.04, 1.0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const overlayOpacity = clip.colorOverlay
    ? interpolate(frame, [0, 20, duration - 8, duration], [0, 1, 1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  return (
    <AbsoluteFill style={{ opacity, backgroundColor: "#000", overflow: "hidden" }}>
      <Img
        src={staticFile(clip.source)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: clip.objectPosition ?? "center center",
          transform: `scale(${scale * entryPulse}) translate(${driftX}px, ${driftY}px)`,
          transformOrigin: "center center",
        }}
      />

      {clip.colorOverlay && (
        <AbsoluteFill
          style={{
            backgroundColor: clip.colorOverlay,
            opacity: overlayOpacity,
            pointerEvents: "none",
            zIndex: 5,
            mixBlendMode: "screen",
          }}
        />
      )}

      <Vignette />
      <FilmGrain />
      <CutFlash />
    </AbsoluteFill>
  );
};

// ─── EMOJI OVERLAY ──────────────────────────────────────────────
const EmojiClipEl: React.FC<{ clip: EmojiClipData; duration: number }> = ({
  clip,
  duration,
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(
    frame,
    [0, clip.fadeInFrames, duration - clip.fadeOutFrames, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const scale = clip.scalePop
    ? interpolate(
        frame,
        [0, Math.ceil(clip.fadeInFrames / 2), clip.fadeInFrames, duration - clip.fadeOutFrames],
        [0.3, 1.25, 1.0, 1.0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : 1;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 18 }}>
      <div
        style={{
          position: "absolute",
          left:    clip.positionX,
          top:     clip.positionY,
          fontSize: clip.size,
          lineHeight: 1,
          opacity,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center center",
          userSelect: "none",
        }}
      >
        {clip.emoji}
      </div>
    </AbsoluteFill>
  );
};

// ─── ROOT COMPOSITION ───────────────────────────────────────────
export const BookTokTemplate: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Audio src={staticFile(AUDIO_SOURCE)} volume={1.0} />

      {/* Sequential video / image clips */}
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

      {/* Emoji overlays — rendered at absolute global frame positions */}
      {EMOJI_OVERLAYS.map((clip, index) => {
        const duration = clip.endFrame - clip.startFrame + 1;
        return (
          <Sequence key={`emoji-${index}`} from={clip.startFrame} durationInFrames={duration}>
            <EmojiClipEl clip={clip} duration={duration} />
          </Sequence>
        );
      })}

      <CaptionsLayer />
    </AbsoluteFill>
  );
};
