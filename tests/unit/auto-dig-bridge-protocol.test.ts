import { AUTO_DIG_PROTOCOL, isBridgeMessage } from "../../src/auto-dig/bridge/protocol";
import { describe, expect, it } from "vitest";

describe("Auto-Dig bridge protocol", () => {
  it("accepts typed protocol messages", () => {
    expect(
      isBridgeMessage({
        protocol: AUTO_DIG_PROTOCOL,
        channel: "event",
        type: "dataset-changed"
      })
    ).toBe(true);
  });

  it("rejects unrelated messages", () => {
    expect(isBridgeMessage({ protocol: "other", channel: "event" })).toBe(false);
  });
});
