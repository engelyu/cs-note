import React from "react";
import { createRoot } from "react-dom/client";
import { isHostToWebviewMessage, type HostToWebviewMessage, type WebviewToHostMessage } from "../codeOss/protocol";
import "./styles.css";

declare function acquireVsCodeApi(): { postMessage(message: WebviewToHostMessage): void };

const vscode = acquireVsCodeApi();
const rootElement = document.getElementById("root") as HTMLElement;

function ErrorPanel({ message }: { message: string }): React.ReactElement {
  return <section className="error-panel" role="alert"><strong>Tarjan visualization unavailable</strong><p>{message}</p><span>Reopen the .algor.json document to try again.</span></section>;
}

function renderErrorPanel(message: string): void {
  const panel = document.createElement("section");
  panel.className = "error-panel";
  panel.setAttribute("role", "alert");
  panel.textContent = `Tarjan visualization unavailable ${message} Reopen the .algor.json document to try again.`;
  rootElement.replaceChildren(panel);
}

renderErrorPanel("Loading the verified Tarjan artifact…");

class EditorErrorBoundary extends React.Component<{ children: React.ReactNode; onError: (message: string) => void }, { message: string | null }> {
  state = { message: null };

  static getDerivedStateFromError(error: unknown): { message: string } {
    return { message: error instanceof Error ? error.message : "The Tarjan editor encountered an unexpected error." };
  }

  componentDidCatch(error: unknown): void {
    this.props.onError(error instanceof Error ? error.message : "The Tarjan editor encountered an unexpected error.");
  }

  render(): React.ReactNode {
    return this.state.message ? <ErrorPanel message={this.state.message} /> : this.props.children;
  }
}

function reportError(message: string): void {
  vscode.postMessage({ version: 1, type: "webview-error", message });
}

async function renderOpenPackage(message: Extract<HostToWebviewMessage, { type: "open-package" }>): Promise<void> {
  try {
    const { TarjanEditor } = await import("./TarjanEditor");
    const root = createRoot(rootElement);
    root.render(
      <EditorErrorBoundary onError={reportError}>
        <TarjanEditor
          initialStep={message.replayIndex}
          initialLayout={message.layout}
          initialSelectedIds={message.selectedIds}
          postMessage={(nextMessage) => vscode.postMessage(nextMessage)}
        />
      </EditorErrorBoundary>,
    );
  } catch (error) {
    const text = error instanceof Error ? error.message : "The verified Tarjan editor could not be loaded.";
    renderErrorPanel(text);
    reportError(text);
  }
}

function renderHostMessage(message: HostToWebviewMessage): void {
  if (message.type === "host-error") {
    renderErrorPanel(message.message);
    return;
  }
  void renderOpenPackage(message);
}

let receivedFirstHostMessage = false;
window.addEventListener("message", (event: MessageEvent<unknown>) => {
  if (receivedFirstHostMessage || !isHostToWebviewMessage(event.data)) return;
  receivedFirstHostMessage = true;
  renderHostMessage(event.data);
});

vscode.postMessage({ version: 1, type: "ready" });
