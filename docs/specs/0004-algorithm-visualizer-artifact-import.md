# Algorithm Visualizer Artifact Import

Status: Accepted

## Purpose

Algor Note uses an Algorithm Visualizer-compatible tracer command stream as the first execution source for imported algorithm visualizations. The imported artifact is replayed into deterministic frames, then projected into the Excalidraw canvas and optional teaching panels.

This keeps the execution source of truth in the algorithm artifact while leaving the presentation layer open for Algor Note-specific work. The first vertical slice proves the boundary with a small depth-first-search command fixture.

## Input contract

An artifact is an ordered JSON array. Each command has a nullable `key`, a non-empty `method`, and an array of `args`. A command with `key: null` and `method: "delay"` ends the current replay frame. Its optional positive numeric argument is the source line associated with the next frame.

The importer rejects malformed command data before replay. The replayer supports the GraphTracer and LogTracer operations needed by the current teaching slice and fails explicitly for unsupported methods instead of silently producing an incomplete state.

## Projection contract

Replay state is independent from any renderer. The graph projection creates stable logical node and edge identities, while Excalidraw persistence is limited to layout edits such as position and size. Command-controlled state such as labels, colors, selection, visitation, and graph membership is restored from the replay frame whenever the frame changes.

The same replay frame may therefore support the canvas, command trace, source-line indicator, and log panel without making those views the execution source of truth.

## Scope and non-goals

This stage does not compile C++, run a debugger, inspect debugger scopes, infer semantic models, or implement Record Points and Observation Plans. It also does not copy upstream algorithm or tracer source files. A future import of upstream content requires an independent license and attribution audit for each source repository.

The next implementation stage should replace the hand-authored fixture with one real, license-cleared Algorithm Visualizer artifact and verify that the same importer and projection seams are sufficient without changing the application shell.
