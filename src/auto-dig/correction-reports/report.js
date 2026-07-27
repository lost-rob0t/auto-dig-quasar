const PRIVATE_KEY = /(authorization|cookie|password|secret|token|private|local[_-]?path|filesystem|session|credential)/i;
const OMIT_KEYS = new Set(["_rev", "couchPassword", "serverPassword", "serverToken", "rabbitPassword"]);

export const CORRECTION_TYPES = Object.freeze([
  ["incorrect-data", "Report incorrect data"],
  ["bad-relation", "Report bad relation"],
  ["missing-source", "Report missing source"],
  ["outdated-data", "Report outdated data"],
  ["duplicate", "Report duplicate"]
]);

export function sanitizeCorrectionValue(value, key = "") {
  if (OMIT_KEYS.has(key) || PRIVATE_KEY.test(key)) return undefined;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeCorrectionValue(item)).filter((item) => item !== undefined);
  }
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value)
    .map(([childKey, childValue]) => [childKey, sanitizeCorrectionValue(childValue, childKey)])
    .filter(([, childValue]) => childValue !== undefined));
}

export function buildCorrectionReport({ reportType, target, datasetId, runId, notes = "" }) {
  const timestamp = new Date().toISOString();
  return {
    report_version: "auto-dig-correction.v1",
    id: `correction:${timestamp}:${crypto.randomUUID()}`,
    created_at: timestamp,
    report_type: reportType,
    dataset_id: datasetId || null,
    run_id: runId || null,
    target: sanitizeCorrectionValue(target),
    notes: notes.trim(),
    handling: {
      local_first: true,
      private_fields_removed: true,
      public_submission_confirmed: false
    }
  };
}

export function githubIssueUrl(repository, report) {
  const titleTarget = report.target?.targetId || report.target?.target_id || "data";
  const title = `[correction] ${report.report_type}: ${titleTarget}`;
  const body = [
    "## Correction report",
    "",
    "Review this payload before submitting. It was generated locally by Auto-Dig Quasar.",
    "",
    "```json",
    JSON.stringify(report, null, 2),
    "```"
  ].join("\n");
  return `https://github.com/${repository}/issues/new?${new URLSearchParams({ title, body }).toString()}`;
}
