import { afterEach, describe, expect, it, vi } from "vitest";
import { createDocument } from "starintel_doc";
import {
  probeStarIntelServer,
  starIntelServerInternals,
  submitTargetToServer
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
