// ─── Types ────────────────────────────────────────────────────────────────────

export interface VideoTransform {
  scale: number;
  yOffset?: number;
}

export interface ImageTransform {
  startScale: number;
  endScale: number;
  interpolation: string;
}

export interface ImageEffects {
  fadeInFrames?: number;
  fadeOutFrames?: number;
  dropShadow?: string;
  blurTransition?: boolean;
}

export interface VideoTrack {
  type: "video";
  source: string;
  startFrame: number;
  endFrame: number;
  transform: VideoTransform;
  comment?: string;
}

export interface ImageOverlayTrack {
  type: "image_overlay";
  source: string;
  startFrame: number;
  endFrame: number;
  transform: ImageTransform;
  effects?: ImageEffects;
}

export type Track = VideoTrack | ImageOverlayTrack;

export interface TimelineSection {
  section: string;
  description: string;
  tracks: Track[];
}

export interface TemplateAssets {
  [key: string]: string;
}

export interface Template {
  templateName: string;
  vitals: {
    width: number;
    height: number;
    fps: number;
    totalDurationInFrames: number;
  };
  masterAudio: {
    source: string;
    volume: number;
  };
  assets?: TemplateAssets;
  timeline: TimelineSection[];
}

// ─── Template data ────────────────────────────────────────────────────────────

export const booktokImpactTemplate: Template = {
  templateName: "booktok_impulse_purchase_edit",
  vitals: {
    width: 1080,
    height: 1920,
    fps: 30,
    totalDurationInFrames: 1710,
  },
  masterAudio: {
    source: "skandel3.mp4",
    volume: 1.0,
  },
  assets: {
    imageBroll1: "ChatGPT Image May 27, 2026, 02_46_10 AM.png",
    imageBroll2: "ChatGPT Image May 27, 2026, 02_43_13 AM.png",
    imageBroll3: "d738d789-24e3-4613-9a07-782ff830ee88.png",
  },
  timeline: [
    {
      section: "Hook (0-3s)",
      description:
        "Start ultra close-up to immediately capture focus and establish the book title.",
      tracks: [
        {
          type: "video",
          source: "ComfyUI_00016_ (1).mp4",
          startFrame: 0,
          endFrame: 90,
          transform: { scale: 1.0 },
        },
      ],
    },
    {
      section: "Introduction Break (3-6s)",
      description:
        "Cut to wide master angle to reveal the speaker's body language.",
      tracks: [
        {
          type: "video",
          source: "skandel3.mp4",
          startFrame: 91,
          endFrame: 180,
          transform: { scale: 1.0 },
        },
      ],
    },
    {
      section: "Aesthetic Reveal B-Roll (6-12s)",
      description:
        "Overlay the first aesthetic image as B-roll while keeping the narration audio running beneath it. Apply a smooth zoom-in effect to build desire.",
      tracks: [
        {
          type: "video",
          source: "skandel3.mp4",
          startFrame: 181,
          endFrame: 360,
          transform: { scale: 1.05 },
          comment: "Provides background/audio layer",
        },
        {
          type: "image_overlay",
          source: "ChatGPT Image May 27, 2026, 02_46_10 AM.png",
          startFrame: 200,
          endFrame: 340,
          transform: {
            startScale: 1.0,
            endScale: 1.12,
            interpolation: "linear",
          },
          effects: {
            fadeInFrames: 10,
            fadeOutFrames: 10,
            dropShadow: "0px 10px 30px rgba(0,0,0,0.3)",
          },
        },
      ],
    },
    {
      section: "The Plot Twist / Trope Highlight (12-18s)",
      description:
        "Cut to the close Kindle shot, then flash the second aesthetic graphic to emphasize a specific peak quote or trope.",
      tracks: [
        {
          type: "video",
          source: "sakndel1.mp4",
          startFrame: 361,
          endFrame: 540,
          transform: { scale: 1.0 },
        },
        {
          type: "image_overlay",
          source: "ChatGPT Image May 27, 2026, 02_43_13 AM.png",
          startFrame: 400,
          endFrame: 510,
          transform: {
            startScale: 1.1,
            endScale: 1.0,
            interpolation: "linear",
          },
          effects: {
            fadeInFrames: 8,
            fadeOutFrames: 8,
          },
        },
      ],
    },
    {
      section: "FOMO & Review Peak (18-24s)",
      description:
        "Punch hard into the reaction video track to show immense excitement.",
      tracks: [
        {
          type: "video",
          source: "ComfyUI_00016_ (1).mp4",
          startFrame: 541,
          endFrame: 720,
          transform: {
            scale: 1.15,
            yOffset: -50,
          },
        },
      ],
    },
    {
      section: "The 'Buy Now' Catalyst (24-45s)",
      description:
        "Bring in the final aesthetic layout during the core review pitch. This solidifies the buying intent.",
      tracks: [
        {
          type: "video",
          source: "skandel3.mp4",
          startFrame: 721,
          endFrame: 1350,
          transform: { scale: 1.0 },
        },
        {
          type: "image_overlay",
          source: "d738d789-24e3-4613-9a07-782ff830ee88.png",
          startFrame: 850,
          endFrame: 1050,
          transform: {
            startScale: 1.0,
            endScale: 1.08,
            interpolation: "linear",
          },
          effects: {
            fadeInFrames: 12,
            fadeOutFrames: 12,
            blurTransition: true,
          },
        },
      ],
    },
    {
      section: "Outro / Call to Action (45-57s)",
      description:
        "End on a strong product shot framing, encouraging viewers to check the link in the bio.",
      tracks: [
        {
          type: "video",
          source: "sakndel1.mp4",
          startFrame: 1351,
          endFrame: 1710,
          transform: { scale: 1.05 },
        },
      ],
    },
  ],
};
