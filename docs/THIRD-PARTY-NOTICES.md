# Third-Party Notices

Algor Note has not selected a license for its own source code yet. Nothing in this file grants a license to Algor Note source code; it records the third-party software and assets that are redistributed by the repository.

## Vendored Excalidraw runtime

The files under `vendor/excalidraw/` were generated or copied from the pinned `@excalidraw/excalidraw@0.18.1`, `react@19.2.8`, and `react-dom@19.2.8` packages. Their license texts are kept beside the vendored output:

| Redistributed material | License notice |
| --- | --- |
| Excalidraw bundle and CSS | [`vendor/excalidraw/LICENSE-excalidraw`](../vendor/excalidraw/LICENSE-excalidraw) — MIT, Copyright (c) 2020 Excalidraw |
| React runtime | [`vendor/excalidraw/LICENSE-react`](../vendor/excalidraw/LICENSE-react) — MIT, Copyright (c) Meta Platforms, Inc. and affiliates |
| React DOM runtime | [`vendor/excalidraw/LICENSE-react-dom`](../vendor/excalidraw/LICENSE-react-dom) — MIT, Copyright (c) Meta Platforms, Inc. and affiliates |

The generated `vendor/excalidraw/excalidraw.js` bundle retains the upstream bundled-license comments for inlined transitive dependencies. Do not strip those comments when changing the vendor generation script. The generation and compatibility details are documented in [`vendor/excalidraw/VENDOR-NOTES.md`](../vendor/excalidraw/VENDOR-NOTES.md).

## Algorithm Visualizer compatibility

Algor Note currently contains an original Algorithm Visualizer-compatible command fixture under `src/algorithmVisualizer/`; it does not vendor or copy Algorithm Visualizer source code. The command shape and replay behavior are compatible with the public project, but compatibility does not grant permission to redistribute upstream algorithm or tracer source files.

The main Algorithm Visualizer web repository publishes an MIT license. The separate `algorithm-visualizer/algorithms` and `algorithm-visualizer/tracers.cpp` repositories must be audited independently before their source files are copied into this repository. Preserve upstream attribution and license notices for any future imported content.

## Fonts

The font files under `vendor/excalidraw/fonts/` are copied from the pinned Excalidraw package distribution and are not Algor Note artwork. They must remain covered by the upstream font notices when the vendor package is updated. The current package distribution does not include one separate license file for every font family, so adding new font files or redistributing these fonts outside this Excalidraw integration requires a fresh per-family license audit.

## Direct development dependencies

The repository also uses the following direct development packages. They are installed from npm rather than vendored into the site runtime; their package metadata and the lockfile remain the version and license source of record.

| Package | Pinned version | License |
| --- | --- | --- |
| `@excalidraw/excalidraw` | `0.18.1` | MIT |
| `@types/node` | `^26.2.0` | MIT |
| `@types/react` | `19.2.14` | MIT |
| `@types/react-dom` | `19.2.3` | MIT |
| `@vitejs/plugin-react` | `6.0.2` | MIT |
| `esbuild` | `0.28.1` | MIT |
| `react` | `19.2.8` | MIT |
| `react-dom` | `19.2.8` | MIT |
| `typescript` | `5.9.3` | Apache-2.0 |
| `vite` | `8.0.13` | MIT |

The `verify:licenses` script checks that these direct packages expose license metadata, that the required vendored license files exist, and that the generated bundle still contains its bundled-license section.
