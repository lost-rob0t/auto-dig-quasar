import { assertDocument, createDocument } from "starintel_doc";

export const DEFAULT_YOUTUBE_PRO_TARGET_URL =
  "https://www.youtube.com/watch?v=DGkTWgmegfU";

export const YOUTUBE_PRO_LIVE_OPTIONS = Object.freeze([
  { key: "auto_extract", value: true },
  { key: "extract_comments", value: true },
  { key: "extract_metadata", value: true },
  { key: "extract_frames", value: true },
  { key: "extract_audio", value: true },
  { key: "capture_seconds", value: 300 },
  { key: "frame_interval_seconds", value: 30 },
  { key: "max_frames", value: 10 },
  { key: "audio_segment_seconds", value: 60 },
  { key: "max_artifact_bytes", value: 16 * 1024 * 1024 },
  { key: "max_comments", value: 1000 },
  { key: "sort", value: "new" }
]);

export function createYouTubeProLiveTarget({
  url = DEFAULT_YOUTUBE_PRO_TARGET_URL,
  dataset = "youtube-live",
  recurring = true,
  delay = 300
} = {}) {
  const target = String(url || "").trim();
  if (!/^https:\/\/(?:www\.)?youtube\.com\/watch\?/.test(target)) {
    throw new Error("YouTube Pro target requires a youtube.com/watch URL");
  }
  return assertDocument(
    createDocument("target", {
      dataset,
      title: `YouTube Pro live capture: ${target}`,
      data: {
        actor: "youtube",
        target,
        target_type: "url",
        recurring,
        delay,
        options: YOUTUBE_PRO_LIVE_OPTIONS.map((option) => ({ ...option }))
      }
    })
  );
}
