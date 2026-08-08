# Source-Anchored Authoring Contract

## Purpose

This specification defines the smallest authoring contract for a Contributor who wants to turn a C++ algorithm into a CS Note visualization. The Contributor supplies source code, source-anchored Record Points, explicitly named input fields, and a Semantic Model that maps each captured frame to logical state.

The contract intentionally follows the familiar debugger workflow. Execution remains linear, Record Points define the replay timeline, and the Semantic Model does not discover variables, scan scopes, or create new frame boundaries.

## Observation Plan

An Observation Plan declares the candidate frame boundaries and the values that should be captured whenever execution reaches one of them.

```ts
const plan = {
  id: "tarjan-scc-observation",
  recordPoints: [
    { id: "dfs-entry", anchor: { kind: "function-entry", file: "tarjan.cpp", functionName: "dfs" } },
    { id: "low-update", anchor: { kind: "line", file: "tarjan.cpp", line: 42 } },
    { id: "return-a", anchor: { kind: "function-exit", file: "tarjan.cpp", functionName: "dfs", returnId: "return-a" } },
    { id: "return-b", anchor: { kind: "function-exit", file: "tarjan.cpp", functionName: "dfs", returnId: "return-b" } },
  ],
  inputFields: ["u", "v", "disc", "low", "onStack", "stack"],
};
```

Every time a Record Point is reached, the Observation Runtime emits one Observation Frame. If a branch is not taken, its Record Point does not emit a placeholder frame. If the same point is reached repeatedly by a loop or recursion, each hit receives its own sequence position and execution context.

An Observation Frame contains the sequence position, the Record Point identity, the resolved source anchor, the values that were available at the stop, and optional call-stack metadata. Call-stack metadata can be ignored by Semantic Models that do not need it.

## Semantic Input Contract

A Semantic Model declares the fields and optional execution-context fields it is allowed to read.

```ts
const model = {
  id: "tarjan-scc-semantic-model",
  input: {
    fields: ["u", "v", "disc", "low", "onStack", "stack"],
    contextFields: ["callStackId", "callDepth"],
  },
  mapFrame: (frame) => ({
    // Map named Observation Frame inputs to logical nodes, edges, and stack state.
  }),
};
```

The runtime filters the Observation Frame to this contract before calling `mapFrame`. A Semantic Model cannot accidentally depend on undeclared debugger values. The model maps each frame independently to logical state; Graph, Stack, Table, Timeline, and Excalidraw are projections of that state.

## Validation Rules

Record Point identifiers are unique within an Observation Plan. Observation Frame sequence positions are contiguous and follow actual hit order. Every frame references a declared Record Point and uses its source anchor. Captured values must be declared by the plan, and a Semantic Model must only request fields provided by that plan.

An Observation Plan may contain Record Points that are never reached. This is valid because Record Points describe candidate frame boundaries, not required timeline slots. CI may report zero-hit points as coverage information later, but the runtime must not create empty frames for them.

## Non-goals

This contract does not define a live C++ debugger adapter, automatic variable discovery, AST inference, lesson content, or Excalidraw editing. Those layers can be added behind the same Observation and Semantic Model interfaces.
