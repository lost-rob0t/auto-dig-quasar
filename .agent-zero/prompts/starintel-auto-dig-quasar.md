# Agent Zero: bootstrap StarIntel and complete Auto-Dig Quasar

You are Agent Zero, the lead integration engineer for the StarIntel ecosystem. Execute this mission end-to-end. Do not stop at planning, summaries, or issue creation. Inspect actual repository state, bootstrap your own workspace, implement missing work, run validation, publish focused commits and PRs, and return exact evidence.

## Mission

Establish and validate this repository model:

```text
lost-rob0t/quasar-ui
  Upstream Quasar application.

lost-rob0t/auto-dig-quasar
  Auto-Dig-specific Quasar fork.
  Tracks quasar-ui and carries isolated Auto-Dig commits on top.

lost-rob0t/starintel-gpt-auto-dig
  Auto-Dig application.
  Builds and embeds an exact pinned auto-dig-quasar commit.
```

The full Quasar UI must run inside Auto-Dig at `/quasar/`, remain a functional Quasar application, operate local-first, preserve local state, expose correction reporting and Tipline workflows, and update safely from upstream without copying files manually.

Do not extract the graph editor into a shared package.

## Known state to verify

Treat these as discovery hints, not unquestioned truth:

```text
Quasar integration PR: lost-rob0t/quasar-ui#108
Quasar integration branch: agent/auto-dig-quasar-fork
Known imported integration commit: ebf2d00c9c4a9397b0abc78a04c6069d444c50bd
Known upstream base: 79ae7fb424302bf7ad0771d261b8c64f97a71875
Auto-Dig integration PR: lost-rob0t/starintel-gpt-auto-dig#45
Auto-Dig branch: agent/embed-auto-dig-quasar
Previous fork blocker: lost-rob0t/quasar-ui#107
```

Discover current default branches, heads, PR dependencies, CI results, package managers, lock files, schema versions, and repository relationships before changing anything.

## Bootstrap your StarIntel workspace

Use `${STARINTEL_HOME:-$HOME/starintel}` and create:

```text
$STARINTEL_HOME/
  repos/
  data/
  cache/
  logs/
  artifacts/
  state/
  bin/
  workspace.json
  bootstrap-report.json
```

Run `scripts/bootstrap-starintel --install --validate` from `auto-dig-quasar`. Improve that script when discovery shows missing behavior. It must remain idempotent and preserve dirty worktrees.

### Required repositories

Clone, inspect, and record these repositories:

```text
lost-rob0t/auto-dig-quasar
lost-rob0t/quasar-ui
lost-rob0t/starintel-gpt-auto-dig
lost-rob0t/starintel-auto-research
lost-rob0t/zero-forge
lost-rob0t/starintel_doc.js
lost-rob0t/starintel-doc
lost-rob0t/starintel-doc.nim
lost-rob0t/star-cl
lost-rob0t/starintel-server
lost-rob0t/rabbit-consumers
lost-rob0t/cl-gserver
lost-rob0t/cl-couch
lost-rob0t/AsyncCouchDB2
lost-rob0t/WhatsMyName
```

Inspect these supporting repositories and include them when active code still references them:

```text
lost-rob0t/starRouter
lost-rob0t/star-router-cli
lost-rob0t/nextflow-recon
```

Search the owner account and active manifests for additional dependencies. Follow package files, Nix flakes, ASDF systems, Qlot/Quicklisp metadata, Nimble files, Python metadata, Git submodules, Compose files, Actions workflows, source imports, actor manifests, and dataset manifests. Mark archived or superseded repositories instead of silently depending on them.

### Toolchains

Detect and record:

```text
Git
Node 22+
npm
Python 3.11+
SBCL
Roswell
Quicklisp or Qlot
Nim
SWI-Prolog
Nix
Docker and Compose
```

Prefer existing Nix shells and lock files. Do not put secrets in tracked files. Do not require Docker, CouchDB, RabbitMQ, StarIntel Server, Quasar Server, or internet connectivity for the local UI path.

## Fork configuration

In the local `auto-dig-quasar` checkout configure:

```text
origin    -> git@github.com:lost-rob0t/auto-dig-quasar.git
upstream  -> git@github.com:lost-rob0t/quasar-ui.git
```

Verify `main` contains the imported Quasar history and Auto-Dig integration commits. Preserve commit ancestry. Never replace the fork with a disconnected snapshot. Never force-push established fork history.

Keep fork-specific code under clear boundaries:

```text
src/auto-dig/
  bridge/
  components/
  correction-reports/
  routes/
  storage/
  tipline/
```

When a generic Quasar file must be changed, keep the patch minimal, document the reason, and record it in `docs/auto-dig-fork.md`.

## Quasar inside Auto-Dig

Verify the controlled same-origin application architecture:

```text
/quasar/       Auto-Dig shell and host bridge
/quasar/app/   built Quasar fork
```

Keep the iframe approach when it remains the least fragile boundary between the Python-generated Auto-Dig site and the React/Vite Quasar application. Do not downgrade security to simplify testing.

Navigation must expose:

```text
Research
Graph
Documents
Actors
Tipline
```

Quasar must open the active Auto-Dig dataset and run context.

### Typed host bridge

Preserve this narrow API:

```ts
interface AutoDigQuasarBridge {
  getActiveDatasetId(): Promise<string | null>;
  getActiveRunId(): Promise<string | null>;
  loadDataset(datasetId: string): Promise<GraphDataset>;
  saveDocument(document: StarDocument): Promise<void>;
  saveRelation(relation: StarRelation): Promise<void>;
  saveGraph(graph: SavedGraph): Promise<void>;
  runActor(request: ActorRunRequest): Promise<ActorRun>;
  openTipline(): void;
  reportIncorrectData(target: CorrectionTarget): Promise<void>;
  subscribe(listener: (event: AutoDigEvent) => void): () => void;
}
```

Validate `event.origin` and `event.source`, use typed messages, block unrelated navigation, never place access tokens in query parameters, and synchronize theme, route, dataset, and active run. Do not expose arbitrary host APIs.

### Local storage

Use Auto-Dig local datasets plus browser-local overlays. Persist documents, relations, saved graphs, actor runs, correction reports, tips, and investigation state across reloads. Quasar may retain PouchDB internally; the host bridge may retain IndexedDB overlays. Avoid event echo loops.

## Correction reporting

Expose:

```text
Report incorrect data
Report bad relation
Report missing source
Report outdated data
Report duplicate
```

Required surfaces:

```text
Graph node context menu
Graph relation context menu
Document editor/detail
Relation editor/detail
Finding or analysis detail
```

The workflow must create a local report, recursively remove secrets and local-only fields, show the exact final public JSON, require explicit confirmation, and only then open a prefilled GitHub issue page. Never submit a public issue automatically.

Strip tokens, passwords, credentials, cookies, sessions, private fields, local paths, revisions, and local-only metadata by default.

## Tipline

Verify:

```text
local tip creation
local inbox
review and triage
link to graph data
convert to target
start Auto-Dig from tip
link generated findings back to tip
local export
local deletion
```

Tip contents remain local unless the user selects a remote adapter and confirms the exact payload. No remote adapter is enabled by default.

## Actor bootstrap

Generate an actor registry from active code and manifests. At minimum include:

```text
Auto-Dig local research actor
browser-safe Quasar actors
research-node orchestration
WhatsMyName username lookup actor
optional StarIntel server actors
```

Record actor ID, repository, entry point, runtime, browser-safe/server-only status, input dtypes, output dtypes, required capabilities, optional services, network requirement, cost model, and validation command.

Prefer local actors. Network actors require explicit scope and rate limits.

## StarIntel schema conformance

Run the active cross-language matrix across:

```text
Python
JavaScript
Common Lisp
Nim
```

Verify schema version equality, generated-schema drift, fixtures, relation endpoint semantics, research-node semantics, actor manifests, dataset manifests, local actor outputs, and Quasar editor compatibility.

Do not invent a `finding` dtype when the active schema represents findings with `analysis` or another existing type. A new dtype requires a separate cross-language schema proposal.

## Auto-Dig pin and build

In `starintel-gpt-auto-dig`:

1. Inspect PR #45 and its dependency branch.
2. Update `quasar-fork.lock.json` to the exact verified `auto-dig-quasar` commit.
3. Record the upstream base commit.
4. Ensure CI checks out `lost-rob0t/auto-dig-quasar`.
5. Build with the repository’s actual package manager and `/quasar/app/` base path.
6. Build the Auto-Dig site and copy the artifact through the existing build script.
7. Display Auto-Dig version, fork commit, upstream base, and StarIntel schema version.
8. Never track an unpinned moving branch in production.

## Upstream synchronization

Verify or repair:

```text
scripts/update-quasar-upstream
.github/workflows/auto-dig-upstream-sync.yml
docs/auto-dig-fork.md
```

The update path must check a clean tree, fetch origin/upstream, discover the upstream default branch, create `sync/quasar-YYYY-MM-DD`, merge without rewriting history, record the commit range, run all Quasar validation, build Auto-Dig against the candidate commit, run the embedded E2E, and open a review PR. Use `upstream-sync`, `quasar`, `needs-review`, and `conflict` labels. Never auto-merge failed validation.

## Required validation

### Quasar fork

Run dependency install, format check, lint, typecheck, boundary/static checks, unit tests, integration tests, production build, artifact validation, and Playwright E2E.

### Auto-Dig

Run schema/fixture validation, full StarIntel language conformance, site build, pinned fork embedding, bridge unit tests, and embedded Playwright E2E.

### Embedded E2E

1. Start Auto-Dig.
2. Open `/quasar/`.
3. Confirm the full Quasar UI loads.
4. Load a local dataset.
5. Create and edit a document.
6. Create and edit a relation.
7. Open the graph.
8. Run a local actor.
9. Receive findings without reload.
10. Edit a finding.
11. Review the exact correction payload.
12. Open the prefilled issue page without submitting.
13. Create and review a related tip.
14. Convert it to a target.
15. Start Auto-Dig from the tip.
16. Link findings back to the tip.
17. Reload.
18. Verify all local state and exact version metadata remain.

Also test a mock upstream commit, patch preservation, conflict detection, and refusal to auto-merge red validation.

## Git discipline

Use focused commits:

```text
bootstrap: add StarIntel workspace bootstrap
git: import Quasar history into Auto-Dig fork
auto-dig: add host bridge
auto-dig: add local storage adapter
auto-dig: add correction reporting
auto-dig: add tipline
auto-dig: add embedded routes
ci: validate pinned fork inside Auto-Dig
docs: document fork and StarIntel bootstrap
```

Do not mix upstream sync with feature work. Do not rewrite public history. Do not weaken tests to get green CI.

## Completion gates

Do not merge until:

- the dedicated fork contains preserved Quasar and Auto-Dig history;
- `origin` and `upstream` have the intended roles;
- the fork independently builds and passes CI;
- Auto-Dig pins an exact commit from the fork;
- Auto-Dig builds and embeds that commit;
- local operation requires no external services;
- embedded bridge and E2E pass;
- corrections show final payload before GitHub opens;
- tips remain local by default;
- upstream sync preserves fork patches;
- cross-language conformance passes;
- stacked PR dependencies are landed or retargeted;
- the old fork blocker is closed with evidence.

## Final report

Return workspace root, repositories cloned/updated, roles/default branches, remote configuration, exact commits/tags, changed files by repository, commits, PR and issue changes, integration method, bridge/storage/actor design, correction and Tipline workflows, upstream sync behavior, bootstrap commands, every validation command and result, conflicts, blockers, and merge recommendation.

Distinguish verified results from skipped or inferred state. Do not claim success for tests that did not run.
