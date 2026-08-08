# CS Note

CS Note is an English-first computer science teaching site built around a visual execution debugger. Algorithms are authored locally, validated in CI, and published as deterministic semantic artifacts that the site can replay through Excalidraw and debugger panels.

The first vertical slice is Tarjan's strongly connected components algorithm. It currently uses a deterministic semantic trace so the runtime contract can be tested before the GDB/MI adapter is added. LIS is the next validation slice for sequence and dynamic-programming views.

## Development

```bash
npm install
npm run dev
npm run build
```

The current site has no lesson content yet. The runtime is intentionally separate from future local authoring and CI tooling. Curated examples are read-only at the algorithm-state level; students can adjust the canvas layout and inspect or hide debugger panels.

## Direction

The stable seam is:

```text
source + observation definition
  → local debugger / deterministic generator
  → semantic artifact
  → ExecutionSession
  → Excalidraw and optional debugger projections
```

The design deliberately keeps raw debugger values, teaching concepts, derived facts, and views separate. A future contributor should be able to add an algorithm by extending a clear visualization definition rather than rewriting the website shell.
