# Auto-Dig Quasar fork

## Repository roles

- `lost-rob0t/quasar-ui`: upstream Quasar.
- `lost-rob0t/auto-dig-quasar`: Auto-Dig fork. This repository must use `origin` for the fork and `upstream` for `quasar-ui`.
- `lost-rob0t/starintel-gpt-auto-dig`: Auto-Dig host and static-site build.

The fork stays a complete Quasar application. Auto-Dig-specific code is isolated under `src/auto-dig/`. The graph editor is not extracted.

## Required remotes

```bash
git remote set-url origin git@github.com:lost-rob0t/auto-dig-quasar.git
git remote add upstream git@github.com:lost-rob0t/quasar-ui.git
git fetch --all --prune
```

The fork default branch is `main`. Auto-Dig commits remain on top of merge commits from `upstream/main`; history is never rewritten by automation.

## How Auto-Dig consumes the fork

Auto-Dig pins an exact fork commit in `quasar-fork.lock.json`. Its build checks out that commit, builds with `VITE_BASE_PATH=/quasar/app/`, and copies the resulting `dist/` into the generated site. Auto-Dig serves a controlled same-origin shell at `/quasar/` and the complete Quasar SPA at `/quasar/app/`.

A same-origin iframe is used because Auto-Dig is a Python-generated static site and Quasar is a Vite/React application. Direct mounting would create two build systems and duplicate dependency ownership. The iframe is sandboxed, validates message origins, uses typed messages, blocks unrelated navigation, and exposes only `AutoDigQuasarBridge`.

## Environment

```text
VITE_BASE_PATH=/quasar/app/
VITE_AUTODIG_CORRECTION_REPO=lost-rob0t/starintel-gpt-auto-dig
VITE_QUASAR_FORK_COMMIT=<exact fork SHA>
VITE_QUASAR_UPSTREAM_COMMIT=<exact upstream SHA>
VITE_AUTODIG_VERSION=<Auto-Dig version>
VITE_STARINTEL_SCHEMA_VERSION=0.9.0
AUTO_DIG_DIR=../starintel-gpt-auto-dig
```

No CouchDB, RabbitMQ, StarIntel Server, Quasar Server, or network connection is required. Quasar retains PouchDB for its own offline cache while the bridge mirrors Auto-Dig local state.

## Build

```bash
npm ci
VITE_BASE_PATH=/quasar/app/ npm run build
python3 ../starintel-gpt-auto-dig/scripts/build-auto-dig-quasar.py \
  --auto-dig-root ../starintel-gpt-auto-dig \
  --quasar-dist dist \
  --quasar-fork-commit "$(git rev-parse HEAD)" \
  --quasar-upstream-commit "$(git rev-parse upstream/main)"
```

## Upstream update

```bash
scripts/update-quasar-upstream
```

The script requires a clean tree, fetches both remotes, creates `sync/quasar-YYYY-MM-DD`, merges upstream, runs Quasar validation, builds the fork, builds Auto-Dig with that artifact, and stops on conflicts or failed validation. It never pushes, force-pushes, rebases published fork commits, or discards custom changes.

## Fork modules

```text
src/auto-dig/bridge/                 typed same-origin host bridge
src/auto-dig/components/             runtime and actor integration
src/auto-dig/correction-reports/     local report review and GitHub issue handoff
src/auto-dig/tipline/                local tip inbox and triage
src/auto-dig/auto-dig.css            fork-only presentation
```

Generic upstream files changed directly:

- `src/app/main.tsx`: installs bridge providers and disables service-worker registration inside the host frame.
- `src/App.jsx`: adds Auto-Dig navigation, Tipline/Actors routes, and version metadata.
- `src/components/GraphContextRadialBridge.jsx`: injects correction actions into graph node and relation menus.

Keep each direct patch small and in a dedicated `auto-dig:` commit.

## Recovery after a failed update

1. Stay on the generated `sync/quasar-*` branch.
2. Inspect `git diff --name-only --diff-filter=U`.
3. Resolve only the upstream conflict; do not drop `src/auto-dig/` or fork commits.
4. Run the complete validation sequence again.
5. Abort safely with `git merge --abort` when the update must be restarted.
6. Delete only the failed sync branch after preserving any useful conflict notes.

## Test inside Auto-Dig

1. Build Quasar with `/quasar/app/` as its base path.
2. Generate the Auto-Dig site and embed the exact Quasar artifact.
3. Start the local Auto-Dig server.
4. Open `/quasar/?dataset=<dataset-id>`.
5. Confirm dataset load, local document/relation edits, actor findings, corrections, tips, reload persistence, and displayed fork/upstream versions.
