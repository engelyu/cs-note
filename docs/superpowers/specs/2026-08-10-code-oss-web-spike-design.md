# Code-OSS Web Static Host Spike

Status: Accepted

## Purpose

Algor Note will replace its hand-built VS Code-like outer shell with the actual Code-OSS Web workbench. The first milestone is a read-only static site deployed to GitHub Pages. A visitor opens the site, sees the Code-OSS workbench, opens the bundled Tarjan visualization, steps through its verified replay, and interacts with the Excalidraw canvas. The milestone does not edit or execute source code in the browser.

This is a bounded feasibility spike, not a commitment to maintain an indefinite Code-OSS fork. It must prove the host and deployment assumptions within five working days. If the exit criteria cannot be met without a server or invasive upstream changes, the spike stops and records the blocker before the project considers a Monaco plus VS Code services fallback.

## Product Constraints

The published application is a pure static GitHub Pages site under the repository subpath. It has no Node.js server, remote extension host, WebSocket workspace connection, authentication service, shared session, or server-side filesystem. The first release is intended for one owner and must remain comfortable for roughly ten independent concurrent visitors. Each visitor runs replay, layout, and rendering locally in the browser.

The site presents checked-in source files and verified visualization artifacts as read-only resources. Browser editing, compilation, debugger integration, arbitrary code execution, persistence back to GitHub, collaboration, and user accounts are outside this spike.

## Architecture

The spike pins one upstream Code-OSS commit and produces a browser workbench build with Algor Note branding and a GitHub Pages-aware asset base. Code-OSS owns Activity Bar, Explorer, editor groups, panels, commands, themes, workspace lifecycle, and all other shell behavior. Algor Note does not reproduce those behaviors in React.

Algor Note is contributed as a bundled browser-compatible extension. The extension has a `browser` entry point, uses browser-safe dependencies, and reads workspace resources through VS Code URI and filesystem interfaces. It contributes a read-only custom editor for `.algor.json` resources; that editor renders its UI in a webview and initially opens the bundled Tarjan package. The extension does not reach into Code-OSS internal workbench modules.

The existing Algor Note runtime remains host-neutral. Its external seam accepts a versioned Visualization Package and exposes deterministic replay state and projection data. A thin Code-OSS adapter handles editor lifecycle and messages; a thin webview adapter mounts the existing React and Excalidraw runtime. Domain modules do not import VS Code interfaces.

The current custom `src/workbench` implementation remains a temporary reference runner during the spike. It is not deleted until the Code-OSS host demonstrates semantic and interaction parity for Tarjan.

## Modules and Interfaces

The Code-OSS Distribution module pins upstream source, applies the minimum product configuration, builds browser assets, and emits a static directory. Its interface is one reproducible build command whose output can be served from an arbitrary base path.

The Algor Note Web Extension module registers the Tarjan resource and opens it. Its interface to the runtime is a versioned message contract carrying package identity, scenario identity, current replay index, layout commands, selection, and recoverable errors. The extension never interprets algorithm state.

The Visualization Runtime module validates the package, advances deterministic replay, projects teaching state, and enforces capabilities. It owns algorithm truth. Its interface remains usable by both the temporary Vite reference runner and the new Code-OSS adapter.

The Canvas Projection module derives a complete Excalidraw scene from logical replay state and separate Canvas Layout. Excalidraw changes may update geometry, viewport, and selection only. They cannot change trace position, graph membership, values, command state, or semantic colors.

## Data Flow

At build time, the repository verifies the Tarjan artifact and bundles it with the web extension. GitHub Actions builds the pinned Code-OSS distribution, the extension bundle, and the visualization webview assets, then publishes one static artifact to GitHub Pages.

At runtime, Code-OSS opens a read-only virtual workspace containing the curated Algor Note resources. The Algor Note extension opens the Tarjan visualization and sends the validated package to the editor surface. The visualization runtime advances the verified artifact into replay state. Projection modules derive panels and logical canvas objects. Canvas Layout supplies geometry, and the Excalidraw adapter renders stable elements. User layout changes travel back only to local presentation state.

The first spike may use in-memory or browser-persisted virtual files, but it must not require GitHub credentials or a remote filesystem provider.

## Static Deployment

The build must support the GitHub Pages project path rather than assume `/`. Workbench assets, extension bundles, webview resources, workers, fonts, and service workers must resolve beneath the configured base path. Service-worker scope must remain within that project path. The deployed application must not attempt to connect to a remote authority or backend server.

The deployment uses a custom GitHub Actions workflow so upstream Code-OSS compilation happens in CI and only static output is published. Build caches may accelerate repeated deployments, but the output must be reproducible from the pinned commit and lockfiles.

## Error Handling

The CI build fails when the pinned Code-OSS source cannot be reproduced, licenses or notices are missing, the Tarjan artifact is invalid, an asset escapes the configured Pages base path, or the published static output exceeds GitHub Pages' 1 GB site limit.

The browser shows a recoverable editor message when the Algor Note extension cannot load or validate its package. A visualization error must not crash the whole Code-OSS workbench. Missing optional browser storage falls back to an in-memory layout. Attempts to invoke unsupported editing or execution actions remain unavailable rather than silently failing.

## Verification

The existing `npm test` suite remains the semantic regression baseline and must continue to pass. The spike adds a reproducible Code-OSS web build check, license and third-party notice verification, and a browser smoke test against the exact GitHub Pages-style base path.

The browser smoke test verifies that the real Code-OSS Activity Bar, Explorer, editor area, panel, and Command Palette render; the bundled Algor Note extension activates; the Tarjan editor opens; all verified frames are reachable; Excalidraw mounts; a node can be moved without changing semantic state; page reload preserves the layout when browser storage is available; and no unexpected WebSocket or remote-authority request is made.

The spike is successful only when the published static artifact works from an HTTP server mounted at the repository subpath and the same artifact is deployable by GitHub Actions. Local development success at `/` alone is insufficient.

## Stop Conditions

The spike stops after five working days if a static Code-OSS build cannot open the Tarjan editor without a server, if webview or extension assets cannot reliably load from the GitHub Pages subpath, if the required solution depends on Microsoft-proprietary distribution assets or marketplace services, or if maintaining the build requires broad ongoing patches across Code-OSS internals.

When a stop condition is reached, the worktree records the failed assumption, minimal reproduction, relevant upstream issue, and estimated cost of continuing. The fallback decision is separate and does not silently replace the agreed requirement for the actual Code-OSS workbench.

## Worktree Strategy

The spike is implemented on `codex/code-oss-web-spike` from the clean handoff baseline. Code-OSS packaging, web extension scaffolding, runtime adapter work, and browser verification use disjoint commits so failed host experiments can be removed without disturbing the existing visualization runtime. Low-level implementation and verification tasks are delegated only to Luna xhigh agents. At most two Sol high agents coordinate architecture and integration, and no more than ten Luna xhigh agents are active across the project.

The uncommitted `ds2026` handoff archive in the original checkout remains untouched. Later runtime-foundation and visualization-layout worktrees start only after the spike establishes the host seam.

## Primary Sources

The host is based on the MIT-licensed [Code-OSS repository](https://github.com/microsoft/vscode) and its documented [source organization](https://github.com/microsoft/vscode/wiki/source-code-organization). Browser extension constraints follow the official [Web Extensions](https://code.visualstudio.com/api/extension-guides/web-extensions) and [Virtual Workspaces](https://code.visualstudio.com/api/extension-guides/virtual-workspaces) guides. Deployment constraints follow [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits). Excalidraw integration follows its official [integration guide](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/integration) and [imperative API](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api).
