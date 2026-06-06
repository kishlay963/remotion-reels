import { Composition } from "remotion";
import { BookTokTemplate } from "./TikTokReel";
import { BookTokImpactEdit } from "./BookTokImpactEdit";
import { TOTAL_FRAMES } from "./captions-data";

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="TikTokReel"
        component={BookTokTemplate}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="BookTokImpactEdit"
        component={BookTokImpactEdit}
        durationInFrames={1770}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
