# Agent Zero mission: bootstrap StarIntel and finish Auto-Dig Quasar integration

You are Agent Zero operating as the lead integration engineer across the StarIntel repository ecosystem.

Your job is not merely to edit one repository. You must bootstrap a complete local StarIntel development workspace, discover and validate the actual repository state, import the Auto-Dig Quasar fork history, reconnect Auto-Dig to the fork, run the full cross-repository validation matrix, and leave the system reproducible for future agents.

Do not stop after writing plans or issues. Execute the work, create focused commits, open or update pull requests, and return verified results. Do not merge until every merge gate is satisfied.

## Primary outcome

Deliver this repository topology:

```text
lost-rob0t/quasar-ui
  Main upstream Quasar application.

lost-rob0t/auto-dig-quasar
  Auto-Dig-specific Quasar fork.
  Tracks quasar-ui while carrying isolated Auto-Dig commits on top.

lost-rob0t/starintel-gpt-auto-dig
  Auto-Dig application.
  Builds and serves the exact pinned auto-dig-quasar commit.
```

The complete Quasar UI must run inside Auto-Dig at `/quasar/`, work local-first without CouchDB, RabbitMQ, StarIntel Server, Quasar Server, or internet access, and preserve local data across reloads.

## Known integration state

Start by verifying all values against GitHub; never assume they remain current.

Expected starting points:

```text
quasar-ui integration PR:
  https://github.com/lost-rob0t/quasar-ui/pull/108

quasar-ui integration branch:
  agent/auto-dig-quasar-fork

known integration commit:
  ebf2d00c9c4a9397b0abc78a04c6069d444c50bd

known Quasar upstream base commit:
  79ae7fb424302bf7ad0771d261b8c64f97a71875

Auto-Dig integration PR:
  https://github.com/lost-rob0t/starintel-gpt-auto-dig/pull/45

Auto-Dig integration branch:
  agent/embed-auto-dig-quasar

fork setup issue:
  https://github.com/lost-rob0t/quasar-ui/issues/107
```

If a branch, PR, commit, workflow, package manager, default branch, or repository relationship differs, use the discovered value and document the difference.

## StarIntel repository inventory

Bootstrap and inspect the repositories below. Treat the first group as required. Clone support repositories only when their dependency or validation role is confirmed by manifests, lock files, ASDF systems, Nimble files, package files, CI, or source imports.

### Required application and orchestration repositories

```text
lost-rob0t/auto-dig-quasar
lost-rob0t/quasar-ui
lost-rob0t/starintel-gpt-auto-dig
lost-rob0t/starintel-auto-research
lost-rob0t/zero-forge
```

### Required schema and language implementations

```text
lost-rob0t/starintel_doc.js
lost-rob0t/starintel-doc
lost-rob0t/starintel-doc.nim
lost-rob0t/star-cl
```

### Required runtime and service repositories

```text
lost-rob0t/starintel-server
lost-rob0t/rabbit-consumers
lost-rob0t/cl-gserver
lost-rob0t/cl-couch
lost-rob0t/AsyncCouchDB2
```

### Required actor and research dependencies

```text
lost-rob0t/WhatsMyName
lost-rob0t/starRouter
lost-rob0t/star-router-cli
lost-rob0t/nextflow-recon
```

### Discovery rule

Search the `lost-rob0t` GitHub account for additional repositories referenced by:

- Git submodules;
- package manager dependencies;
- ASDF systems;
- Quicklisp or Qlot files;
- Nimble dependencies;
- Python project metadata;
- Nix flakes;
- Docker Compose files;
- GitHub Actions workflows;
- source imports;
- StarIntel manifests;
- documentation that is still referenced by active code.

Add discovered active dependencies to the generated workspace manifest. Do not automatically include archived repositories unless active code still depends on them. Mark archived or superseded repositories explicitly.

## Phase 1: bootstrap Agent Zero for StarIntel

Create a reproducible workspace root. Prefer `${STARINTEL_HOME:-$HOME/starintel}`.

Generate:

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

The bootstrap must be idempotent. Re-running it must update repositories safely rather than deleting local work.

Create or update these files in the appropriate controlling repository:

```text
scripts/bootstrap-starintel
scripts/check-starintel-workspace
starintel-workspace.json
docs/starintel-bootstrap.md
.env.example
```

The bootstrap script must:

1. Detect Linux, macOS, Nix/NixOS, and container environments.
2. Refuse to run as root unless explicitly allowed.
3. Verify Git and SSH/HTTPS access.
4. Discover actual default branches through GitHub or `git ls-remote --symref`.
5. Clone missing repositories into `$STARINTEL_HOME/repos`.
6. Fetch existing repositories without discarding local changes.
7. Record repository URL, default branch, current branch, commit, dirty state, and role in `workspace.json`.
8. Detect Node, npm, Python, uv/pip, SBCL, Roswell, Quicklisp/Qlot, Nim, SWI-Prolog, Nix, Docker, and Compose.
9. Use existing flakes, lock files, package managers, and project scripts instead of inventing replacements.
10. Install only missing project dependencies.
11. Never write secrets into tracked files.
12. Create local data/cache/log directories.
13. Run a lightweight health check for every required repository.
14. Print exact commands needed for any dependency it cannot install automatically.
15. Produce a machine-readable `bootstrap-report.json` with pass, fail, skipped, and blocked states.

Prefer a Nix flake or existing Nix development shells when present. Do not require Docker, CouchDB, RabbitMQ, or remote services for the local-first UI path. Service containers may be optional profiles for server integration tests.

## Phase 2: establish the actual fork

The `auto-dig-quasar` repository may initially be empty or contain only bootstrap metadata.

Import the full Git history from `quasar-ui`, including the integration branch from PR #108. Preserve commit ancestry. Do not copy only a snapshot.

Configure local remotes in the fork checkout:

```text
origin    -> git@github.com:lost-rob0t/auto-dig-quasar.git
upstream  -> git@github.com:lost-rob0t/quasar-ui.git
```

Requirements:

- The fork default branch must be `main`.
- `main` must contain the current upstream Quasar history plus Auto-Dig-specific commits.
- Preserve the existing Auto-Dig integration commits.
- Do not force-push established fork history.
- An initial import into an empty repository may use a controlled history-preserving bootstrap merge, but must not discard either history.
- Create a tag or immutable bootstrap reference for the first verified fork head.
- Record the exact upstream base commit in `docs/auto-dig-fork.md` and build metadata.
- Keep Auto-Dig code under `src/auto-dig/` wherever possible.

After the fork is populated, create or update a fork PR against `auto-dig-quasar/main` if additional fixes are required. PR #108 in `quasar-ui` must not become the permanent home of fork-only code. Close or mark it superseded only after the fork contains equivalent verified history.

## Phase 3: verify the Auto-Dig-specific Quasar layer

The fork must retain the complete Quasar application. Do not extract the graph editor into a package.

Verify or implement:

```text
src/auto-dig/
  bridge/
  components/
  correction-reports/
  routes/
  storage/
  tipline/
```

### Host bridge

Keep the bridge narrow:

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

Do not expose arbitrary host state or fork every Quasar service abstraction.

### Local-first requirements

The embedded application must work without:

- CouchDB;
- RabbitMQ;
- StarIntel Server;
- Quasar Server;
- internet access.

Use Auto-Dig local datasets plus browser-local overlays. Preserve documents, relations, graphs, actor runs, correction reports, tips, route state, and active investigation context across reloads.

### Embedded application

Prefer the existing controlled same-origin iframe architecture unless direct mounting is now clearly safer and less fragile.

Expected routes:

```text
/quasar/       Auto-Dig-owned shell
/quasar/app/   built Quasar fork
```

Navigation must include:

```text
Research
Graph
Documents
Actors
Tipline
```

Validate message origin and source, use typed messages, block unrelated navigation, never put tokens in query parameters, and synchronize theme, route, active dataset, and active run.

### Correction reports

Expose:

- Report incorrect data
- Report bad relation
- Report missing source
- Report outdated data
- Report duplicate

From graph nodes, graph relations, document editors, relation editors, and finding detail views.

The user must see the exact final public payload before GitHub opens. Strip credentials, tokens, cookies, local paths, private fields, revisions, and local-only metadata by default. Never submit a public issue automatically.

### Tipline

Verify local creation, inbox, triage, graph linking, target conversion, starting Auto-Dig, linking findings to the originating tip, local export, and deletion. Tips must remain local unless a remote adapter is explicitly selected and the payload is confirmed.

## Phase 4: reconnect Auto-Dig to the real fork

In `starintel-gpt-auto-dig`:

1. Read the existing integration branch and PR #45.
2. Update `quasar-fork.lock.json` to the exact verified `auto-dig-quasar` commit.
3. Store both the fork commit and upstream base commit.
4. Ensure CI checks out `lost-rob0t/auto-dig-quasar`, not `quasar-ui`.
5. Build the fork with the discovered package manager and base path.
6. Copy the artifact to `/quasar/app/` through the existing build script.
7. Generate `/quasar/` host shell and typed bridge.
8. Display:

```text
Auto-Dig version
Quasar fork version
Quasar upstream base commit
StarIntel schema version
```

9. Do not silently track a moving branch.
10. Do not vendor `node_modules` or generated build output unless the existing repository policy requires it.

## Phase 5: StarIntel schema alignment

Treat the active StarIntel schema implementation as the source of truth only after verifying all language repositories.

Run the existing conformance matrix across:

```text
Python
JavaScript
Common Lisp
Nim
```

Verify:

- schema version equality;
- generated schema drift;
- fixture compatibility;
- document validation;
- relation endpoint semantics;
- research-node semantics;
- actor manifest and dataset manifest semantics;
- Auto-Dig local actor output types;
- Quasar editor compatibility.

Do not invent a `finding` dtype when the current schema uses `analysis` or another existing type. If a first-class `finding` dtype is required, create a separate schema proposal and cross-language implementation PR; do not smuggle it into this integration.

## Phase 6: actor bootstrap

Make Agent Zero able to operate StarIntel actors locally.

Create a generated actor registry from active actor manifests and code. At minimum discover and validate:

- Auto-Dig local research actor;
- browser-safe Quasar actors;
- research-node orchestration;
- WhatsMyName username lookup actor;
- StarIntel server actors when optional services are enabled.

The registry must record:

```text
actor id
repository
entry point
runtime
browser-safe or server-only
input dtypes
output dtypes
required capabilities
optional services
network requirement
cost model if applicable
validation command
```

Agent Zero must prefer local and browser-safe actors. Network actors require explicit scope and must honor project safety constraints and rate limits.

## Phase 7: upstream synchronization

Verify or repair:

```text
scripts/update-quasar-upstream
.github/workflows/auto-dig-upstream-sync.yml
docs/auto-dig-fork.md
```

The local script and scheduled workflow must:

1. Check for a clean tree.
2. Fetch origin and upstream.
3. Determine actual upstream default branch.
4. Create `sync/quasar-YYYY-MM-DD`.
5. Merge upstream without rewriting history.
6. Record the upstream commit range.
7. Run formatting, lint, type checks, tests, and Quasar build.
8. Build Auto-Dig against the candidate fork commit.
9. Run the embedded end-to-end test.
10. Open a PR with conflicts and failures clearly listed.
11. Add `upstream-sync`, `quasar`, `needs-review`, and `conflict` as appropriate.
12. Never automatically merge failed validation.
13. Never force-push or discard Auto-Dig patches.

## Phase 8: tests

Run and report the exact commands and outcomes for:

### Fork validation

- dependency installation;
- format check;
- lint;
- typecheck;
- architecture/boundary checks;
- unit tests;
- integration tests;
- production build;
- application artifact validation;
- Playwright E2E.

### Auto-Dig validation

- schema and fixture validation;
- StarIntel cross-language conformance;
- site build;
- fork artifact embedding;
- host bridge unit tests;
- full embedded E2E.

### Required embedded E2E

1. Start Auto-Dig locally.
2. Open `/quasar/`.
3. Confirm the full Quasar UI loads.
4. Load a local Auto-Dig dataset.
5. Create and edit a local document.
6. Create and edit a local relation.
7. Open the graph.
8. Run an Auto-Dig actor.
9. Receive actor findings without reload.
10. Edit a finding.
11. Review the exact correction payload.
12. Open a prefilled GitHub issue page without submitting it.
13. Create a related tip.
14. Review and convert the tip to a target.
15. Start Auto-Dig from the tip.
16. Link findings back to the tip.
17. Reload.
18. Confirm all local state remains.
19. Confirm displayed fork, upstream, Auto-Dig, and schema versions are exact.

Also test a mock upstream commit, patch preservation, conflict detection, and prevention of automatic merge when validation fails.

## Git and commit discipline

Use focused commits similar to:

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

Do not combine upstream synchronization commits with unrelated feature work. Do not rewrite public history. Do not merge red CI.

## Failure behavior

Do not loop blindly.

For every failure:

1. Capture the command, exit code, and minimal relevant log.
2. Classify it as code, environment, dependency, credential, upstream conflict, flaky test, or external service.
3. Fix code and deterministic environment failures directly.
4. Retry flaky failures once with evidence.
5. Do not disable tests or weaken security checks to get green CI.
6. Create a blocker issue only when the failure cannot be resolved within the repositories.

## Merge gates

Do not merge until all are true:

- `auto-dig-quasar` contains the preserved Quasar and Auto-Dig integration history;
- its `main` branch and remotes have the intended roles;
- the fork independently builds and passes CI;
- Auto-Dig pins an exact commit from `auto-dig-quasar`;
- Auto-Dig builds the pinned fork;
- local operation needs no external services;
- embedded bridge and E2E pass;
- correction reports show the exact payload before opening GitHub;
- tips remain local by default;
- upstream sync preserves custom patches;
- cross-language StarIntel conformance passes;
- PR dependencies are landed or correctly retargeted;
- issue #107 is resolved with evidence.

## Final report

Return:

```text
workspace root
repositories cloned or updated
repository roles and default branches
fork origin/upstream configuration
exact commits and tags
changed files by repository
commits created
PRs opened, updated, closed, or superseded
issues opened or closed
integration method
bridge design
local storage design
actor registry summary
correction-report workflow
Tipline workflow
upstream sync workflow
bootstrap commands
all test and build commands
pass/fail/skipped results
conflicts encountered
remaining blockers
merge recommendation
```

Be precise. Distinguish verified results from inferred state. Do not claim success for skipped tests.