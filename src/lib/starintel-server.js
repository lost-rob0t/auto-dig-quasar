import { assertDocument } from "starintel_doc";

function serverUrl(configuration, path = "") {
  const base = String(configuration?.serverUrl || "").trim().replace(/\/+$/, "");
  if (!base) throw new Error("StarIntel server URL is required");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function authorization(configuration) {
  if (configuration?.serverToken) return `Bearer ${configuration.serverToken}`;
  if (configuration?.serverUsername) {
    return `Basic ${btoa(`${configuration.serverUsername}:${configuration.serverPassword || ""}`)}`;
  }
  return null;
}

async function request(configuration, path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");
  if (options.body != null) headers.set("Content-Type", "application/json");
  const auth = authorization(configuration);
  if (auth) headers.set("Authorization", auth);
  const response = await fetch(serverUrl(configuration, path), {
    ...options,
    headers,
    signal: options.signal || AbortSignal.timeout(10_000)
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    const message = body?.message || body?.msg || `${response.status} ${response.statusText}`;
    const failure = new Error(`StarIntel server: ${message}`);
    failure.status = response.status;
    throw failure;
  }
  return body;
}

export async function probeStarIntelServer(configuration) {
  try {
    const capabilities = await request(configuration, "/api/v1/capabilities");
    return { mode: "v1", capabilities };
  } catch (error) {
    // Downgrade only when the v1 discovery endpoint actually does not exist.
    if (error.status !== 404) throw error;
    const legacy = await request(configuration, "/");
    return {
      mode: "legacy",
      capabilities: {
        schemaRevision: legacy?.doc_spec_version || "legacy",
        dataset: legacy?.["default-dataset"] || "default",
        endpoints: {
          submitTarget: "/new/target/:actor",
          submitDocument: "/new/document/:dtype",
          search: "/search"
        }
      },
      fallbackReason: error.message
    };
  }
}

export async function submitTargetToServer(configuration, target) {
  const document = assertDocument(target);
  if (document.dtype !== "target") throw new Error("Only target documents can be submitted as targets");
  // The authenticated 0.10.1 endpoint accepts a narrow command, not a
  // historical Target document. Retain the source document for legacy fallback.
  const data = document.data || {};
  const actor = data.actor;
  if (typeof actor !== "string" || !actor.trim()) throw new Error("Target actor is required");
  if (typeof data.target !== "string" || !data.target.trim()) {
    throw new Error("Target subject is required");
  }
  if (typeof document.dataset !== "string" || !document.dataset.trim()) {
    throw new Error("Target dataset is required");
  }
  if (typeof document._id !== "string" || !document._id.trim()) {
    throw new Error("Target idempotency key is required");
  }
  const command = {
    actor,
    target: data.target,
    dataset: document.dataset,
    idempotency_key: document._id
  };
  if (data.options != null) {
    if (Array.isArray(data.options)) {
      // 0.9 permitted arbitrary arrays; 0.10.1 requires an object.
      // An empty array means no options. Never guess how to map a nonempty one.
      if (data.options.length) {
        throw new TypeError("Nonempty legacy Target options require an explicit v1 object migration");
      }
    } else if (typeof data.options === "object") {
      command.options = data.options;
    } else {
      throw new TypeError("Target options must be a JSON object");
    }
  }
  if (data.delay != null && data.delay !== 0) command.delay = data.delay;
  if (data.recurring != null) command.recurring = data.recurring;
  try {
    return await request(configuration, "/api/v1/targets", {
      method: "POST",
      body: JSON.stringify(command)
    });
  } catch (error) {
    // Never trust response text to decide whether a fallback write is allowed.
    if (error.status !== 404) throw error;
    return request(configuration, `/new/target/${encodeURIComponent(actor)}`, {
      method: "POST",
      body: JSON.stringify(document)
    });
  }
}

export const starIntelServerInternals = Object.freeze({ serverUrl, authorization });
