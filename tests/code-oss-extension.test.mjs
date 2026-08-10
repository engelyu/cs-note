import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { access } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createContext, Script, runInContext } from "node:vm";

const require = createRequire(import.meta.url);
const extensionBundle = new URL("../extensions/algor-note/dist/extension.js", import.meta.url);
const webviewBundle = new URL("../extensions/algor-note/dist/webview/assets/main.js", import.meta.url);

function loadExtensionBundle() {
  const records = { fileSystems: [], editors: [], commands: [], executedCommands: [] };
  class Uri {
    constructor(path) {
      this.path = path;
    }

    toString() {
      return `algor-note-vfs:${this.path}`;
    }

    static parse(value) {
      return new Uri(value.slice(value.indexOf(":") + 1) || "/");
    }

    static joinPath(base, ...parts) {
      return new Uri([base.path.replace(/\/$/, ""), ...parts.map((part) => part.replace(/^\//, ""))].join("/"));
    }
  }

  class EventEmitter {
    event = () => ({ dispose() {} });
  }

  const vscode = {
    Uri,
    EventEmitter,
    FileType: { File: 1, Directory: 2 },
    FileSystemError: {
      NoPermissions(message) {
        const error = new Error(message);
        error.code = "NoPermissions";
        return error;
      },
      FileNotFound(message) {
        const error = new Error(message);
        error.code = "FileNotFound";
        return error;
      },
    },
    workspace: {
      registerFileSystemProvider(scheme, provider, options) {
        records.fileSystems.push({ scheme, provider, options });
        return { dispose() {} };
      },
      fs: {
        async readFile() {
          return new Uint8Array();
        },
      },
    },
    window: {
      registerCustomEditorProvider(viewType, provider, options) {
        records.editors.push({ viewType, provider, options });
        return { dispose() {} };
      },
    },
    commands: {
      registerCommand(command, handler) {
        records.commands.push({ command, handler });
        return { dispose() {} };
      },
      async executeCommand(...args) {
        records.executedCommands.push(args);
      },
    },
  };

  const moduleApi = require("node:module");
  const originalLoad = moduleApi._load;
  moduleApi._load = (request, parent, isMain) => request === "vscode"
    ? vscode
    : originalLoad(request, parent, isMain);
  try {
    const bundlePath = fileURLToPath(extensionBundle);
    delete require.cache[bundlePath];
    return { extension: require(bundlePath), records, vscode };
  } finally {
    moduleApi._load = originalLoad;
  }
}

const manifest = JSON.parse(await readFile(new URL("../extensions/algor-note/package.json", import.meta.url), "utf8"));

test("Code-OSS extension manifest exposes the browser custom editor", async () => {
  assert.equal(manifest.browser, "./dist/extension.js");
  assert.deepEqual(manifest.extensionKind, ["web"]);
  assert.deepEqual(manifest.capabilities, {
    virtualWorkspaces: true,
    untrustedWorkspaces: { supported: true },
  });
  assert.deepEqual(manifest.contributes.commands, [
    { command: "algorNote.openTarjan", title: "Algor Note: Open Tarjan" },
  ]);
  assert.deepEqual(manifest.contributes.customEditors, [{
    viewType: "algorNote.visualization",
    displayName: "Algor Note Visualization",
    selector: [{ filenamePattern: "*.algor.json" }],
    priority: "default",
  }]);
  await access(new URL("../extensions/algor-note/dist/extension.js", import.meta.url));
  await access(new URL("../extensions/algor-note/dist/webview", import.meta.url));
  const webviewHtml = await readFile(new URL("../extensions/algor-note/dist/webview/index.html", import.meta.url), "utf8");
  assert.match(webviewHtml, /src="\.\/assets\/main\.js"/);
  assert.doesNotMatch(webviewHtml, /(?:src|href)="\/assets\//);
  await access(new URL("../extensions/algor-note/dist/webview/assets/main.js", import.meta.url));
  await access(new URL("../extensions/algor-note/dist/webview/assets/main.css", import.meta.url));
});

test("generated extension hosts CSP-safe HTML, static files, and no-permission mutations", async () => {
  const { extension, records, vscode } = loadExtensionBundle();
  const updates = [];
  const state = {
    get: (_key, fallback) => fallback,
    update: async (key, value) => {
      updates.push([key, value]);
    },
  };
  const context = { extensionUri: new vscode.Uri("/extension"), workspaceState: state, subscriptions: [] };
  extension.activate(context);

  const fileSystem = records.fileSystems[0];
  assert.equal(fileSystem.scheme, "algor-note-vfs");
  assert.deepEqual(fileSystem.provider.readDirectory({ path: "/workspace" }), [
    ["tarjan.algor.json", vscode.FileType.File],
    ["tarjan.ts", vscode.FileType.File],
  ]);
  assert.deepEqual(fileSystem.provider.stat({ path: "/workspace/tarjan.algor.json" }), {
    type: vscode.FileType.File,
    ctime: 0,
    mtime: 0,
    size: 0,
  });
  for (const method of ["writeFile", "delete", "rename", "createDirectory"]) {
    assert.throws(() => fileSystem.provider[method](), { code: "NoPermissions" });
  }

  const editor = records.editors[0];
  const posted = [];
  let receiveMessage;
  const panel = {
    webview: {
      cspSource: "https://algor-note.invalid",
      options: undefined,
      html: "",
      asWebviewUri(uri) {
        return `vscode-resource:${uri.path}`;
      },
      onDidReceiveMessage(handler) {
        receiveMessage = handler;
        return { dispose() {} };
      },
      postMessage(message) {
        posted.push(message);
        return Promise.resolve(true);
      },
    },
  };
  const document = await editor.provider.openCustomDocument(new vscode.Uri("/workspace/tarjan.algor.json"));
  await editor.provider.resolveCustomEditor(document, panel);
  assert.deepEqual(panel.webview.options, {
    enableScripts: true,
    localResourceRoots: [context.extensionUri],
  });
  assert.match(panel.webview.html, /default-src 'none'/);
  assert.match(panel.webview.html, /img-src https:\/\/algor-note\.invalid data:/);
  assert.match(panel.webview.html, /font-src https:\/\/algor-note\.invalid/);
  assert.match(panel.webview.html, /style-src https:\/\/algor-note\.invalid 'nonce-[A-Za-z0-9]+'/);
  assert.match(panel.webview.html, /script-src 'nonce-[A-Za-z0-9]+'/);
  assert.match(panel.webview.html, /<link nonce="[A-Za-z0-9]+" rel="stylesheet" href="vscode-resource:\/extension\/dist\/webview\/assets\/main\.css">/);
  assert.match(panel.webview.html, /<script nonce="[A-Za-z0-9]+" src="vscode-resource:\/extension\/dist\/webview\/assets\/main\.js"><\/script>/);
  assert.doesNotMatch(panel.webview.html, /<script[^>]*>(?!<\/script>)[^<]/);

  receiveMessage({ version: 1, type: "ready" });
  assert.deepEqual(posted, [{
    version: 1,
    type: "open-package",
    packageId: "tarjan-scc",
    scenarioId: "simple-cycle",
    replayIndex: 0,
    layout: null,
    selectedIds: [],
  }]);
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args);
  receiveMessage({ version: 1, type: "replay-changed", replayIndex: 3, extra: true });
  console.warn = originalWarn;
  assert.equal(warnings.length, 1);
  assert.equal(posted.length, 1);
  assert.equal(updates.length, 0);
  receiveMessage({ version: 1, type: "replay-changed", replayIndex: 3 });
  receiveMessage({ version: 1, type: "layout-changed", layout: { "node:A": { x: 130, y: 90, width: 64, height: 64 } } });
  receiveMessage({ version: 1, type: "selection-changed", selectedIds: ["node:A"] });
  assert.deepEqual(updates, [
    ["tarjan.replayIndex", 3],
    ["tarjan.layout", { "node:A": { x: 130, y: 90, width: 64, height: 64 } }],
    ["tarjan.selectedIds", ["node:A"]],
  ]);
  await assert.rejects(editor.provider.openCustomDocument(new vscode.Uri("/workspace/tarjan.txt")), /Unsupported Algor Note resource/);

  const command = records.commands.find((candidate) => candidate.command === "algorNote.openTarjan");
  await command.handler();
  assert.deepEqual(records.executedCommands.at(-1), ["vscode.openWith", new vscode.Uri("/workspace/tarjan.algor.json"), "algorNote.visualization"]);
});

test("generated webview recovers when the artifact-dependent editor module fails to load", async () => {
  const source = await readFile(webviewBundle, "utf8");
  const executableSource = source
    .replaceAll("import.meta.url", "undefined")
    .replace(/;export\{[\s\S]*$/, ";")
    .replace(/await import\(`\.\/TarjanEditor-[^`]+`\)/, "await Promise.reject(new Error(\"artifact validation failed\"))");
  const posts = [];
  let receiveMessage;
  const rootElement = {
    textContent: "",
    replaceChildren(...children) {
      this.children = children;
      this.textContent = children.map((child) => child.textContent).join("");
    },
  };
  const document = {
    getElementById(id) {
      assert.equal(id, "root");
      return rootElement;
    },
    querySelectorAll() {
      return [];
    },
    createElement(tagName) {
      return {
        tagName,
        className: "",
        textContent: "",
        relList: { supports: () => false },
        setAttribute(name, value) {
          this[name] = value;
        },
      };
    },
  };
  const context = {
    console,
    require: (request) => {
      if (request === "react") return {
        version: "19.2.8",
        __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: { S: null },
      };
      throw new Error(`Unexpected browser bundle require: ${request}`);
    },
    document,
    window: {
      addEventListener(type, handler) {
        assert.equal(type, "message");
        receiveMessage = handler;
      },
      dispatchEvent() {
        return false;
      },
    },
    acquireVsCodeApi() {
      return { postMessage: (message) => posts.push(JSON.parse(JSON.stringify(message))) };
    },
    setTimeout,
    clearTimeout,
    Event: class {
      constructor() {
        this.defaultPrevented = false;
      }
    },
    MutationObserver: class {
      observe() {}
    },
  };
  const script = new Script(executableSource, {
    filename: fileURLToPath(webviewBundle),
    importModuleDynamically: async () => {
      throw new Error("artifact validation failed");
    },
  });
  let bootError;
  const vmContext = createContext(context);
  try {
    script.runInContext(vmContext);
  } catch (error) {
    bootError = error;
  }
  assert.equal(bootError, undefined, bootError?.message);
  assert.deepEqual(posts, [{ version: 1, type: "ready" }]);
  assert.ok(receiveMessage);
  assert.match(rootElement.textContent, /Loading the verified Tarjan artifact/);

  let messageError;
  try {
    const openPackage = JSON.stringify({
      version: 1,
      type: "open-package",
      packageId: "tarjan-scc",
      scenarioId: "simple-cycle",
      replayIndex: 0,
      layout: null,
      selectedIds: [],
    });
    receiveMessage(runInContext(`({ data: JSON.parse(${JSON.stringify(openPackage)}) })`, vmContext));
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
  } catch (error) {
    messageError = error;
  }
  assert.equal(messageError, undefined, messageError?.message);
  assert.match(rootElement.textContent, /Tarjan visualization unavailable/);
  assert.match(rootElement.textContent, /artifact validation failed/);
  assert.deepEqual(posts, [
    { version: 1, type: "ready" },
    { version: 1, type: "webview-error", message: "artifact validation failed" },
  ]);
});

test("generated extension normalizes partial and stale persisted layout on reopen", async () => {
  const { extension, records, vscode } = loadExtensionBundle();
  const partialLayout = {
    "node:A": { x: 999, y: 888, width: 72, height: 72 },
    "node:stale": { x: 1, y: 2, width: 3, height: 4 },
  };
  const state = {
    get(key, fallback) {
      return key === "tarjan.layout" ? partialLayout : fallback;
    },
    async update() {},
  };
  const context = { extensionUri: new vscode.Uri("/extension"), workspaceState: state, subscriptions: [] };
  extension.activate(context);
  const editor = records.editors[0];
  const posted = [];
  let receiveMessage;
  const panel = {
    webview: {
      cspSource: "https://algor-note.invalid",
      options: undefined,
      html: "",
      asWebviewUri(uri) {
        return `vscode-resource:${uri.path}`;
      },
      onDidReceiveMessage(handler) {
        receiveMessage = handler;
        return { dispose() {} };
      },
      postMessage(message) {
        posted.push(message);
        return Promise.resolve(true);
      },
    },
  };
  const document = await editor.provider.openCustomDocument(new vscode.Uri("/workspace/tarjan.algor.json"));
  await editor.provider.resolveCustomEditor(document, panel);
  receiveMessage({ version: 1, type: "ready" });
  assert.deepEqual(posted, [{
    version: 1,
    type: "open-package",
    packageId: "tarjan-scc",
    scenarioId: "simple-cycle",
    replayIndex: 0,
    layout: {
      "node:A": { x: 999, y: 888, width: 72, height: 72 },
      "node:B": { x: 290, y: 90, width: 64, height: 64 },
      "node:C": { x: 200, y: 250, width: 64, height: 64 },
      "node:D": { x: 440, y: 90, width: 64, height: 64 },
      "node:E": { x: 440, y: 250, width: 64, height: 64 },
    },
    selectedIds: [],
  }]);
});

test("generated extension serializes rapid same-key memento writes and survives a failed write", async () => {
  const { extension, records, vscode } = loadExtensionBundle();
  const writes = [];
  const state = {
    get: (_key, fallback) => fallback,
    update(key, value) {
      let resolve;
      let reject;
      const promise = new Promise((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
      });
      writes.push({ key, value, promise, resolve, reject });
      return promise;
    },
  };
  const context = { extensionUri: new vscode.Uri("/extension"), workspaceState: state, subscriptions: [] };
  extension.activate(context);
  const editor = records.editors[0];
  let receiveMessage;
  const panel = {
    webview: {
      cspSource: "https://algor-note.invalid",
      options: undefined,
      html: "",
      asWebviewUri(uri) {
        return `vscode-resource:${uri.path}`;
      },
      onDidReceiveMessage(handler) {
        receiveMessage = handler;
        return { dispose() {} };
      },
      postMessage() {
        return Promise.resolve(true);
      },
    },
  };
  const document = await editor.provider.openCustomDocument(new vscode.Uri("/workspace/tarjan.algor.json"));
  await editor.provider.resolveCustomEditor(document, panel);
  receiveMessage({ version: 1, type: "replay-changed", replayIndex: 1 });
  receiveMessage({ version: 1, type: "replay-changed", replayIndex: 2 });
  assert.deepEqual(writes.map(({ key, value }) => [key, value]), [["tarjan.replayIndex", 1]]);
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args);
  try {
    writes[0].reject(new Error("memento unavailable"));
    await new Promise((resolve) => setImmediate(resolve));
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(warnings.length, 1);
  assert.deepEqual(writes.map(({ key, value }) => [key, value]), [
    ["tarjan.replayIndex", 1],
    ["tarjan.replayIndex", 2],
  ]);
  writes[1].resolve();
  await new Promise((resolve) => setImmediate(resolve));
});
