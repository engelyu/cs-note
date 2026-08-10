# Code-OSS Web Static Host Spike Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a static GitHub Pages artifact that boots the actual Code-OSS Web workbench and opens the existing Tarjan replay in a bundled read-only Algor Note custom editor.

**Architecture:** A pinned Code-OSS checkout produces the outer workbench. A browser-compatible Algor Note extension owns custom-editor lifecycle and passes a small versioned message contract to a host-neutral React/Excalidraw visualization surface. The existing Vite application remains the reference runner until the Code-OSS slice passes browser parity tests.

**Tech Stack:** Code-OSS 1.124.2 at commit `6928394f91b684055b873eecb8bc281365131f1c`, Node.js 24, TypeScript 5.9, React 19, Vite 8, Excalidraw 0.18.1, VS Code Web Extension API, Playwright Chromium, GitHub Actions, GitHub Pages.

## Global Constraints

The published site is static and mounted at `/cs-note/` with no Node.js server, remote extension host, WebSocket workspace connection, authentication, or remote filesystem.

The first slice is read-only and opens `tarjan.algor.json`; browser editing, source execution, debugger integration, GitHub writes, and collaboration are excluded.

Algorithm state comes only from the verified artifact. Excalidraw changes may persist geometry, viewport, and selection but may not mutate semantic state.

Code-OSS is pinned to the exact commit above. The build must preserve Code-OSS, extension, Excalidraw, React, font, and transitive third-party notices.

The five-working-day stop conditions in `docs/superpowers/specs/2026-08-10-code-oss-web-spike-design.md` are mandatory.

Low-level implementation and verification work uses only Luna xhigh agents. At most two Sol high coordinators and ten Luna xhigh workers may be active.

## Worktree Topology

Create `codex/code-oss-host` for Tasks 1 and 2, with write ownership limited to `code-oss/`, `scripts/code-oss/`, `.gitignore`, and host-specific tests. Create `codex/code-oss-extension` for Tasks 3 and 4, with write ownership limited to `extensions/algor-note/`, `src/codeOss/`, `src/codeOssWebview/`, and their tests. Create `codex/code-oss-web-spike` from the approved design commit, integrate both branches, then perform Tasks 5 through 7. Do not include the dirty `docs/archive/ds2026/` files from the original checkout.

## File Structure

`code-oss/upstream.json` is the only upstream pin and build-task manifest. `scripts/code-oss/config.mjs` validates that manifest and the Pages base path. `scripts/code-oss/fetch.mjs` obtains and verifies the pinned checkout. `scripts/code-oss/build.mjs` invokes upstream compilation and assembles static output. `scripts/code-oss/render-workbench.mjs` renders `workbench.html` with Algor Note product and built-in-extension configuration.

`extensions/algor-note/package.json` is the web extension manifest. `extensions/algor-note/src/extension.ts` registers the virtual filesystem and read-only custom editor. `extensions/algor-note/src/virtualWorkspace.ts` exposes bundled workspace resources without write operations. `extensions/algor-note/src/webviewHtml.ts` owns CSP-safe webview HTML. `extensions/algor-note/resources/workspace/tarjan.algor.json` is the workspace-visible package descriptor. `extensions/algor-note/esbuild.mjs` creates the single browser extension bundle required by the web extension host.

`src/codeOss/protocol.ts` owns the versioned host/webview message interface. `src/codeOssWebview/TarjanEditor.tsx` owns the shell-free Tarjan visualization. `src/codeOssWebview/main.tsx` owns webview startup and host messaging. `vite.code-oss-webview.config.ts` produces the webview assets without the custom React Workbench.

`tests/code-oss-config.test.mjs`, `tests/code-oss-protocol.test.mjs`, and `tests/code-oss-static.test.mjs` cover pure contracts. `tests/browser/code-oss-web.spec.ts` verifies the integrated browser outcome. `playwright.config.ts` runs the Pages-subpath smoke test.

---

### Task 1: Pin and validate Code-OSS

**Files:**

- Create: `code-oss/upstream.json`
- Create: `scripts/code-oss/config.mjs`
- Create: `tests/code-oss-config.test.mjs`
- Modify: `.gitignore`
- Modify: `package.json`

**Interfaces:**

- Produces: `loadCodeOssConfig(root: string): Promise<CodeOssConfig>` and `normalizePagesBase(value: string): string`
- `CodeOssConfig` is `{ repository: string; ref: string; commit: string; cacheDirectory: string; outputDirectory: string; pagesBase: string }`

- [ ] **Step 1: Write the failing configuration test**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { loadCodeOssConfig, normalizePagesBase } from "../scripts/code-oss/config.mjs";

test("Code-OSS config pins one immutable upstream commit", async () => {
  const config = await loadCodeOssConfig(process.cwd());
  assert.equal(config.ref, "1.124.2");
  assert.equal(config.commit, "6928394f91b684055b873eecb8bc281365131f1c");
  assert.equal(config.pagesBase, "/cs-note/");
});

test("Pages base is absolute and has one trailing slash", () => {
  assert.equal(normalizePagesBase("/cs-note"), "/cs-note/");
  assert.throws(() => normalizePagesBase("cs-note"), /must start with/);
  assert.throws(() => normalizePagesBase("/"), /project subpath/);
});
```

- [ ] **Step 2: Run the test and confirm the missing-module failure**

Run: `node --test tests/code-oss-config.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/code-oss/config.mjs`.

- [ ] **Step 3: Add the pinned manifest and minimal validator**

```json
{
  "repository": "https://github.com/microsoft/vscode.git",
  "ref": "1.124.2",
  "commit": "6928394f91b684055b873eecb8bc281365131f1c",
  "cacheDirectory": ".cache/code-oss/1.124.2",
  "outputDirectory": "dist/code-oss-web",
  "pagesBase": "/cs-note/"
}
```

Implement `normalizePagesBase` to reject non-absolute paths and `/`, collapse duplicate trailing slashes, and return exactly one trailing slash. Implement `loadCodeOssConfig` with `readFile`, validate all six non-empty string properties, and return absolute cache and output paths resolved from `root`.

```js
export function normalizePagesBase(value) {
  if (!value.startsWith("/")) throw new Error("Pages base must start with /");
  const normalized = `${value.replace(/\/+$/, "")}/`;
  if (normalized === "/") throw new Error("Pages base must use a project subpath");
  return normalized;
}

export async function loadCodeOssConfig(root) {
  const value = JSON.parse(await readFile(path.join(root, "code-oss/upstream.json"), "utf8"));
  for (const key of ["repository", "ref", "commit", "cacheDirectory", "outputDirectory", "pagesBase"]) {
    if (typeof value[key] !== "string" || value[key].length === 0) throw new Error(`Invalid Code-OSS config field: ${key}`);
  }
  return {
    ...value,
    pagesBase: normalizePagesBase(value.pagesBase),
    cacheDirectory: path.resolve(root, value.cacheDirectory),
    outputDirectory: path.resolve(root, value.outputDirectory),
  };
}
```

- [ ] **Step 4: Ignore generated state and add the contract test to `npm test`**

Add `.cache/code-oss/` and `dist/code-oss-web/` to `.gitignore`. Add `node --test tests/code-oss-config.test.mjs` to the existing `test` script without removing any current verifier.

- [ ] **Step 5: Run the focused and full suites**

Run: `node --test tests/code-oss-config.test.mjs`

Expected: 2 tests pass.

Run: `npm test`

Expected: existing 32 tests plus the 2 configuration tests pass.

- [ ] **Step 6: Commit the upstream contract**

```bash
git add .gitignore package.json code-oss/upstream.json scripts/code-oss/config.mjs tests/code-oss-config.test.mjs
git commit -m "build: pin Code-OSS web upstream"
```

### Task 2: Fetch, verify, and assemble the static Code-OSS workbench

**Files:**

- Create: `scripts/code-oss/fetch.mjs`
- Create: `scripts/code-oss/render-workbench.mjs`
- Create: `scripts/code-oss/build.mjs`
- Create: `tests/code-oss-static.test.mjs`
- Modify: `package.json`

**Interfaces:**

- Consumes: `loadCodeOssConfig(process.cwd())`
- Produces: `fetchCodeOss(config)`, `renderWorkbench({ template, base, extensionUri, folderUri })`, and a `build:code-oss` command that emits `dist/code-oss-web/index.html`, `out/`, `resources/`, and `extensions/algor-note/`
- Private helpers: `runCommand(command: string, args: string[], cwd: string): Promise<string>`, `exists(path: string): Promise<boolean>`, and `copyRequired(source: string, destination: string): Promise<void>`

- [ ] **Step 1: Write failing pure tests for workbench rendering**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { renderWorkbench } from "../scripts/code-oss/render-workbench.mjs";

test("workbench rendering embeds only project-subpath static URIs", () => {
  const html = renderWorkbench({
    template: '<div data-settings="{{WORKBENCH_WEB_CONFIGURATION}}"></div>',
    base: "/cs-note/",
    extensionUri: "/cs-note/extensions/algor-note/",
    folderUri: "algor-note-vfs:/workspace",
  });
  assert.match(html, /additionalBuiltinExtensions/);
  assert.match(html, /algor-note-vfs:\/workspace/);
  assert.doesNotMatch(html, /remoteAuthority/);
  assert.doesNotMatch(html, /ws:\/\//);
});
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `node --test tests/code-oss-static.test.mjs`

Expected: FAIL because `render-workbench.mjs` does not exist.

- [ ] **Step 3: Implement deterministic fetch verification**

`fetchCodeOss` must create the configured cache parent, run `git init`, add the pinned repository as `origin`, fetch exactly `config.commit` with depth one, checkout detached at `FETCH_HEAD`, and compare `git rev-parse HEAD` to `config.commit`. A mismatch throws a concrete message such as `Expected Code-OSS 6928394f91b684055b873eecb8bc281365131f1c, received 0123456789abcdef0123456789abcdef01234567` and deletes no user-owned directory.

```js
export async function fetchCodeOss(config, run = runCommand) {
  await mkdir(config.cacheDirectory, { recursive: true });
  if (!(await exists(path.join(config.cacheDirectory, ".git")))) {
    await run("git", ["init"], config.cacheDirectory);
    await run("git", ["remote", "add", "origin", config.repository], config.cacheDirectory);
  }
  await run("git", ["fetch", "--depth", "1", "origin", config.commit], config.cacheDirectory);
  await run("git", ["checkout", "--detach", "FETCH_HEAD"], config.cacheDirectory);
  const actual = (await run("git", ["rev-parse", "HEAD"], config.cacheDirectory)).trim();
  if (actual !== config.commit) throw new Error(`Expected Code-OSS ${config.commit}, received ${actual}`);
}
```

- [ ] **Step 4: Implement the static workbench renderer**

`renderWorkbench` must replace every `{{WORKBENCH_*}}` token used by the pinned template, set `additionalBuiltinExtensions` to the local Algor Note extension URI, set `folderUri` to `algor-note-vfs:/workspace`, set product names to `Algor Note`, and omit `remoteAuthority` and callback routes. Parse the generated configuration back with `JSON.parse` in the test to prevent HTML-escaping errors.

```js
const configuration = {
  folderUri,
  productConfiguration: { nameShort: "Algor Note", nameLong: "Algor Note" },
  additionalBuiltinExtensions: [{ scheme: "https", authority: "static", path: extensionUri }],
};
const encoded = escapeHtmlAttribute(JSON.stringify(configuration));
return template.replaceAll("{{WORKBENCH_WEB_CONFIGURATION}}", encoded)
  .replaceAll("{{WORKBENCH_WEB_BASE_URL}}", base);
```

- [ ] **Step 5: Implement the upstream build and assembly command**

`build.mjs` must call `fetchCodeOss`, run `npm ci`, `npm run gulp compile-build`, and `npm run gulp minify-vscode-reh-web` in the pinned checkout, then copy `resources/` and `out-vscode-reh-web-min/` to `dist/code-oss-web/resources/` and `dist/code-oss-web/out/`. It copies the rendered workbench to `index.html` and copies the built extension directory to `dist/code-oss-web/extensions/algor-note/`. Any missing expected directory is a hard failure.

```js
await fetchCodeOss(config);
await runCommand("npm", ["ci"], config.cacheDirectory);
await runCommand("npm", ["run", "gulp", "compile-build"], config.cacheDirectory);
await runCommand("npm", ["run", "gulp", "minify-vscode-reh-web"], config.cacheDirectory);
await copyRequired(path.join(config.cacheDirectory, "resources"), path.join(config.outputDirectory, "resources"));
await copyRequired(path.join(config.cacheDirectory, "out-vscode-reh-web-min"), path.join(config.outputDirectory, "out"));
await copyRequired("extensions/algor-note", path.join(config.outputDirectory, "extensions/algor-note"));
```

- [ ] **Step 6: Add scripts and run the no-network contract test**

Add `fetch:code-oss`, `build:code-oss`, and `verify:code-oss-static` scripts. The static verifier checks that generated URLs begin with `/cs-note/`, that no JavaScript or HTML file contains `remoteAuthority`, `ws://`, or `wss://`, and that total output is below 1 GB.

Run: `node --test tests/code-oss-static.test.mjs`

Expected: renderer and validation tests pass without downloading Code-OSS.

- [ ] **Step 7: Commit the host build module**

```bash
git add package.json scripts/code-oss tests/code-oss-static.test.mjs
git commit -m "build: assemble static Code-OSS workbench"
```

### Task 3: Define the extension-to-webview protocol

**Files:**

- Create: `src/codeOss/protocol.ts`
- Create: `tests/code-oss-protocol.test.mjs`
- Modify: `package.json`

**Interfaces:**

- Produces: `HostToWebviewMessage`, `WebviewToHostMessage`, `isHostToWebviewMessage(value)`, and `isWebviewToHostMessage(value)`
- Host messages: `{ version: 1; type: "open-package"; packageId: "tarjan-scc"; scenarioId: "simple-cycle"; replayIndex: number; layout: Record<string, LayoutRect> | null; selectedIds: string[] }` and `{ version: 1; type: "host-error"; message: string }`
- Webview messages: `{ version: 1; type: "ready" }`, `{ version: 1; type: "replay-changed"; replayIndex: number }`, `{ version: 1; type: "layout-changed"; layout: Record<string, LayoutRect> }`, `{ version: 1; type: "selection-changed"; selectedIds: string[] }`, and `{ version: 1; type: "webview-error"; message: string }`

- [ ] **Step 1: Write validation tests before the types**

```js
test("Code-OSS messages reject unknown versions and semantic edits", () => {
  assert.equal(isHostToWebviewMessage({ version: 1, type: "open-package", packageId: "tarjan-scc", scenarioId: "simple-cycle", replayIndex: 0, layout: null, selectedIds: [] }), true);
  assert.equal(isHostToWebviewMessage({ version: 2, type: "open-package", packageId: "tarjan-scc", scenarioId: "simple-cycle", replayIndex: 0, layout: null, selectedIds: [] }), false);
  assert.equal(isWebviewToHostMessage({ version: 1, type: "set-node-color", id: "node:A" }), false);
});
```

- [ ] **Step 2: Run the focused test and confirm the missing export**

Run: `node --experimental-strip-types --test tests/code-oss-protocol.test.mjs`

Expected: FAIL because `src/codeOss/protocol.ts` does not exist.

- [ ] **Step 3: Implement discriminated unions and structural guards**

Use exact literal `version: 1` fields. Validate every property, reject extra message types, and validate layout entries as finite numeric `x`, `y`, `width`, and `height` values with positive dimensions. Keep this module browser-safe and free of VS Code imports.

```ts
export type HostToWebviewMessage =
  | { version: 1; type: "open-package"; packageId: "tarjan-scc"; scenarioId: "simple-cycle"; replayIndex: number; layout: Record<string, LayoutRect> | null; selectedIds: string[] }
  | { version: 1; type: "host-error"; message: string };

export type WebviewToHostMessage =
  | { version: 1; type: "ready" }
  | { version: 1; type: "replay-changed"; replayIndex: number }
  | { version: 1; type: "layout-changed"; layout: Record<string, LayoutRect> }
  | { version: 1; type: "selection-changed"; selectedIds: string[] }
  | { version: 1; type: "webview-error"; message: string };

function isLayout(value: unknown): value is Record<string, LayoutRect> {
  return isRecord(value) && Object.values(value).every((rect) => isRecord(rect)
    && [rect.x, rect.y, rect.width, rect.height].every((entry) => typeof entry === "number" && Number.isFinite(entry))
    && rect.width > 0 && rect.height > 0);
}

export function isHostToWebviewMessage(value: unknown): value is HostToWebviewMessage {
  if (!isRecord(value) || value.version !== 1 || typeof value.type !== "string") return false;
  if (value.type === "host-error") return typeof value.message === "string";
  return value.type === "open-package"
    && value.packageId === "tarjan-scc"
    && value.scenarioId === "simple-cycle"
    && Number.isInteger(value.replayIndex)
    && value.replayIndex >= 0
    && (value.layout === null || isLayout(value.layout))
    && Array.isArray(value.selectedIds)
    && value.selectedIds.every((id) => typeof id === "string");
}

export function isWebviewToHostMessage(value: unknown): value is WebviewToHostMessage {
  if (!isRecord(value) || value.version !== 1 || typeof value.type !== "string") return false;
  if (value.type === "ready") return true;
  if (value.type === "replay-changed") return Number.isInteger(value.replayIndex) && value.replayIndex >= 0;
  if (value.type === "layout-changed") return isLayout(value.layout);
  if (value.type === "selection-changed") return Array.isArray(value.selectedIds) && value.selectedIds.every((id) => typeof id === "string");
  return value.type === "webview-error" && typeof value.message === "string";
}
```

Append `node --experimental-strip-types --test tests/code-oss-protocol.test.mjs` to the root `test` script after the Code-OSS configuration test.

- [ ] **Step 4: Run focused and full tests**

Run: `node --experimental-strip-types --test tests/code-oss-protocol.test.mjs`

Expected: all protocol tests pass.

Run: `npm test`

Expected: all semantic, host-config, and protocol tests pass.

- [ ] **Step 5: Commit the message seam**

```bash
git add package.json src/codeOss/protocol.ts tests/code-oss-protocol.test.mjs
git commit -m "feat: define Code-OSS visualization protocol"
```

### Task 4: Build the browser extension and shell-free Tarjan editor

**Files:**

- Create: `extensions/algor-note/package.json`
- Create: `extensions/algor-note/tsconfig.json`
- Create: `extensions/algor-note/esbuild.mjs`
- Create: `extensions/algor-note/src/extension.ts`
- Create: `extensions/algor-note/src/virtualWorkspace.ts`
- Create: `extensions/algor-note/src/webviewHtml.ts`
- Create: `extensions/algor-note/resources/workspace/tarjan.algor.json`
- Create: `extensions/algor-note/resources/workspace/tarjan.ts`
- Create: `src/codeOssWebview/index.html`
- Create: `src/codeOssWebview/main.tsx`
- Create: `src/codeOssWebview/TarjanEditor.tsx`
- Create: `src/codeOssWebview/styles.css`
- Create: `vite.code-oss-webview.config.ts`
- Create: `tests/code-oss-extension.test.mjs`
- Modify: `package.json`
- Modify: `tsconfig.node.json`

**Interfaces:**

- Consumes: protocol guards, `tarjanPackage`, `TARJAN_LAYOUT`, Tarjan projections, scene guards, and the vendored Excalidraw adapter
- Produces: web extension command `algorNote.openTarjan`, custom editor view type `algorNote.visualization`, extension bundle `dist/extension.js`, webview bundle `dist/webview/`, and `npm run verify:code-oss-extension`
- Private editor functions: `TarjanCanvas({ frame, elements, layout, initialSelectedIds, onLayout, onSelection }): JSX.Element`, `TarjanPanels({ frame, onStep }): JSX.Element`, `TransportPanel({ step, onStep }): JSX.Element`, and `ErrorPanel({ message }): JSX.Element`, extracted from the current `TarjanWorkbench` without importing the custom Workbench shell
- Private workspace functions: `metadataFor(path: string): vscode.FileStat` and `directoryEntriesFor(path: string): [string, vscode.FileType][]`, defined over the exact files `/workspace/tarjan.algor.json` and `/workspace/tarjan.ts`

- [ ] **Step 1: Add the extension manifest and confirm manifest validation fails before bundles exist**

The manifest declares `browser: "./dist/extension.js"`, `extensionKind: ["web"]`, `capabilities.virtualWorkspaces: true`, command `algorNote.openTarjan`, and custom editor selector `*.algor.json` with priority `default`. Add a Node test that reads the manifest and asserts these exact values plus the existence of both output bundles.

```json
{
  "name": "algor-note",
  "displayName": "Algor Note",
  "publisher": "engelyu",
  "version": "0.1.0",
  "engines": { "vscode": "^1.124.0" },
  "browser": "./dist/extension.js",
  "extensionKind": ["web"],
  "capabilities": { "virtualWorkspaces": true, "untrustedWorkspaces": { "supported": true } },
  "activationEvents": ["onFileSystem:algor-note-vfs", "onCustomEditor:algorNote.visualization", "onCommand:algorNote.openTarjan"],
  "contributes": {
    "commands": [{ "command": "algorNote.openTarjan", "title": "Algor Note: Open Tarjan" }],
    "customEditors": [{
      "viewType": "algorNote.visualization",
      "displayName": "Algor Note Visualization",
      "selector": [{ "filenamePattern": "*.algor.json" }],
      "priority": "default"
    }]
  }
}
```

Run: `node --test tests/code-oss-extension.test.mjs`

Expected: FAIL because the bundles do not exist.

- [ ] **Step 2: Implement CSP-safe webview HTML**

`createWebviewHtml(webview, extensionUri)` returns a document with `default-src 'none'`, `img-src` permitting the webview source and data URIs, `font-src` permitting the webview source, `style-src` permitting the webview source and one generated nonce, and `script-src` permitting only that nonce. Resolve script and stylesheet URIs through `webview.asWebviewUri` and include no inline executable script.

```ts
export function createWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const nonce = randomNonce();
  const script = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "dist/webview/assets/main.js"));
  const style = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "dist/webview/assets/main.css"));
  const csp = `default-src 'none'; img-src ${webview.cspSource} data:; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}'`;
  return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${csp}"><link nonce="${nonce}" rel="stylesheet" href="${style}"></head><body><div id="root"></div><script nonce="${nonce}" src="${script}"></script></body></html>`;
}
```

- [ ] **Step 3: Implement the read-only custom editor provider**

Register `vscode.window.registerCustomEditorProvider("algorNote.visualization", provider, { webviewOptions: { retainContextWhenHidden: true }, supportsMultipleEditorsPerDocument: false })`. `openCustomDocument` accepts only a URI ending in `.algor.json`. `resolveCustomEditor` enables scripts, restricts `localResourceRoots` to the extension directory, sets the HTML, waits for `{ version: 1, type: "ready" }`, then posts the exact `open-package` message. Invalid messages produce a logged warning and no state change.

```ts
class AlgorNoteEditorProvider implements vscode.CustomReadonlyEditorProvider<AlgorNoteDocument> {
  constructor(private readonly extensionUri: vscode.Uri, private readonly state: vscode.Memento) {}
  async openCustomDocument(uri: vscode.Uri): Promise<AlgorNoteDocument> {
    if (!uri.path.endsWith(".algor.json")) throw new Error(`Unsupported Algor Note resource: ${uri.toString()}`);
    return { uri, dispose() {} };
  }
  async resolveCustomEditor(_document: AlgorNoteDocument, panel: vscode.WebviewPanel): Promise<void> {
    panel.webview.options = { enableScripts: true, localResourceRoots: [this.extensionUri] };
    panel.webview.html = createWebviewHtml(panel.webview, this.extensionUri);
    panel.webview.onDidReceiveMessage((message: unknown) => {
      if (!isWebviewToHostMessage(message)) return console.warn("Rejected Algor Note webview message", message);
      if (message.type === "ready") panel.webview.postMessage({ version: 1, type: "open-package", packageId: "tarjan-scc", scenarioId: "simple-cycle", replayIndex: this.state.get("tarjan.replayIndex", 0), layout: this.state.get("tarjan.layout", null), selectedIds: this.state.get("tarjan.selectedIds", []) } satisfies HostToWebviewMessage);
      if (message.type === "replay-changed") void this.state.update("tarjan.replayIndex", message.replayIndex);
      if (message.type === "layout-changed") void this.state.update("tarjan.layout", message.layout);
      if (message.type === "selection-changed") void this.state.update("tarjan.selectedIds", message.selectedIds);
    });
  }
}
```

- [ ] **Step 4: Register the static virtual workspace and open command**

The provider exposes `/workspace/tarjan.algor.json` and `/workspace/tarjan.ts` from `resources/workspace/`, reports deterministic file metadata, and throws `vscode.FileSystemError.NoPermissions` from every mutating method. Activation registers the `algor-note-vfs` scheme and opens the descriptor with the custom editor.

```ts
export function activate(context: vscode.ExtensionContext): void {
  const workspace = new ReadOnlyWorkspaceProvider(context.extensionUri);
  const editor = new AlgorNoteEditorProvider(context.extensionUri, context.workspaceState);
  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider("algor-note-vfs", workspace, { isCaseSensitive: true, isReadonly: true }),
    vscode.window.registerCustomEditorProvider("algorNote.visualization", editor, { webviewOptions: { retainContextWhenHidden: true }, supportsMultipleEditorsPerDocument: false }),
    vscode.commands.registerCommand("algorNote.openTarjan", async () => {
      const uri = vscode.Uri.parse("algor-note-vfs:/workspace/tarjan.algor.json");
      await vscode.commands.executeCommand("vscode.openWith", uri, "algorNote.visualization");
    }),
  );
}
```

```ts
export class ReadOnlyWorkspaceProvider implements vscode.FileSystemProvider {
  readonly onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>().event;
  constructor(private readonly extensionUri: vscode.Uri) {}
  stat(uri: vscode.Uri) { return metadataFor(uri.path); }
  readDirectory(uri: vscode.Uri) { return directoryEntriesFor(uri.path); }
  readFile(uri: vscode.Uri) { return vscode.workspace.fs.readFile(vscode.Uri.joinPath(this.extensionUri, "resources", uri.path.slice(1))); }
  writeFile() { throw vscode.FileSystemError.NoPermissions("Algor Note workspace is read-only"); }
  delete() { throw vscode.FileSystemError.NoPermissions("Algor Note workspace is read-only"); }
  rename() { throw vscode.FileSystemError.NoPermissions("Algor Note workspace is read-only"); }
  createDirectory() { throw vscode.FileSystemError.NoPermissions("Algor Note workspace is read-only"); }
  watch() { return new vscode.Disposable(() => {}); }
}
```

- [ ] **Step 5: Extract the Tarjan editor without the custom Workbench shell**

Move only the Tarjan canvas, explanation strip, variables, call stack, concepts, timeline, and transport behavior into `TarjanEditor.tsx`. Do not import `src/workbench/Workbench.tsx`. Initialize layout from host-provided state or `TARJAN_LAYOUT`; on safe geometry changes, post `layout-changed`; on semantic scene edits, restore the canonical scene. Render a visible recoverable error panel if artifact validation throws.

```tsx
export function TarjanEditor({ initialStep, initialLayout, initialSelectedIds, postMessage }: { initialStep: number; initialLayout: Record<string, LayoutRect> | null; initialSelectedIds: string[]; postMessage(message: WebviewToHostMessage): void }) {
  const [step, setStep] = useState(initialStep);
  const [layout, setLayout] = useState<Record<string, LayoutRect>>(() => structuredClone(initialLayout ?? TARJAN_LAYOUT));
  const frame = tarjanPackage.scenarios[0].frames[step];
  const elements = useMemo(() => convertToStableExcalidrawElements(createTarjanSkeletons(frame.state, layout)), [frame, layout]);
  const changeStep = (next: number) => {
    const replayIndex = Math.max(0, Math.min(tarjanPackage.scenarios[0].frames.length - 1, next));
    setStep(replayIndex);
    postMessage({ version: 1, type: "replay-changed", replayIndex });
  };
  const acceptLayout = (next: Record<string, LayoutRect>) => {
    setLayout(next);
    postMessage({ version: 1, type: "layout-changed", layout: next });
  };
  return <main className="tarjan-editor" data-frame={frame.index} data-node-a-x={layout["node:A"].x}><TarjanCanvas frame={frame} elements={elements} layout={layout} initialSelectedIds={initialSelectedIds} onLayout={acceptLayout} onSelection={(selectedIds) => postMessage({ version: 1, type: "selection-changed", selectedIds })} /><TarjanPanels frame={frame} onStep={changeStep} /><TransportPanel step={step} onStep={changeStep} /></main>;
}
```

`main.tsx` acquires the VS Code webview interface, posts `{ version: 1, type: "ready" }`, validates the first host message, and renders `TarjanEditor` only for the accepted Tarjan package. It renders the `host-error` message as text and catches React errors into `{ version: 1, type: "webview-error", message }`.

```tsx
declare function acquireVsCodeApi(): { postMessage(message: WebviewToHostMessage): void };
const vscode = acquireVsCodeApi();
window.addEventListener("message", (event) => {
  if (!isHostToWebviewMessage(event.data)) return;
  if (event.data.type === "host-error") return root.render(<ErrorPanel message={event.data.message} />);
  root.render(<TarjanEditor initialStep={event.data.replayIndex} initialLayout={event.data.layout} initialSelectedIds={event.data.selectedIds} postMessage={(message) => vscode.postMessage(message)} />);
});
vscode.postMessage({ version: 1, type: "ready" } satisfies WebviewToHostMessage);
```

- [ ] **Step 6: Add independent extension and webview builds**

The extension `esbuild.mjs` bundles `src/extension.ts` for `browser`, format `cjs`, marks `vscode` external, and writes one file. The Vite config builds `src/codeOssWebview/main.tsx` to `extensions/algor-note/dist/webview/` with relative asset URLs and the existing React/Excalidraw aliases. Add `build:code-oss-extension` and `build:code-oss-webview` scripts.

```js
await esbuild.build({
  entryPoints: ["extensions/algor-note/src/extension.ts"],
  outfile: "extensions/algor-note/dist/extension.js",
  bundle: true,
  platform: "browser",
  format: "cjs",
  external: ["vscode"],
  sourcemap: true,
});
```

```ts
const excalidrawVendor = path.resolve(process.cwd(), "vendor/excalidraw");
const excalidrawAliases = [
  { find: /^react-dom\/client$/, replacement: `${excalidrawVendor}/react-dom.js` },
  { find: /^react-dom$/, replacement: `${excalidrawVendor}/react-dom.js` },
  { find: /^react\/jsx-runtime$/, replacement: `${excalidrawVendor}/react-jsx-runtime.js` },
  { find: /^react$/, replacement: `${excalidrawVendor}/react.js` },
];
export default defineConfig({
  base: "./",
  plugins: [react({ jsxRuntime: "classic" })],
  build: {
    outDir: "extensions/algor-note/dist/webview",
    emptyOutDir: true,
    rollupOptions: {
      input: "src/codeOssWebview/index.html",
      output: { entryFileNames: "assets/main.js", assetFileNames: "assets/[name][extname]" },
    },
  },
  resolve: { alias: excalidrawAliases },
});
```

- [ ] **Step 7: Build and verify the slice**

Run: `npm run build:code-oss-extension`

Expected: `extensions/algor-note/dist/extension.js` exists as one browser bundle.

Run: `npm run build:code-oss-webview`

Expected: webview HTML, JavaScript, CSS, fonts, and workers are emitted below `extensions/algor-note/dist/webview/` with no absolute `/assets/` URL.

Run: `node --test tests/code-oss-extension.test.mjs`

Expected: manifest and output checks pass.

Add `verify:code-oss-extension` as `npm run build:code-oss-extension && npm run build:code-oss-webview && node --test tests/code-oss-extension.test.mjs`.

- [ ] **Step 8: Commit the browser extension vertical slice**

```bash
git add package.json tsconfig.node.json vite.code-oss-webview.config.ts extensions/algor-note src/codeOssWebview tests/code-oss-extension.test.mjs
git commit -m "feat: host Tarjan in a Code-OSS web extension"
```

### Task 5: Integrate host and extension in the spike worktree

**Files:**

- Modify: `scripts/code-oss/build.mjs`
- Modify: `package.json`
- Test: `tests/code-oss-static.test.mjs`

**Interfaces:**

- Consumes: Task 2 static assembler and Task 4 extension output
- Produces: one self-contained `dist/code-oss-web/` rooted at `/cs-note/`

- [ ] **Step 1: Add a failing integration assertion**

Extend `tests/code-oss-static.test.mjs` to require `index.html`, the Code-OSS workbench main file, `resources/`, `extensions/algor-note/package.json`, `extensions/algor-note/dist/extension.js`, webview assets, and `extensions/algor-note/resources/workspace/tarjan.algor.json`. Assert every local URL resolves to a file inside the output root after stripping `/cs-note/`.

```js
for (const relativePath of [
  "index.html",
  "out/vs/workbench/workbench.web.main.js",
  "extensions/algor-note/package.json",
  "extensions/algor-note/dist/extension.js",
  "extensions/algor-note/dist/webview/assets/main.js",
  "extensions/algor-note/resources/workspace/tarjan.algor.json",
]) {
  await access(path.join(outputRoot, relativePath));
}
for (const url of collectLocalUrls(await readFile(path.join(outputRoot, "index.html"), "utf8"))) {
  assert.ok(url.startsWith("/cs-note/"));
  await access(path.join(outputRoot, url.slice("/cs-note/".length)));
}
```

- [ ] **Step 2: Run the static verifier against an empty output directory**

Run: `npm run verify:code-oss-static`

Expected: FAIL listing the missing integrated artifacts.

- [ ] **Step 3: Assemble the virtual workspace and extension**

The checked-in extension resource contains the read-only descriptor below and a copy of the current Tarjan source. `build.mjs` must run both extension build commands before copying the extension, and the static verifier compares the copied source with `src/visualizations/tarjan.ts` byte for byte.

```json
{
  "schemaVersion": 1,
  "packageId": "tarjan-scc",
  "scenarioId": "simple-cycle",
  "title": "Tarjan's Strongly Connected Components",
  "artifact": "src/visualizations/tarjanArtifact.json",
  "source": "src/visualizations/tarjan.ts",
  "readOnly": true
}
```

```js
await runCommand("npm", ["run", "build:code-oss-extension"], repositoryRoot);
await runCommand("npm", ["run", "build:code-oss-webview"], repositoryRoot);
await assembleCodeOss(config);
```

- [ ] **Step 4: Build the pinned upstream distribution**

Run: `npm run build:code-oss`

Expected: the pinned commit is fetched or reused, upstream minified web assets compile, and `dist/code-oss-web/` contains all files required by the integration assertion.

- [ ] **Step 5: Verify static safety**

Run: `npm run verify:code-oss-static`

Expected: PASS with no remote authority, WebSocket endpoint, root-relative escaped asset, missing file, or output over 1 GB.

- [ ] **Step 6: Commit integrated static output tooling without committing generated assets**

```bash
git add package.json scripts/code-oss tests/code-oss-static.test.mjs extensions/algor-note/resources/workspace
git commit -m "feat: assemble the Algor Note Code-OSS site"
```

### Task 6: Add browser smoke verification at the Pages subpath

**Files:**

- Create: `playwright.config.ts`
- Create: `tests/browser/code-oss-web.spec.ts`
- Create: `scripts/code-oss/serve.mjs`
- Modify: `package.json`

**Interfaces:**

- Consumes: `dist/code-oss-web/`
- Produces: `npm run test:code-oss-browser`

- [ ] **Step 1: Write the browser test before the static server**

The test opens `/cs-note/`, asserts visible Activity Bar, Explorer, editor region, Status Bar, and Command Palette, runs `Algor Note: Open Tarjan`, waits for the custom editor webview, asserts frame `1 / 24`, advances to frame 2, drags `node:A`, reloads, and verifies the saved geometry remains different from `TARJAN_LAYOUT`. Record all requests and fail on `ws:`, `wss:`, or any origin other than the local smoke server.

```ts
test("Code-OSS opens the read-only Tarjan visualization", async ({ page }) => {
  const forbidden: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (["ws:", "wss:"].includes(url.protocol) || url.origin !== "http://127.0.0.1:4173") forbidden.push(request.url());
  });
  await page.goto("/cs-note/");
  await expect(page.locator(".activitybar")).toBeVisible();
  await page.keyboard.press("Control+Shift+P");
  await page.getByRole("textbox").fill("Algor Note: Open Tarjan");
  await page.keyboard.press("Enter");
  const editor = page.frameLocator('iframe[title="Algor Note Visualization"]');
  await expect(editor.getByText("1 / 24")).toBeVisible();
  await editor.getByRole("button", { name: "Next event" }).click();
  await expect(editor.getByText("2 / 24")).toBeVisible();
  const root = editor.locator(".tarjan-editor");
  const before = Number(await root.getAttribute("data-node-a-x"));
  const canvas = editor.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Tarjan Excalidraw canvas has no bounding box");
  await page.mouse.move(box.x + 180, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 240, box.y + 140, { steps: 8 });
  await page.mouse.up();
  await expect(root).not.toHaveAttribute("data-node-a-x", String(before));
  const moved = await root.getAttribute("data-node-a-x");
  await page.reload();
  await expect(page.frameLocator('iframe[title="Algor Note Visualization"]').locator(".tarjan-editor")).toHaveAttribute("data-node-a-x", moved ?? "");
  expect(forbidden).toEqual([]);
});
```

- [ ] **Step 2: Run the test and confirm the missing-server failure**

Run: `npm run test:code-oss-browser`

Expected: FAIL because no `webServer` command is configured.

- [ ] **Step 3: Implement a subpath-correct static server**

`serve.mjs` serves only `dist/code-oss-web/`, maps `/cs-note/` to `index.html`, rejects path traversal, returns correct JavaScript, CSS, JSON, font, WASM, and worker MIME types, and returns 404 for unknown files instead of falling back to the workbench.

```js
const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1:4173");
  if (!url.pathname.startsWith("/cs-note/")) return send(response, 404, "text/plain", "Not found");
  const relative = url.pathname === "/cs-note/" ? "index.html" : url.pathname.slice("/cs-note/".length);
  const target = path.resolve(outputRoot, relative);
  if (!target.startsWith(`${outputRoot}${path.sep}`)) return send(response, 400, "text/plain", "Invalid path");
  try { return send(response, 200, mimeType(target), await readFile(target)); }
  catch (error) { if (error.code === "ENOENT") return send(response, 404, "text/plain", "Not found"); throw error; }
});
server.listen(4173, "127.0.0.1");
```

- [ ] **Step 4: Configure Playwright**

Use Chromium, one worker, base URL `http://127.0.0.1:4173`, and `webServer.command: "node scripts/code-oss/serve.mjs"`. Capture trace on first retry and screenshots only on failure.

```ts
export default defineConfig({
  testDir: "tests/browser",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:4173", trace: "on-first-retry", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: "node scripts/code-oss/serve.mjs", url: "http://127.0.0.1:4173/cs-note/", reuseExistingServer: false },
});
```

- [ ] **Step 5: Run browser and semantic verification**

Run: `npm run test:code-oss-browser`

Expected: the full Code-OSS/Tarjan interaction test passes.

Run: `npm test`

Expected: all existing and new pure tests pass.

- [ ] **Step 6: Commit browser verification**

```bash
git add package.json playwright.config.ts scripts/code-oss/serve.mjs tests/browser/code-oss-web.spec.ts
git commit -m "test: verify Code-OSS Pages integration"
```

### Task 7: Deploy the verified static workbench to GitHub Pages

**Files:**

- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/deploy-pages.yml`
- Modify: `docs/THIRD-PARTY-NOTICES.md`
- Create: `docs/research/2026-08-10-code-oss-web-spike-result.md`

**Interfaces:**

- Consumes: all build and verification scripts
- Produces: a Pages deployment artifact and a recorded go/stop decision

- [ ] **Step 1: Make CI build the exact static artifact**

Add a `code-oss-web` job with Node 24, upstream cache keyed by `code-oss/upstream.json`, `npm ci`, `npm test`, `npm run verify:code-oss-extension`, `npm run build:code-oss`, `npm run verify:code-oss-static`, Playwright Chromium installation, and `npm run test:code-oss-browser`. Upload browser traces only on failure.

```yaml
code-oss-web:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: 24, cache: npm }
    - uses: actions/cache@v4
      with:
        path: .cache/code-oss
        key: code-oss-${{ hashFiles('code-oss/upstream.json') }}
    - run: npm ci
    - run: npm test
    - run: npm run verify:code-oss-extension
    - run: npm run build:code-oss
    - run: npm run verify:code-oss-static
    - run: npx playwright install --with-deps chromium
    - run: npm run test:code-oss-browser
    - uses: actions/upload-artifact@v4
      if: failure()
      with: { name: playwright-report, path: playwright-report }
```

- [ ] **Step 2: Switch Pages deployment output**

Replace `npm run build` with `npm run build:code-oss`, keep `VITE_BASE` out of this workflow, and upload `dist/code-oss-web`. Do not deploy when semantic tests, license verification, static verification, or browser smoke tests fail.

```yaml
- name: Verify semantic and protocol contracts
  run: npm test
- name: Verify extension bundles
  run: npm run verify:code-oss-extension
- name: Build Code-OSS Pages artifact
  run: npm run build:code-oss
- name: Verify static host safety
  run: npm run verify:code-oss-static
- name: Install Chromium
  run: npx playwright install --with-deps chromium
- name: Verify browser integration
  run: npm run test:code-oss-browser
- name: Upload Pages artifact
  uses: actions/upload-pages-artifact@v3
  with: { path: ./dist/code-oss-web }
```

- [ ] **Step 3: Extend licensing notices**

Add Code-OSS MIT attribution, the exact pinned commit, upstream third-party notices location, and the extension/webview dependency notices. Extend `scripts/verify-licenses.mjs` so CI requires these entries before deployment.

```js
const notice = await readFile(path.join(repositoryRoot, "docs/THIRD-PARTY-NOTICES.md"), "utf8");
for (const required of [
  "microsoft/vscode",
  "6928394f91b684055b873eecb8bc281365131f1c",
  "MIT License",
  "ThirdPartyNotices.txt",
]) {
  if (!notice.includes(required)) throw new Error(`Missing Code-OSS notice entry: ${required}`);
}
```

- [ ] **Step 4: Record the spike result**

The result document records elapsed working days, exact commit, build duration, output size, first-load transfer size, browser smoke outcome, Pages URL, upstream patches applied, and one decision. A successful result says `GO — maintain the pinned static Code-OSS host`. A stopped result says exactly which approved stop condition occurred, such as `STOP — webview assets cannot load from the GitHub Pages project subpath`. It must include reproduction commands and links to encountered upstream issues, or state `No upstream issue was required`.

- [ ] **Step 5: Run final verification**

Run: `npm test`

Expected: all semantic, configuration, and protocol tests pass.

Run: `npm run verify:code-oss-extension`

Expected: extension and webview builds plus manifest tests pass.

Run: `npm run build:code-oss`

Expected: reproducible static output at `dist/code-oss-web/`.

Run: `npm run verify:code-oss-static`

Expected: PASS.

Run: `npm run test:code-oss-browser`

Expected: PASS in Chromium from `/cs-note/`.

- [ ] **Step 6: Commit deployment and result documentation**

```bash
git add .github/workflows/ci.yml .github/workflows/deploy-pages.yml docs/THIRD-PARTY-NOTICES.md docs/research/2026-08-10-code-oss-web-spike-result.md scripts/verify-licenses.mjs
git commit -m "ci: deploy the Code-OSS web workbench"
```

## Final Review Gate

Before calling the spike complete, a Sol high coordinator reviews the integrated diff against the approved design, confirms that domain modules contain no VS Code imports, confirms that `src/workbench` was not deleted, checks the Pages artifact for remote connections and proprietary Microsoft distribution assets, and verifies the result document makes an explicit go/stop decision. A separate Luna xhigh worker reruns the exact four final commands from a fresh worktree.
