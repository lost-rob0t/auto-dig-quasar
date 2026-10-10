# Canonical Target server boundary

The local Quasar editor/storage model remains v0.9. Canonical server scheduling is
a separate boundary, not a claim that local graph import, storage, or editing has
migrated.

The historical `starintel_doc` pin remains unchanged. The isolated
`starintel_canonical` dependency pins the maintained JavaScript adapter at
`481fa64750c3af29a273d725389c13e793109a64`, whose generated StarLang authority
validates canonical 0.10.1 documents. Do not copy a private Target schema here.
Upgrade that pin and its lockfile together, then run the full application CI.

## Scheduling contract

`submitTargetToServer` recognizes a canonical document by its explicit
`schemaVersion` property and validates it with the canonical runtime. Invalid or
unsupported canonical versions never enter the legacy path.

The v1 server endpoint is a scheduling command, not a document ingestion API.
The request sends top-level actor, target, dataset, and body idempotency_key from
the caller's canonical id, plus options/delay/recurring when present. The maintained
serializer preserves exact opaque numbers. The server creates its own canonical
Target and returns its target_id; callers must use that receipt for server reads.
Document metadata outside those scheduling fields is not persisted by this API.
A full canonical document ingest requires a different server endpoint.

Canonical submission never falls back on HTTP or network failure: an application
404 may mean an actor is missing, rather than that v1 is unsupported.

Historical local documents use `submitLegacyTargetToServer`, retaining the
historical-to-v1 scheduling projection and HTTP-status-only compatibility fallback
from PR #52. Nonempty legacy option arrays require explicit migration; no private
mapping is invented.
New canonical callers should pass a canonical Target directly and consume the
server receipt, without saving it through v0.9 local document operations.

Server contract reference:
https://github.com/lost-rob0t/starintel-server/blob/master/source/frontends/http-target-v1.lisp
