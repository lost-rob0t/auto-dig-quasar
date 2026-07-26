# Research nodes

A research node is a graph-native executable investigation plan. It is not a note, a chat session, or an opaque autonomous agent.

## First representation

The first version uses an ordinary StarIntel entity:

```json
{
  "dtype": "entity",
  "data": {
    "etype": "research-node",
    "status": "draft",
    "objective": "Map an organization and the people responsible for a program."
  },
  "extensions": {
    "quasar.research": {
      "version": 1,
      "input_ids": [],
      "actor_ids": [],
      "output_ids": [],
      "artifact_ids": [],
      "child_ids": [],
      "limits": {},
      "stop": {},
      "counters": {},
      "history": []
    }
  }
}
```

This keeps the node inside the current spec-driven document and graph pipeline. A dedicated StarIntel object type can replace it later without changing the runtime contract.

## State machine

`draft -> queued -> running`

A running node may become `paused`, `blocked`, `completed`, `failed`, or `killed`. Failed, killed, completed, paused, and blocked nodes can be queued or run again. Every transition is appended to bounded history.

## Graph edges

Use explicit relations when an edge matters to traversal or provenance:

- `researches`: research node to input or target
- `uses-actor`: research node to an actor document
- `depends-on`: research node to another research node
- `produced`: research node to output document
- `spawned`: parent research node to child research node

The extension caches IDs for execution. Relations remain the graph authority.

## Execution

1. Resolve input documents and ordered actors.
2. Check depth, run, request, elapsed-time, and repeat-state limits.
3. Execute each actor through the browser actor runtime.
4. Validate returned documents and transforms.
5. Apply mutations through the existing command and undo path.
6. Link outputs and artifacts to the research node and actor run.
7. Stop when the actor queue is empty, no new documents are produced, the objective is satisfied, or a configured failure rule fires.

Actors do not receive Cytoscape or PouchDB handles.

## UI

The graph context menu can create a research node from current selection. The compact editor shows objective, inputs, actor queue, limits, and run controls. The full editor exposes stop rules and history.

State is visible on the node without hard-coding colors that override the active theme. Context actions are `run`, `pause`, `resume`, `retry`, `kill`, `inspect outputs`, and `clone`.

Selecting a research node should support a focused subgraph containing inputs, actors, outputs, artifacts, and child nodes.

## Provenance

Every actor run records:

- research node ID
- actor ID and version
- input IDs
- output IDs
- capability requests
- start and finish timestamps
- terminal state and error

Generated documents retain `quasar.actor` provenance and add the research node/run ID.
