export const autoDigBuildVersion = Object.freeze({
  quasarFork: import.meta.env.VITE_QUASAR_FORK_COMMIT || "development",
  quasarUpstreamBase: import.meta.env.VITE_QUASAR_UPSTREAM_COMMIT || "unknown",
  autoDig: import.meta.env.VITE_AUTODIG_VERSION || "unknown",
  starIntelSchema: import.meta.env.VITE_STARINTEL_SCHEMA_VERSION || "0.9.0"
});
