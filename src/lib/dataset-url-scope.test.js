import { describe, expect, it, vi } from "vitest";
import {
  datasetScopeFromUrls,
  datasetSelectionFromUrls,
  resolveDatasetScope,
  syncDatasetScopeToCurrentUrl,
  urlWithDatasetScope
} from "./dataset-url-scope";

describe("URL dataset scope", () => {
  it("uses the dataset parameter from Quasar's own URL", () => {
    expect(
      datasetScopeFromUrls({
        search: "?host=auto-dig&dataset=hunter-biden",
        referrer: "https://starintel.test/quasar/?dataset=wef",
        origin: "https://starintel.test"
      })
    ).toBe("hunter-biden");
  });

  it("uses the same-origin Auto-Dig parent URL inside the iframe", () => {
    expect(
      datasetScopeFromUrls({
        search: "?host=auto-dig",
        referrer: "https://starintel.test/quasar/?dataset=wef",
        origin: "https://starintel.test"
      })
    ).toBe("wef");
  });

  it("does not trust a cross-origin referrer", () => {
    expect(
      datasetSelectionFromUrls({
        search: "?host=auto-dig",
        referrer: "https://example.test/quasar/?dataset=wef",
        origin: "https://starintel.test"
      })
    ).toEqual({ present: false, dataset: null });
  });

  it("keeps complete-corpus as an explicit all-datasets view", () => {
    const selection = datasetSelectionFromUrls({
      search: "?dataset=complete-corpus",
      referrer: "https://starintel.test/quasar/?dataset=wef",
      origin: "https://starintel.test"
    });

    expect(selection).toEqual({ present: true, dataset: null });
    expect(resolveDatasetScope("palantir", selection)).toBeNull();
  });

  it("gives URL scope precedence over the dataset dropdown", () => {
    expect(resolveDatasetScope("palantir", { present: true, dataset: "wef" })).toBe("wef");
    expect(resolveDatasetScope("palantir", { present: false, dataset: null })).toBe("palantir");
  });

  it("writes the bridge dataset into the embedded Quasar URL", () => {
    const url = urlWithDatasetScope(
      "https://quasar.test/app/graph?host=auto-dig#focus",
      "hunter-biden"
    );

    expect(url.pathname).toBe("/app/graph");
    expect(url.searchParams.get("host")).toBe("auto-dig");
    expect(url.searchParams.get("dataset")).toBe("hunter-biden");
    expect(url.hash).toBe("#focus");
  });

  it("replaces browser history and emits popstate when bridge scope changes", () => {
    const replaceState = vi.fn();
    const dispatchEvent = vi.fn();
    const event = { type: "popstate" };

    expect(syncDatasetScopeToCurrentUrl("wef", {
      location: { href: "https://quasar.test/graph?host=auto-dig" },
      history: { state: { route: 1 }, replaceState },
      dispatchEvent,
      createEvent: () => event
    })).toBe(true);

    expect(replaceState).toHaveBeenCalledWith(
      { route: 1 },
      "",
      "/graph?host=auto-dig&dataset=wef"
    );
    expect(dispatchEvent).toHaveBeenCalledWith(event);
  });
});
