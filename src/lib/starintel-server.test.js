import { afterEach, describe, expect, it, vi } from "vitest";
import { createDocument } from "starintel_doc";
import canonical from "starintel_canonical/canonical";
import {
  probeStarIntelServer,
  starIntelServerInternals,
  submitTargetToServer,
  submitLegacyTargetToServer
} from "./starintel-server";

afterEach(() => vi.unstubAllGlobals());

describe("starintel-server client", () => {
  it("normalizes server URLs and auth headers", () => {
    expect(starIntelServerInternals.serverUrl({ serverUrl: "http://localhost:5000/" }, "/")).toBe("http://localhost:5000/");
    expect(starIntelServerInternals.authorization({ serverToken: "token" })).toBe("Bearer token");
  });

  it("falls back to the legacy capability seed", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response("missing", { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        doc_spec_version: "0.7.3",
        "default-dataset": "starintel"
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    await expect(probeStarIntelServer({ serverUrl: "http://localhost:5000" })).resolves.toMatchObject({
      mode: "legacy",
      capabilities: { schemaRevision: "0.7.3", dataset: "starintel" }
    });
  });

  it("projects a historical target into the narrow authenticated 0.10.1 v1 request", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetch);
    const target = createDocument("target", {
      dataset: "test",
      data: { actor: "actor-1", target: "starintel:person:one" }
    });

    await submitTargetToServer({ serverUrl: "http://localhost:5000", serverToken: "test-token" }, target);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe("http://localhost:5000/api/v1/targets");
    const options = fetch.mock.calls[0][1];
    expect(options.headers.get("Authorization")).toBe("Bearer test-token");
    expect(options.headers.get("Idempotency-Key")).toBeNull();
    expect(options.headers.get("Content-Type")).toBe("application/json");
    expect(JSON.parse(options.body)).toEqual({
      actor: "actor-1",
      target: "starintel:person:one",
      dataset: "test",
      idempotency_key: target._id
    });
  });

  it("preserves positive scheduling delay and false recurring", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetch);
    const target = createDocument("target", {
      dataset: "test", data: {
        actor: "actor-1", target: "starintel:person:one",
        delay: 5, recurring: false, options: []
      }
    });
    await submitTargetToServer({ serverUrl: "http://localhost:5000" }, target);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      actor: "actor-1", target: "starintel:person:one", dataset: "test",
      idempotency_key: target._id, delay: 5, recurring: false
    });
  });

  it("omits historical zero delay and empty options instead of sending invalid v1 fields", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetch);
    const target = createDocument("target", {
      dataset: "test", data: { actor: "actor-1", target: "subject-1", delay: 0, options: [] }
    });
    await submitTargetToServer({ serverUrl: "http://localhost:5000" }, target);
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body).not.toHaveProperty("delay");
    expect(body).not.toHaveProperty("options");
  });

  it("rejects nonempty historical option arrays rather than inventing an object mapping", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const target = createDocument("target", {
      dataset: "test", data: {
        actor: "actor-1", target: "subject-1", options: [{ scope: "example" }]
      }
    });
    await expect(submitTargetToServer({ serverUrl: "http://localhost:5000" }, target))
      .rejects.toThrow("Nonempty legacy Target options require an explicit v1 object migration");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("never retries an invalid target command after a 422 response", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(
      JSON.stringify({ message: "invalid_target_options" }), { status: 422 }
    ));
    vi.stubGlobal("fetch", fetch);
    const target = createDocument("target", {
      dataset: "test", data: { actor: "actor-1", target: "subject-1" }
    });
    await expect(submitTargetToServer({ serverUrl: "http://localhost:5000" }, target))
      .rejects.toThrow("invalid_target_options");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("never downgrades v1 capability discovery on an authentication rejection", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "not found" }), { status: 401 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    await expect(probeStarIntelServer({ serverUrl: "http://localhost:5000" }))
      .rejects.toThrow("not found");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("never downgrades capability discovery on network errors", async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new TypeError("connection refused"))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    await expect(probeStarIntelServer({ serverUrl: "http://localhost:5000" }))
      .rejects.toThrow("connection refused");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("never resubmits rejected targets on a misleading 403 or 500 body", async () => {
    for (const status of [403, 500]) {
      const fetch = vi.fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ message: "404 not found" }), { status }))
        .mockResolvedValueOnce(new Response("{}", { status: 202 }));
      vi.stubGlobal("fetch", fetch);
      const target = createDocument("target", {
        dataset: "test", data: { actor: "actor-1", target: "subject-1" }
      });
      await expect(submitTargetToServer({ serverUrl: "http://localhost:5000" }, target))
        .rejects.toThrow("404 not found");
      expect(fetch).toHaveBeenCalledTimes(1);
    }
  });

  it("preserves explicit 404 compatibility even when the body says something else", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "different wording" }), { status: 404 }))
      .mockResolvedValueOnce(new Response("{}", { status: 202 }));
    vi.stubGlobal("fetch", fetch);
    const target = createDocument("target", {
      dataset: "test", data: { actor: "actor-1", target: "subject-1" }
    });
    await expect(submitTargetToServer({ serverUrl: "http://localhost:5000" }, target))
      .resolves.toEqual({});
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][0]).toBe("http://localhost:5000/new/target/actor-1");
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual(target);
  });
});

describe("canonical Target scheduling", () => {
  const configuration = { serverUrl: "http://localhost:5000" };
  const target = () => canonical.createDocument("target", {
    id: "target:quasar-contract",
    dataset: "test",
    actor: "actor-1",
    target: "subject-1",
    options: { enabled: false, empty: null, nested: { values: ["x", 1] } },
    delay: 5,
    recurring: false
  });

  it("uses canonical top-level fields and the server body idempotency contract", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{"status":"accepted","target_id":"target:server-owned"}', { status: 202 }));
    vi.stubGlobal("fetch", fetch);
    const document = target();
    const before = canonical.stringifyJson(document);
    await expect(submitTargetToServer(configuration, document)).resolves.toMatchObject({
      status: "accepted", target_id: "target:server-owned"
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe("http://localhost:5000/api/v1/targets");
    const request = fetch.mock.calls[0][1];
    expect(request.headers.get("Idempotency-Key")).toBe(document.id);
    expect(JSON.parse(request.body)).toEqual({
      actor: document.actor, target: document.target, dataset: document.dataset,
      idempotency_key: document.id, options: document.options,
      delay: 5, recurring: false
    });
    expect(canonical.stringifyJson(document)).toBe(before);
  });

  it("preserves exact opaque numbers through the maintained serializer", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 202 }));
    vi.stubGlobal("fetch", fetch);
    const document = canonical.parseJson('{"id":"target:exact","dataset":"test","dtype":"target","schemaVersion":"0.10.1","actor":"actor-1","target":"subject-1","options":{"number":9223372036854775808}}');
    await submitTargetToServer(configuration, document);
    expect(fetch.mock.calls[0][1].body).toContain('"number":9223372036854775808');
  });

  it.each([401, 403, 404, 422, 500])("never downgrades canonical HTTP %i to a legacy write", async (status) => {
    const fetch = vi.fn().mockResolvedValue(new Response('{"message":"404 actor not found"}', { status }));
    vi.stubGlobal("fetch", fetch);
    await expect(submitTargetToServer(configuration, target())).rejects.toThrow("actor not found");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed and mixed-version canonical documents before network access", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    for (const document of [
      { ...target(), actor: undefined },
      { ...target(), options: [] },
      { ...target(), schemaVersion: "0.9.0" },
      { ...target(), data: { actor: "shadow" } },
      { ...target(), _id: "legacy-shadow" }
    ]) {
      await expect(submitTargetToServer(configuration, document)).rejects.toThrow();
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("retains the explicitly named legacy compatibility route", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response("missing endpoint", { status: 404 }))
      .mockResolvedValueOnce(new Response("{}", { status: 202 }));
    vi.stubGlobal("fetch", fetch);
    const document = createDocument("target", {
      dataset: "test", data: { actor: "actor-1", target: "subject-1" }
    });
    await submitLegacyTargetToServer(configuration, document);
    expect(fetch.mock.calls[1][0]).toBe("http://localhost:5000/new/target/actor-1");
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual(document);
  });
});
