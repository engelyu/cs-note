# Algor Note

Algor Note is an English-first computer science teaching site built around replayable algorithm execution and multiple projections. Algorithms are authored locally, validated in CI, and published as deterministic artifacts that the site can replay through Excalidraw and teaching panels.

The first two vertical slices are Tarjan's strongly connected components algorithm and Longest Increasing Subsequence. Both use deterministic semantic traces. The repository also contains imported Algorithm Visualizer-compatible command fixtures for depth-first search and red-black tree replay. Tarjan exercises graph, recursion, low-link, and SCC concepts; LIS exercises sequence, dynamic programming, predecessor links, and reconstruction.

## Development

```bash
npm install
npm run dev
npm run build
```

The current site has no lesson content yet. The runtime is intentionally separate from future local authoring and CI tooling. Curated examples are read-only at the algorithm-state level; students can adjust the canvas layout and inspect or hide teaching panels.

## Direction

The stable runtime seam is:

```text
verified command or semantic artifact
  → ExecutionSession
  → Excalidraw and optional teaching projections
```

The MVP replays verified artifacts in the browser. It does not compile source code, run a C++ debugger, inspect debugger scopes, or infer semantic state from Record Points at runtime. A future contributor should be able to add an algorithm by extending a clear visualization definition rather than rewriting the website shell; the deferred source-anchored authoring proposal is documented separately and is not required for the current runtime.
