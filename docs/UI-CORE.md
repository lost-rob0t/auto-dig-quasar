# Auto-Dig Quasar UI core

Auto-Dig keeps its specialized Research, Actors, Tipline, and About surfaces while using the same Quasar shell architecture as the canonical and standalone editions.

```text
Quasar UI core
    |
    +-- standalone browser adapter
    +-- Common Lisp Quasar control-plane adapter
    +-- Auto-Dig adapter
```

## Invariants

- One global black/gold Quasar shell is used across every Auto-Dig route.
- Exactly one primary navigation item is active.
- `/datasets` is a first-class corpus surface.
- Graph controls, inspector, workspace tabs, and agent dock live inside the content workspace and never replace the global shell.
- Desktop and mobile consume one route model.
- Runtime health is summarized in one status center instead of duplicated DB/API/queue badges.
- Auto-Dig-specific actors, corrections, tipline behavior, and host embedding remain separate capabilities; the shared shell does not weaken those boundaries.
- DOM-mirroring `OperatorUiEnhancer` is not part of application startup. Native React graph controls remain authoritative.

The UI-core CSS is loaded after legacy feature styling so shell geometry, navigation, and route consistency remain authoritative while individual feature internals continue to migrate.
