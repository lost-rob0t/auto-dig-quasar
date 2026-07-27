import { describe, expect, it } from "vitest";
import {
  buildCorrectionReport,
  githubIssueUrl,
  sanitizeCorrectionValue
} from "../../src/auto-dig/correction-reports/report";

describe("Auto-Dig correction reports", () => {
  it("removes private and local-only fields", () => {
    expect(
      sanitizeCorrectionValue({
        title: "ok",
        serverToken: "no",
        nested: { password: "no", value: 1 },
        _rev: "1-x"
      })
    ).toEqual({ title: "ok", nested: { value: 1 } });
  });

  it("creates an inspectable issue payload", () => {
    const report = buildCorrectionReport({
      reportType: "bad-relation",
      target: { targetId: "rel:1" },
      datasetId: "d1",
      runId: "r1"
    });
    const url = new URL(
      githubIssueUrl("lost-rob0t/starintel-gpt-auto-dig", report)
    );
    expect(url.hostname).toBe("github.com");
    expect(url.searchParams.get("body")).toContain(report.id);
  });
});
