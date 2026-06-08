export interface KenBurnsEffect {
  startScale: number;
  endScale: number;
  driftX: number;
  driftY: number;
}

export interface VideoClipConfig {
  type: "video";
  /** Always "video" — references assets.video */
  assetId: "video";
  startFrame: number;
  endFrame: number;
  scale?: number;
  yOffset?: number;
  /** true = this clip provides the master audio timeline for Whisper sync */
  isAudioSource?: boolean;
}

export interface ImageClipConfig {
  type: "image";
  /** id matching an entry in assets.broll */
  assetId: string;
  startFrame: number;
  endFrame: number;
  kenBurns: KenBurnsEffect;
  objectPosition?: string;
  colorOverlay?: string;
  fadeInFrames?: number;
  fadeOutFrames?: number;
}

export interface EmojiClipConfig {
  type: "emoji";
  /** The emoji character(s) to display, e.g. "😂" */
  emoji: string;
  /** Global composition startFrame (absolute, not relative) */
  startFrame: number;
  /** Global composition endFrame (absolute, not relative) */
  endFrame: number;
  /** Font size in px — controls emoji size */
  size?: number;
  /** CSS value for horizontal center of emoji, e.g. "25%" or "540px" */
  positionX?: string;
  /** CSS value for vertical center of emoji, e.g. "40%" or "800px" */
  positionY?: string;
  fadeInFrames?: number;
  fadeOutFrames?: number;
  /** Pop-in bounce scale animation on entry */
  scalePop?: boolean;
}

export type ClipConfig = VideoClipConfig | ImageClipConfig | EmojiClipConfig;

export interface BrollAsset {
  /** Unique key used in timeline assetId */
  id: string;
  /** Filename saved under public/  */
  filename: string;
  /** Human-readable label shown in the UI upload form */
  label: string;
}

export interface CaptionStyleConfig {
  fontFamily: string;
  fontSize: number;
  activeColor: string;
  inactiveColor: string;
  strokeColor: string;
  strokeWidth: number;
  positionY: string;
  maxWidth: number;
}

export interface ReelConfig {
  version: string;
  assets: {
    /** Filename of the video/audio source saved under public/ */
    video: string;
    /** B-roll images; order here determines upload field order in UI */
    broll: BrollAsset[];
  };
  captions: CaptionStyleConfig;
  timeline: ClipConfig[];
}
