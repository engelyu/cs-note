import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { access } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const extensionBundle = new URL("../extensions/algor-note/dist/extension.js", import.meta.url);

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
