import * as vscode from "vscode";

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  const cryptoApi = globalThis.crypto;
  if (cryptoApi) cryptoApi.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const nonce = randomNonce();
  const script = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "dist/webview/assets/main.js"));
  const style = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "dist/webview/assets/main.css"));
  const csp = `default-src 'none'; img-src ${webview.cspSource} data:; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}'`;
  return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${csp}"><link nonce="${nonce}" rel="stylesheet" href="${style}"></head><body><div id="root"></div><script nonce="${nonce}" src="${script}"></script></body></html>`;
}
