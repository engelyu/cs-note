import * as vscode from "vscode";
import {
  isHostToWebviewMessage,
  isWebviewToHostMessage,
  type HostToWebviewMessage,
} from "../../../src/codeOss/protocol";
import { createWebviewHtml } from "./webviewHtml";
import { ReadOnlyWorkspaceProvider } from "./virtualWorkspace";

const REPLAY_INDEX_KEY = "tarjan.replayIndex";
const LAYOUT_KEY = "tarjan.layout";
const SELECTED_IDS_KEY = "tarjan.selectedIds";

export type AlgorNoteDocument = {
  uri: vscode.Uri;
  dispose(): void;
};

function storedReplayIndex(state: vscode.Memento): number {
  const value = state.get<unknown>(REPLAY_INDEX_KEY, 0);
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

function storedLayout(state: vscode.Memento): Record<string, { x: number; y: number; width: number; height: number }> | null {
  const value = state.get<unknown>(LAYOUT_KEY, null);
  const message = {
    version: 1 as const,
    type: "open-package" as const,
    packageId: "tarjan-scc" as const,
    scenarioId: "simple-cycle" as const,
    replayIndex: 0,
    layout: value,
    selectedIds: [],
  };
  return isHostToWebviewMessage(message) ? message.layout : null;
}

function storedSelectedIds(state: vscode.Memento): string[] {
  const value = state.get<unknown>(SELECTED_IDS_KEY, []);
  const message = { version: 1 as const, type: "selection-changed" as const, selectedIds: value };
  return isWebviewToHostMessage(message) ? message.selectedIds : [];
}

function persist(state: vscode.Memento, key: string, value: unknown): void {
  void Promise.resolve(state.update(key, value)).catch((error: unknown) => {
    console.warn("Could not persist Algor Note state", error);
  });
}

export class AlgorNoteEditorProvider implements vscode.CustomReadonlyEditorProvider<AlgorNoteDocument> {
  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly state: vscode.Memento,
  ) {}

  async openCustomDocument(uri: vscode.Uri): Promise<AlgorNoteDocument> {
    if (!uri.path.endsWith(".algor.json")) {
      throw new Error(`Unsupported Algor Note resource: ${uri.toString()}`);
    }
    return { uri, dispose() {} };
  }

  async resolveCustomEditor(_document: AlgorNoteDocument, panel: vscode.WebviewPanel): Promise<void> {
    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };
    panel.webview.html = createWebviewHtml(panel.webview, this.extensionUri);
    panel.webview.onDidReceiveMessage((message: unknown) => {
      if (!isWebviewToHostMessage(message)) {
        console.warn("Rejected Algor Note webview message", message);
        return;
      }

      if (message.type === "ready") {
        const openPackage: HostToWebviewMessage = {
          version: 1,
          type: "open-package",
          packageId: "tarjan-scc",
          scenarioId: "simple-cycle",
          replayIndex: storedReplayIndex(this.state),
          layout: storedLayout(this.state),
          selectedIds: storedSelectedIds(this.state),
        };
        void panel.webview.postMessage(openPackage);
      } else if (message.type === "replay-changed") {
        persist(this.state, REPLAY_INDEX_KEY, message.replayIndex);
      } else if (message.type === "layout-changed") {
        persist(this.state, LAYOUT_KEY, message.layout);
      } else if (message.type === "selection-changed") {
        persist(this.state, SELECTED_IDS_KEY, message.selectedIds);
      } else {
        console.error("Algor Note webview error", message.message);
        void panel.webview.postMessage({
          version: 1,
          type: "host-error",
          message: "The Tarjan visualization could not be rendered. Reopen the document to try again.",
        });
      }
    });
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const workspace = new ReadOnlyWorkspaceProvider(context.extensionUri);
  const editor = new AlgorNoteEditorProvider(context.extensionUri, context.workspaceState);
  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider("algor-note-vfs", workspace, { isCaseSensitive: true, isReadonly: true }),
    vscode.window.registerCustomEditorProvider(
      "algorNote.visualization",
      editor,
      { webviewOptions: { retainContextWhenHidden: true }, supportsMultipleEditorsPerDocument: false },
    ),
    vscode.commands.registerCommand("algorNote.openTarjan", async () => {
      const uri = vscode.Uri.parse("algor-note-vfs:/workspace/tarjan.algor.json");
      await vscode.commands.executeCommand("vscode.openWith", uri, "algorNote.visualization");
    }),
  );
}
