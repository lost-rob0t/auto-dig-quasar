export function normalizeDatasetScope(value) {
  const dataset = String(value || "").trim();
  if (!dataset || dataset === "complete-corpus") return null;
  return dataset;
}

function datasetSelectionFromSearch(search = "") {
  const params = new URLSearchParams(search);
  if (!params.has("dataset")) return { present: false, dataset: null };
  return { present: true, dataset: normalizeDatasetScope(params.get("dataset")) };
}

export function datasetSelectionFromUrls({ search = "", referrer = "", origin = "" } = {}) {
  const direct = datasetSelectionFromSearch(search);
  if (direct.present) return direct;
  if (!referrer) return direct;

  try {
    const referrerUrl = new URL(referrer, origin || undefined);
    if (origin && referrerUrl.origin !== origin) return direct;
    return datasetSelectionFromSearch(referrerUrl.search);
  } catch {
    return direct;
  }
}

export function datasetScopeFromUrls(urls = {}) {
  return datasetSelectionFromUrls(urls).dataset;
}

export function urlWithDatasetScope(href, datasetId) {
  const url = new URL(href);
  const dataset = String(datasetId || "").trim();
  if (dataset) url.searchParams.set("dataset", dataset);
  else url.searchParams.delete("dataset");
  return url;
}

export function syncDatasetScopeToCurrentUrl(datasetId, runtime = {}) {
  const location = runtime.location || globalThis.location;
  const history = runtime.history || globalThis.history;
  const dispatchEvent = runtime.dispatchEvent || globalThis.dispatchEvent?.bind(globalThis);
  const createEvent = runtime.createEvent || ((state) => {
    const EventType = globalThis.PopStateEvent || globalThis.Event;
    return EventType ? new EventType("popstate", { state }) : null;
  });

  if (!location?.href || typeof history?.replaceState !== "function") return false;
  const current = new URL(location.href);
  const next = urlWithDatasetScope(current.href, datasetId);
  if (next.href === current.href) return false;

  history.replaceState(history.state, "", `${next.pathname}${next.search}${next.hash}`);
  const event = createEvent(history.state);
  if (event && typeof dispatchEvent === "function") dispatchEvent(event);
  return true;
}

export function currentDatasetSelection() {
  return datasetSelectionFromUrls({
    search: globalThis.location?.search || "",
    referrer: globalThis.document?.referrer || "",
    origin: globalThis.location?.origin || ""
  });
}

export function currentDatasetScope() {
  return currentDatasetSelection().dataset;
}

export function resolveDatasetScope(requestedDataset, selection = currentDatasetSelection()) {
  if (selection.present) return selection.dataset;
  return normalizeDatasetScope(requestedDataset);
}
