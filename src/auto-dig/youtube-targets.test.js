import { describe, expect, it } from "vitest";
import {
  DEFAULT_YOUTUBE_PRO_TARGET_URL,
  YOUTUBE_PRO_LIVE_OPTIONS,
  createYouTubeProLiveTarget
} from "./youtube-targets";

describe("YouTube Pro live target", () => {
  it("builds the requested recurring extraction target", () => {
    const target = createYouTubeProLiveTarget({ dataset: "investigation-live" });
    const options = Object.fromEntries(
      target.data.options.map(({ key, value }) => [key, value])
    );

    expect(target.dtype).toBe("target");
    expect(target.dataset).toBe("investigation-live");
    expect(target.data.actor).toBe("youtube");
    expect(target.data.target).toBe(DEFAULT_YOUTUBE_PRO_TARGET_URL);
    expect(target.data.target_type).toBe("url");
    expect(target.data.recurring).toBe(true);
    expect(target.data.delay).toBe(300);
    expect(options).toMatchObject({
      auto_extract: true,
      extract_comments: true,
      extract_metadata: true,
      extract_frames: true,
      extract_audio: true,
      capture_seconds: 300,
      frame_interval_seconds: 30,
      max_frames: 10,
      audio_segment_seconds: 60,
      max_comments: 1000,
      sort: "new"
    });
  });

  it("returns fresh option objects and rejects non-watch urls", () => {
    const first = createYouTubeProLiveTarget();
    const second = createYouTubeProLiveTarget();

    expect(first.data.options).not.toBe(second.data.options);
    expect(first.data.options).toHaveLength(YOUTUBE_PRO_LIVE_OPTIONS.length);
    expect(() =>
      createYouTubeProLiveTarget({ url: "https://example.com/video" })
    ).toThrow(/youtube\.com\/watch/);
  });
});
