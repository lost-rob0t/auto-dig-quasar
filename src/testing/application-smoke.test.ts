import { describe, expect, it } from "vitest";
import { createTestDocument } from "./index";

describe("TypeScript application foundation", () => {
  it("creates a canonical typed test document", () => {
    const document = createTestDocument({ _id: "test:smoke", title: "Quasar" });

    expect(document._id).toBe("test:smoke");
    expect(document.title).toBe("Quasar");
    expect(document.sources).toEqual([]);
  });
});
