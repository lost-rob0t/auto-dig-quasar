# Auto-Dig Quasar capability boundary

`auto-dig-quasar` is the Auto-Dig specialization of the Quasar browser UI. It inherits the browser/standalone responsibilities of `quasar-ui` and adds Auto-Dig-specific presentation and host integration.

It is **not** a second Quasar runtime and it does **not** provide the complete StarIntel capability set.

```text
auto-dig-quasar / quasar-ui
  browser UI / graph renderer / Auto-Dig specialization / standalone subset
        |
        | typed commands, projections, capability discovery
        v
quasar
  canonical Common Lisp control plane/runtime
        |
        | StarIntel service APIs and adapters
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

Auto-Dig-specific UI code may provide dataset context, research-run context, review/correction/tip workflows, navigation, and presentation. Generic durable graph/document semantics remain shared with canonical Quasar.

Standalone browser operation is a bounded subset. Persistent Sento supervision, privileged host integrations, server-side ingest/storage/search, RabbitMQ routing, and external native tool services require their owning runtime/service layers.

`star-bbpd` is one concrete external service: it consumes RabbitMQ actor targets, runs Subfinder, Nmap, Httpx, Katana and DNS workflows, and publishes derived StarIntel documents, relations and events. A button or panel in Auto-Dig Quasar may invoke or display BBPD capabilities; that does not make those native tools browser implementations.

The fork must discover available runtime/service capabilities rather than assuming every deployment has every backend enabled. Missing services reduce the available capability set without breaking unrelated browser-local review or graph functionality.
