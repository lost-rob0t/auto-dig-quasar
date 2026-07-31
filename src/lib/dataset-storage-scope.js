function datasetFromSearch(search = "") {
  return new URLSearchParams(search).get("dataset")?.trim() || null;
}

export function datasetIdFromUrls({ search = "", referrer = "", origin = "" } = {}) {
  const direct = datasetFromSearch(search);
  if (direct) return direct;
  if (!referrer) return null;

  try {
    const referrerUrl = new URL(referrer, origin || undefined);
    if (origin && referrerUrl.origin !== origin) return null;
    return datasetFromSearch(referrerUrl.search);
  } catch {
    return null;
  }
}

export function datasetStorageSuffix(datasetId) {
  const normalized = String(datasetId || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return normalized ? `-${normalized}` : "";
}

export function currentDatasetStorageSuffix() {
  const location = globalThis.location;
  const document = globalThis.document;
  return datasetStorageSuffix(
    datasetIdFromUrls({
      search: location?.search || "",
      referrer: document?.referrer || "",
      origin: location?.origin || ""
    })
  );
}
