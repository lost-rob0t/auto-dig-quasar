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

  it("submits a v0.9 target through the v1 endpoint", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 202 }));
    vi.stubGlobal("fetch", fetch);
    const target = createDocument("target", {
      dataset: "test",
      data: { actor: "actor-1", target: "starintel:person:one" }
    });

    await submitTargetToServer({ serverUrl: "http://localhost:5000" }, target);

    expect(fetch.mock.calls[0][0]).toBe("http://localhost:5000/api/v1/targets");
    expect(fetch.mock.calls[0][1].headers.get("Idempotency-Key")).toBe(target._id);
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
  });
});
