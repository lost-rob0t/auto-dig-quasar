import { autoDigBuildVersion } from "../../auto-dig/version";

function item(id, label, status, detail, critical = false) {
  return { id, label, status: String(status || "offline").toLowerCase(), detail: String(detail || ""), critical };
}

export const autoDigAdapter = Object.freeze({
  id: "auto-dig",
  label: `Auto-Dig ${autoDigBuildVersion.autoDig}`,
  workspaceLabel: "Auto-Dig investigation",
  embedded: false,
  standalone: true,
  pwa: true,
  capabilities: {
    localBrowserWorkspace: true,
    autoDigRuntime: true,
    tipline: true,
    actors: true
  },
  health: (state) => [
    item("runtime", "Auto-Dig runtime", "online", "Research and actor runtime available", true),
    item("couchdb", "CouchDB sync", state.syncStatus?.state, state.syncStatus?.message),
    item("server", "StarIntel Server", state.serverStatus?.state, state.serverStatus?.message),
    item("queue", "RabbitMQ", state.queueStatus?.state, state.queueStatus?.message)
  ]
});
