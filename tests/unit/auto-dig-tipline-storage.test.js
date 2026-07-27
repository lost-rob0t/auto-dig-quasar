import { describe, expect, it } from "vitest";
import { createTip } from "../../src/auto-dig/tipline/storage";

describe("Auto-Dig Tipline storage", () => {
  it("preserves tip identity across updates", () => {
    const existing = {
      _id: "auto-dig:tip:existing-tip",
      tip_id: "existing-tip",
      title: "Existing tip",
      body: "Original body",
      status: "new",
      created_at: "2026-07-27T00:00:00.000Z",
      linked_document_ids: ["document:1"],
      generated_finding_ids: []
    };

    const updated = createTip({ ...existing, status: "converted" });

    expect(updated._id).toBe(existing._id);
    expect(updated.tip_id).toBe(existing.tip_id);
    expect(updated.created_at).toBe(existing.created_at);
    expect(updated.status).toBe("converted");
  });
});
