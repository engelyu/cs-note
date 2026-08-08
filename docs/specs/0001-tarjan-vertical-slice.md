# Specification: Tarjan Vertical Slice

## Problem Statement

CS Note needs its first complete algorithm visualization slice. The current prototype can generate a small Tarjan strongly connected components trace and render it through Excalidraw, but the contract between algorithm execution, semantic state, debugger-style panels, Canvas presentation, and student-safe interaction is not yet formalized. Without that contract, future visualizations could accidentally make Excalidraw scene state the source of truth or expose editing actions that change a verified algorithm example.

The first slice must establish the reusable runtime boundary for the rest of the algorithm library. It should make Tarjan understandable as a replayable visual execution while leaving room for future locally authored debugger artifacts, additional algorithms such as LIS, and optional views that do not belong on the Canvas.

## Solution

Deliver a Tarjan strongly connected components Visualization Package for the English-first Student Runtime. The package provides one small, deterministic Scenario and a replayable Execution Session represented by ordered Execution Frames. Each frame contains semantic algorithm state, an explaining Execution Event, changed logical IDs, and a Focus Target.

The Semantic Model is the only source of truth for the algorithm. The Graph Canvas, Variables panel, Call Stack panel, Concepts panel, and Timeline are projections of the current frame. Excalidraw is used as the Canvas projection and layout surface. Students may drag, resize, and arrange Canvas objects and may toggle optional views, but they cannot edit graph membership, stack membership, discovery values, low-link values, component membership, event meaning, or algorithm-derived colors in the curated Scenario.

The first implementation may use a deterministic local Tarjan generator to produce the Semantic Artifact. It must preserve the same package and frame contract that a future local C++ debugger adapter will consume. The Student Runtime loads the artifact directly and does not compile, debug, or execute arbitrary C++.

## User Stories

1. As a student, I want to open Tarjan's strongly connected components algorithm in the Algorithms area, so that I can study a complete example in the same debugger-like workbench used by the rest of CS Note.
2. As a student, I want to choose the named "The simplest cycle" Scenario, so that I can understand the algorithm on a graph small enough to follow by hand.
3. As a student, I want to see the current frame number and event count, so that I know where I am in the Execution Session.
4. As a student, I want to step forward and backward through the Execution Frames, so that I can inspect each decision instead of watching an opaque animation.
5. As a student, I want to jump to a visible point on the execution Timeline, so that I can revisit an earlier event without replaying every frame.
6. As a student, I want each event to explain what Tarjan just did in plain English, so that the trace connects a state change to the algorithm's reasoning.
7. As a student, I want to see graph vertices and directed edges on the Canvas, so that the abstract graph remains visible while the algorithm runs.
8. As a student, I want the Canvas to show the current vertex, active edge, on-stack vertices, and completed strongly connected components with stable semantic colors, so that important relationships are visible without reading every variable.
9. As a student, I want to see discovery and low-link values for every vertex, so that I can follow how Tarjan propagates low-link information.
10. As a student, I want to inspect the DFS Call Stack, so that recursive control flow is visible as a debugger-style stack rather than implied by the Canvas alone.
11. As a student, I want to inspect named Teaching Concepts such as `onStack`, low-link, and SCC root, so that the visualization highlights the ideas the lesson is trying to teach rather than only exposing raw variables.
12. As a student, I want the event focus to identify the relevant vertex, edge, or Teaching Concept, so that the explanation, Canvas emphasis, and debugger panels can refer to one semantic target.
13. As a student, I want to hide and show optional debugger panels, so that I can reduce visual noise when a particular panel does not help my understanding.
14. As a student, I want to drag and resize graph objects on the Canvas, so that I can create a layout that is easier for me to read.
15. As a student, I want my Canvas Layout changes to remain valid while I step through the Execution Session, so that presentation preferences do not reset the algorithm trace.
16. As a student, I want Canvas Layout changes to be independent from semantic state, so that moving a node cannot change graph edges, stack membership, component membership, or any debugger value.
17. As a student, I want curated algorithm examples to be read-only with respect to algorithm state, so that I can trust that a displayed trace is still the verified example.
18. As a student, I want to see the final SCC result and an indication of the algorithm's O(V + E) complexity, so that I can connect the trace to the algorithm's conclusion and analysis.
19. As a contributor, I want a Visualization Package to declare its Scenarios, views, and runtime capabilities, so that the Student Runtime does not need algorithm-specific permission logic scattered through the workbench.
20. As a contributor, I want to define semantic frames independently from Excalidraw elements, so that the same Execution Session can support a Graph Canvas, Stack, Table, Timeline, or future view.
21. As a contributor, I want stable logical IDs for graph vertices and edges, so that Canvas Layout can survive frame changes and focus can link projections without depending on Excalidraw-generated IDs.
22. As a contributor, I want the current Tarjan generator to produce deterministic frames, so that tests and published artifacts are reproducible.
23. As a contributor, I want the artifact contract to remain compatible with a future C++ debugger adapter, so that adding GDB/MI or another debugger source does not require rewriting the Student Runtime.
24. As a contributor, I want the initial Tarjan example to be small and explicit, so that I can validate the runtime contract before adding larger graphs, arbitrary user input, or automatic semantic inference.
25. As a contributor, I want the first slice to establish conventions for later algorithms such as LIS, so that new Visualization Packages can reuse the same Execution Session, Projection, capability, and layout concepts.

## Implementation Decisions

1. The core contract consists of Visualization Package metadata, Scenario capability declarations, Execution Frames, Execution Events, Focus Targets, View Specifications, and Canvas Layout. The first implementation may store a Scenario's ordered frames directly, but it treats that sequence as an Execution Session rather than introducing a second competing source of truth.
2. Tarjan's Semantic Model contains stable vertex labels, directed edges, discovery indices, low-link values, on-stack membership, the DFS stack, completed components, the current vertex, the active edge, and the current algorithm phase. Each frame owns a snapshot so stepping backward cannot mutate a later frame.
3. Tarjan's first Scenario uses a five-vertex directed graph with the cycle A → B → C → A and the tail B → D → E. The expected final components are `{A, B, C}`, `{D}`, and `{E}`. The trace includes initialization, visits, tree edges, return propagation, a back edge, SCC roots, component popping, and completion.
4. Execution Events carry a stable ID, phase, learner-facing label, explanatory detail, and an optional Focus Target. Focus Targets identify a logical entity, event, or Teaching Concept and are the linking mechanism for future cross-projection focus behavior.
5. The Graph Canvas projection maps logical vertex and edge IDs to Excalidraw elements. Excalidraw elements carry projection metadata, but their geometry is read from and written to a separate Canvas Layout keyed by logical IDs.
6. The Canvas adapter may rebuild presentation elements when the frame changes, but it must preserve the separate Canvas Layout. User movement and resizing update only that layout. The adapter must ignore scene edits that would alter semantic values, graph membership, algorithm colors, or event state.
7. The Variables, Call Stack, Concepts, and Timeline projections read the current Execution Frame and never read Excalidraw elements. The Timeline is an optional projection of Events; the first workbench exposes the projections declared by the package and may keep Lesson content as a reserved future surface.
8. The Scenario capability declaration enables view toggling and Canvas Layout editing while disabling input editing and rerunning for the curated Tarjan Scenario. The Student Runtime must honor those capabilities rather than infer permissions from the presence of a view.
9. The runtime consumes a compact static Semantic Artifact. The deterministic generator is an authoring-time stand-in for a future debugger or verifier and must not become a requirement for Student Runtime deployment.
10. Debugger integration, C++ execution, GDB/MI transport, AST analysis, LLM semantic inference, arbitrary user-built inputs, and runtime reruns are future seams. The artifact contract must leave room for them without implementing them in this vertical slice.
11. The workbench keeps the VS Code-like shell and English UI direction from the prototype while dropping the outer application identity and unrelated legacy site structure. The product is the independent CS Note repository, not an extension of the original dsvisual application.
12. The visualization authoring model is repository-based. Contributors change clearly defined Visualization Package data and generators locally, validate their artifacts, and submit pull requests. The Student Runtime is not an online contributor editor.

## Testing Decisions

Tests verify externally observable semantic behavior at the Visualization Package and Execution Frame seam. They should not assert Excalidraw internals, generated element ordering, or React implementation details.

The Tarjan semantic tests verify that the package exposes the declared views and Scenario, that frames are replayable and independently snapshotted, that the trace contains the expected back-edge and SCC events, that the final component memberships are `{A, B, C}`, `{D}`, and `{E}`, that the final stack is empty, and that at least one event focuses a Teaching Concept. Tests also verify that the package disables input editing and rerunning while enabling view toggles and Canvas Layout editing.

The projection contract is tested through stable logical IDs and layout independence: a Canvas Layout update may change presentation geometry, but it must not change the Semantic Model represented by the current frame. A focused event must remain addressable by logical ID when the Canvas projection is rebuilt.

The project currently has no prior application test suite, so the Node test runner is the initial test harness. A later browser smoke test may verify that the packaged workbench mounts the vendored Excalidraw runtime and that the transport controls update projections, but it must remain a complement to semantic tests rather than replacing them.

## Out of Scope

This specification does not implement a live C++ compiler or debugger, a GDB/MI or DAP adapter, AST extraction, LLM-based semantic inference, automatic selection of variables, arbitrary C++ input, user-authored graph mutation, runtime reruns, online contributor authoring, lesson content, authentication, persistence of student layouts, distributed systems, or the complete library of fifty-plus visualizations.

It also does not require every future logical object to provide every possible view. A Visualization Package may choose which projections are useful for its Scenario, and panel views remain optional. The first slice does not decide the full conversion model for complex C++ containers such as vectors of structs, pairs, queues, or self-defined classes.

## Further Notes

Tarjan is the first full vertical slice because it exercises a graph, recursion, a Call Stack, a Stack-like concept, derived on-stack meaning, low-link propagation, and multiple SCC results in a compact trace. LIS is the next validation slice and should test whether the same package and projection boundaries can support sequence and dynamic-programming concepts.

The important long-term boundary is the distinction between Evidence, Teaching Concepts, Derived Facts, and Projections. A future debugger adapter may supply raw variables and call-stack frames; a visualization definition may select or combine them into concepts such as `onStack`; the Student Runtime should render the resulting Semantic Model without knowing how those facts were obtained.
