import { assertDocument } from "starintel_doc";

export const RESEARCH_NODE_ETYPE = "research-node";
export const RESEARCH_NODE_EXTENSION = "quasar.research";
export const RESEARCH_NODE_STATES = Object.freeze([
  "draft",
  "queued",
  "running",
  "paused",
  "blocked",
  "completed",
  "failed",
  "killed"
]);

const STATE_SET = new Set(RESEARCH_NODE_STATES);
const TRANSITIONS = Object.freeze({
  draft: new Set(["queued", "running", "killed"]),
  queued: new Set(["running", "paused", "killed"]),
  running: new Set(["paused", "blocked", "completed", "failed", "killed"]),
  paused: new Set(["queued", "running", "killed"]),
  blocked: new Set(["queued", "running", "failed", "killed"]),
  completed: new Set(["queued", "running"]),
  failed: new Set(["queued", "running", "killed"]),
  killed: new Set(["queued", "running"])
});

const DEFAULT_LIMITS = Object.freeze({
  maxDepth: 4,
  maxActorRuns: 64,
  maxRequests: 1_024,
  maxElapsedMs: 30 * 60 * 1_000,
  maxRepeatedState: 3
});

function cloneValue(value) {
  if (value === undefined) return undefined;
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function stringList(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new TypeError("Research node ID lists must be arrays");
  return [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))];
}

function positiveInteger(value, fallback, label) {
  const normalized = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(normalized) || normalized < 1) throw new TypeError(`${label} must be a positive integer`);
  return normalized;
}

function normalizeLimits(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Research node limits must be an object");
  }
  return Object.fromEntries(Object.entries(DEFAULT_LIMITS).map(([key, fallback]) => [
    key,
    positiveInteger(value[key], fallback, `Research node ${key}`)
  ]));
}

function normalizeStopConditions(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Research node stop conditions must be an object");
  }
  return {
    whenActorQueueEmpty: value.whenActorQueueEmpty !== false,
    whenNoNewDocuments: value.whenNoNewDocuments !== false,
    whenObjectiveSatisfied: value.whenObjectiveSatisfied === true,
    haltOnActorFailure: value.haltOnActorFailure === true
  };
}

function state(value) {
  const normalized = String(value || "draft").trim();
  if (!STATE_SET.has(normalized)) throw new TypeError(`Unsupported research node state: ${normalized}`);
  return normalized;
}

function extensionOf(document) {
  const extension = document?.extensions?.[RESEARCH_NODE_EXTENSION];
  if (!extension || typeof extension !== "object" || Array.isArray(extension)) {
    throw new TypeError("Research node is missing the quasar.research extension");
  }
  return extension;
}

export function isResearchNode(document) {
  return document?.dtype === "entity"
    && document?.data?.etype === RESEARCH_NODE_ETYPE
    && Boolean(document?.extensions?.[RESEARCH_NODE_EXTENSION]);
}

export function createResearchNode(input = {}) {
  const id = String(input.id || "").trim();
  const objective = String(input.objective || "").trim();
  const title = String(input.title || objective || "Research node").trim();
  const createdAt = String(input.createdAt || new Date().toISOString());
  if (!id) throw new TypeError("Research node id is required");
  if (!objective) throw new TypeError("Research node objective is required");

  return assertDocument({
    _id: id,
    dataset: String(input.dataset || "default"),
    dtype: "entity",
    schema_version: String(input.schemaVersion || "0.9.0"),
    version: 1,
    date_added: createdAt,
    date_updated: createdAt,
    title,
    summary: objective,
    sources: [],
    evidence: [],
    data: {
      name: title,
      etype: RESEARCH_NODE_ETYPE,
      status: "draft",
      objective
    },
    extensions: {
      [RESEARCH_NODE_EXTENSION]: {
        version: 1,
        status: "draft",
        objective,
        instructions: String(input.instructions || "").trim(),
        input_ids: stringList(input.inputIds),
        actor_ids: stringList(input.actorIds),
        output_ids: [],
        artifact_ids: [],
        child_ids: [],
        current_actor_id: "",
        limits: normalizeLimits(input.limits),
        stop: normalizeStopConditions(input.stop),
        counters: {
          depth: 0,
          actor_runs: 0,
          requests: 0,
          repeated_state: 0
        },
        history: [{ from: null, to: "draft", at: createdAt, message: "Research node created" }]
      }
    }
  });
}

export function normalizeResearchNode(document) {
  if (!isResearchNode(document)) throw new TypeError("Document is not a research node");
  const normalized = cloneValue(assertDocument(document));
  const extension = extensionOf(normalized);
  extension.version = positiveInteger(extension.version, 1, "Research node extension version");
  extension.status = state(extension.status || normalized.data.status);
  extension.objective = String(extension.objective || normalized.data.objective || normalized.summary || "").trim();
  if (!extension.objective) throw new TypeError("Research node objective is required");
  extension.instructions = String(extension.instructions || "").trim();
  extension.input_ids = stringList(extension.input_ids);
  extension.actor_ids = stringList(extension.actor_ids);
  extension.output_ids = stringList(extension.output_ids);
  extension.artifact_ids = stringList(extension.artifact_ids);
  extension.child_ids = stringList(extension.child_ids);
  extension.current_actor_id = String(extension.current_actor_id || "").trim();
  extension.limits = normalizeLimits(extension.limits);
  extension.stop = normalizeStopConditions(extension.stop);
  extension.counters = {
    depth: Number(extension.counters?.depth || 0),
    actor_runs: Number(extension.counters?.actor_runs || 0),
    requests: Number(extension.counters?.requests || 0),
    repeated_state: Number(extension.counters?.repeated_state || 0)
  };
  extension.history = Array.isArray(extension.history) ? extension.history.slice(-128) : [];
  normalized.data.status = extension.status;
  normalized.data.objective = extension.objective;
  normalized.summary = extension.objective;
  return normalized;
}

export function transitionResearchNode(document, nextState, options = {}) {
  const normalized = normalizeResearchNode(document);
  const extension = extensionOf(normalized);
  const from = extension.status;
  const to = state(nextState);
  if (from !== to && !TRANSITIONS[from].has(to)) {
    throw new Error(`Invalid research node transition: ${from} -> ${to}`);
  }

  const at = String(options.at || new Date().toISOString());
  extension.status = to;
  extension.current_actor_id = String(options.currentActorId ?? extension.current_actor_id ?? "").trim();
  extension.output_ids = stringList([...(extension.output_ids || []), ...stringList(options.outputIds)]);
  extension.artifact_ids = stringList([...(extension.artifact_ids || []), ...stringList(options.artifactIds)]);
  extension.child_ids = stringList([...(extension.child_ids || []), ...stringList(options.childIds)]);
  extension.counters = {
    ...extension.counters,
    ...(options.counters || {})
  };
  extension.history = [
    ...(extension.history || []),
    {
      from,
      to,
      at,
      message: String(options.message || "").trim(),
      error: options.error ? String(options.error) : ""
    }
  ].slice(-128);

  normalized.version = Number(normalized.version || 0) + 1;
  normalized.date_updated = at;
  normalized.data.status = to;
  normalized.extensions[RESEARCH_NODE_EXTENSION] = extension;
  return assertDocument(normalized);
}

export function researchNodeExecutionPlan(document) {
  const normalized = normalizeResearchNode(document);
  const extension = extensionOf(normalized);
  return {
    researchNodeId: normalized._id,
    objective: extension.objective,
    instructions: extension.instructions,
    inputIds: [...extension.input_ids],
    actorIds: [...extension.actor_ids],
    limits: cloneValue(extension.limits),
    stop: cloneValue(extension.stop)
  };
}
