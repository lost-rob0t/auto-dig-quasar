import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import canonical from "starintel_canonical/canonical";
import { submitTargetToServer } from "../src/lib/starintel-server.js";

// Only transport is captured. Acceptance is evaluated by the pinned server's
// real HTTP JSON parser and Target constructor in the companion Lisp program.
const fixture = canonical.parseJson('{"id":"target:quasar-server-contract","dataset":"test","dtype":"target","schemaVersion":"0.10.1","actor":"subfinder","target":"example.invalid","delay":5,"recurring":false,"options":{"enabled":false,"empty":null,"nested":{"values":["x",1]},"exact":9223372036854775808}}');
if (process.argv[2] === "emit") {
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls += 1;
    assert.equal(url, "http://contract.invalid/api/v1/targets");
    assert.equal(options.method, "POST");
    assert.equal(options.headers.get("Content-Type"), "application/json");
    writeFileSync(process.argv[3], options.body);
    return new Response("{}", { status: 202 });
  };
  await submitTargetToServer({ serverUrl: "http://contract.invalid" }, fixture);
  assert.equal(calls, 1);
} else if (process.argv[2] === "verify") {
  const document = canonical.assertDocument(canonical.parseJson(readFileSync(process.argv[3], "utf8")));
  assert.equal(document.dtype, "target");
  assert.equal(document.schemaVersion, "0.10.1");
  assert.notEqual(document.id, fixture.id);
  for (const field of ["actor", "target", "dataset", "delay", "recurring", "options"]) {
    assert.deepEqual(document[field], fixture[field], field);
  }
  assert.ok(document.extensions.schedule_id.startsWith("target-request:"));
  assert.equal(Object.hasOwn(document, "data"), false);
  assert.equal(Object.hasOwn(document, "_id"), false);
  console.log("Quasar -> server parser/Target constructor -> canonical SDK: passed");
} else {
  throw new Error("Expected emit or verify mode");
}
