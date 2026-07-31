import { describe, expect, it } from "vitest";
import { datasetIdFromUrls, datasetStorageSuffix } from "./dataset-storage-scope";

describe("dataset storage scope", () => {
  it("uses the dataset query parameter from the Quasar URL", () => {
    expect(
      datasetIdFromUrls({
        search: "?host=auto-dig&dataset=hunter-biden",
        referrer: "https://starintel.test/quasar/?dataset=complete-corpus",
        origin: "https://starintel.test"
      })
    ).toBe("hunter-biden");
  });

  it("falls back to the same-origin Auto-Dig parent URL", () => {
    expect(
      datasetIdFromUrls({
        search: "?host=auto-dig",
        referrer: "https://starintel.test/quasar/?dataset=wef",
        origin: "https://starintel.test"
      })
    ).toBe("wef");
  });

  it("ignores a cross-origin referrer", () => {
    expect(
      datasetIdFromUrls({
        search: "?host=auto-dig",
        referrer: "https://example.test/quasar/?dataset=complete-corpus",
        origin: "https://starintel.test"
      })
    ).toBeNull();
  });

  it("creates a stable PouchDB suffix", () => {
    expect(datasetStorageSuffix(" Hunter Biden / 2026 ")).toBe("-hunter-biden-2026");
    expect(datasetStorageSuffix(null)).toBe("");
  });
});
