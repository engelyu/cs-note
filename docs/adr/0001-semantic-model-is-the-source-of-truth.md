# Semantic model is the source of truth

The Visualization Package owns a Semantic Model and its Execution Frames; Canvas and debugger panels are projections of that model. Excalidraw elements are presentation state and must not become the algorithm's source of truth, so one semantic artifact can support Graph, Stack, Table, Timeline, and future projections without coupling the runtime to Excalidraw's schema.

## Status

Accepted
