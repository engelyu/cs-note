import React from "react";
import { createRoot } from "react-dom/client";
import { isHostToWebviewMessage, type HostToWebviewMessage, type WebviewToHostMessage } from "../codeOss/protocol";
import { TarjanEditor, ErrorPanel } from "./TarjanEditor";
import "./styles.css";

declare function acquireVsCodeApi(): { postMessage(message: WebviewToHostMessage): void };

const vscode = acquireVsCodeApi();
const root = createRoot(document.getElementById("root") as HTMLElement);

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

function renderHostMessage(message: HostToWebviewMessage): void {
  if (message.type === "host-error") {
    root.render(<ErrorPanel message={message.message} />);
    return;
  }
  try {
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
    const text = error instanceof Error ? error.message : "The Tarjan editor could not be rendered.";
    reportError(text);
    root.render(<ErrorPanel message={text} />);
  }
}

let receivedFirstHostMessage = false;
window.addEventListener("message", (event: MessageEvent<unknown>) => {
  if (receivedFirstHostMessage || !isHostToWebviewMessage(event.data)) return;
  receivedFirstHostMessage = true;
  renderHostMessage(event.data);
});

vscode.postMessage({ version: 1, type: "ready" });
