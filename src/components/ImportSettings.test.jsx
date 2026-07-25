import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../store", () => ({ useQuasar: vi.fn() }));

import { Report } from "./ImportSettings";

describe("import report", () => {
  it("keeps per-record validation diagnostics visible after atomic rejection", () => {
    const html = renderToStaticMarkup(<Report report={{
      fileCount: 1,
      candidateCount: 2,
      saved: [],
      skipped: [],
      rolledBack: 0,
      parseErrors: [],
      errors: [{
        file: "records.jsonl",
        line: 2,
        record: 2,
        id: "starintel:relation:invalid",
        message: "must have required property predicate",
        validation: [{
          path: "/data",
          keyword: "required",
          message: "must have required property predicate"
        }]
      }]
    }} />);

    expect(html).toContain("records.jsonl");
    expect(html).toContain("line 2");
    expect(html).toContain("starintel:relation:invalid");
    expect(html).toContain("/data [required]");
    expect(html).toContain("Invalid/write errors");
  });
});
