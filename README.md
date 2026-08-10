# Auto-Dig Quasar UI

`auto-dig-quasar` is the **Auto-Dig specialization of the Quasar browser UI**. It is derived from `lost-rob0t/quasar-ui` and adds Auto-Dig-specific dataset, review, research-run, and host presentation behavior.

It is **not** the complete Quasar or StarIntel runtime and it is not a second canonical backend.

The full deployment is layered:

```text
auto-dig-quasar / quasar-ui
  browser UI / graph renderer / standalone subset
        |
        | typed commands, projections, capability discovery
        v
quasar
  canonical Common Lisp control plane/runtime
        |
        | StarIntel APIs and service adapters
        v
starintel-server
  persistent ingest / storage / search / routing / RabbitMQ
        |
        +-----------------------------+
        |                             |
        v                             v
star-bbpd                       other actor services
  external recon actors          collectors / analyzers / tools
```

Standalone browser mode remains useful, but it is a bounded subset. Persistent Sento supervision, privileged host execution, backend databases/search, distributed queues, long-running collectors, and external tool processes require their owning runtime/service layers.

`star-bbpd`, for example, consumes RabbitMQ actor targets, runs Subfinder, Nmap, Httpx, Katana, and DNS workflows, and publishes derived StarIntel documents and relations. Auto-Dig Quasar may submit targets and render service state/results; that does not make those scanners JavaScript/browser capabilities.

See [`docs/CAPABILITY-BOUNDARY.md`](docs/CAPABILITY-BOUNDARY.md) for the fork/runtime/service split. The [web edition and standalone roadmap](docs/ROADMAP.md) defines browser delivery scope only; it does not ban the connected Common Lisp runtime path.

## Current implementation

- strict TypeScript application entrypoint and package contracts
- React and Vite application shell
- Cytoscape investigation graph with Maltego-style selection and relationship navigation
- hierarchical canvas, node, edge, and multi-selection context menus with action search
- PouchDB canonical local corpus
- separate PouchDB workspace/settings store
- versioned CouchDB-compatible map-reduce views
- optional push, pull, one-shot, or live CouchDB replication
- optional starintel-server capability probing and target submission
- optional RabbitMQ Web STOMP ingestion into local PouchDB and the active graph
- canonical StarIntel v0.9 validation through `starintel_doc.js`
- graph-created documents and relations
- multiple saved graph workspaces with independent membership, layout, viewport, and selection
- standalone manual document adder/editor
- stable single-document routes at `/documents/:id`
- searchable/filterable table view
- single-file upload
- bulk multi-file upload
- JSON, JSONL, NDJSON, and CSV import
- save-and-open graph navigation for newly imported records
- dataset and actor manifest file resolution
- statistics dashboard
- JSONL export
- transaction-level undo and redo
- connection path finder
- opt-in custom browser actors executed in Web Workers
- persistent operator agents with editable roles and scoped memory
- OpenRouter, OpenAI, Anthropic, OpenAI-compatible, and local provider adapters
- permissioned database, graph, actor, and graph-mutation tools
- Brave web search, bounded URL extraction, and remote MCP tools
- persistent per-agent skills and MCP server assignments
- direct custom graph building from document IDs or database queries
- persisted autonomous runs with checkpoints, recovery, loop detection, budgets, and cost logs
- draggable desktop/mobile agent bubble and full run console
- runtime service worker for offline reopening
- GitHub Actions CI and Pages deployment

## Data boundary

The graph is a projection of StarIntel documents and workspace state. Browser-local storage may be authoritative for an explicitly standalone workspace, but connected migrated operations must honor canonical Quasar command/revision authority.

Quasar-only browser state includes:

- graph positions
- viewport
- selected nodes
- layout choice
- saved graph definitions and active graph
- standalone integration settings
- browser actor manifests

UI state does not redefine the StarIntel document schema. Renderer state is never the canonical backend merely because it is visible in Cytoscape.

## Routes

```text
/graph
/documents
/documents/new
/documents/:id
/documents/:id/edit
/import
/stats
/settings
/agents
```

The Pages build includes `404.html` as an SPA fallback so direct document routes remain loadable.

## Development

From a clean checkout, install the pinned dependencies and start the local application with:

```bash
npm ci && npm run dev
```

The individual validation and production commands are:

```bash
npm ci
npm run check
npm run typecheck
npm run check:boundaries
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

Node.js 22.12 or newer and the committed npm lockfile define the reproducible toolchain. `npm run check` includes strict TypeScript validation plus syntax checks for the static service-worker runtime.

Development and production builds use root hosting by default. Set `VITE_BASE_PATH` to an absolute URL path when deploying below a site root:

```bash
VITE_BASE_PATH=/quasar-ui/ npm run build
```

The TypeScript package entrypoints establish the intended dependency areas:

```text
src/app
src/core
src/storage
src/graph
src/actions
src/projections
src/integrations
src/components
src/testing
```

Existing JavaScript feature modules remain available behind those entrypoints while they are migrated incrementally; new package contracts and the browser entrypoint are type-checked with `strict: true`.

## Import conventions

- `.json`: one document, an array, or an object containing `documents`/`docs`
- `.jsonl` and `.ndjson`: one document per line
- `.csv`: common envelope columns plus `data` JSON or `data.<field>` columns
- manifests: select the manifest and referenced files in the same bulk file picker

Imports validate candidates before browser-local writes. Existing IDs are replaced only when explicitly requested or when the incoming version/date is newer according to the supported import path.

## Browser actors

Browser actors receive cloned selection and corpus data. They return declarative transform plans rather than mutating Cytoscape or storage directly. Supported browser operations remain bounded and validated through the normal mutation path.

Browser workers are not substitutes for persistent Quasar actors or external StarIntel services. Long-running, privileged, queue-driven, or native-tool capabilities belong behind the canonical runtime/service boundary.

## Agents

The floating agent bubble opens a bounded command panel from any route. The full `/agents` console manages agents, reusable roles, provider connections, structured memory, runs, tool logs, checkpoints, loop warnings, usage, and cost.

Provider and service availability should be discovered rather than inferred from the presence of a browser control.

See [Agent system](docs/AGENT_SYSTEM.md) for provider, tool, permission, state-machine, recovery, loop-detection, budget, context, and actor-generation contracts.

## StarIntel server and external services

The optional server adapter probes runtime/server capabilities before using them. Submitted targets and returned documents remain StarIntel records subject to canonical validation and service semantics.

Connected deployments may expose RabbitMQ-backed actor services, including BBPD, through typed runtime/service adapters. The browser may display controls, progress, logs, documents, and graph projections for those services without reimplementing their native execution.

The architectural rule is:

> **Auto-Dig Quasar presents and specializes the UI. Canonical Quasar and StarIntel services provide the full runtime capability set.**
