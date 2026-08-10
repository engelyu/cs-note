import * as vscode from "vscode";

const WORKSPACE_ROOT = "/workspace";
const WORKSPACE_FILES = new Set([
  `${WORKSPACE_ROOT}/tarjan.algor.json`,
  `${WORKSPACE_ROOT}/tarjan.ts`,
]);

function notFound(path: string): never {
  throw vscode.FileSystemError.FileNotFound(`Algor Note workspace path does not exist: ${path}`);
}

export function metadataFor(path: string): vscode.FileStat {
  if (path === "/" || path === WORKSPACE_ROOT) {
    return { type: vscode.FileType.Directory, ctime: 0, mtime: 0, size: 0 };
  }
  if (WORKSPACE_FILES.has(path)) {
    return { type: vscode.FileType.File, ctime: 0, mtime: 0, size: 0 };
  }
  return notFound(path);
}

export function directoryEntriesFor(path: string): [string, vscode.FileType][] {
  if (path === "/") return [["workspace", vscode.FileType.Directory]];
  if (path === WORKSPACE_ROOT) {
    return [
      ["tarjan.algor.json", vscode.FileType.File],
      ["tarjan.ts", vscode.FileType.File],
    ];
  }
  return notFound(path);
}

function workspaceResource(path: string): vscode.Uri {
  if (!WORKSPACE_FILES.has(path)) return notFound(path);
  return vscode.Uri.parse(path);
}

export class ReadOnlyWorkspaceProvider implements vscode.FileSystemProvider {
  readonly onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>().event;

  constructor(private readonly extensionUri: vscode.Uri) {}

  stat(uri: vscode.Uri): vscode.FileStat {
    return metadataFor(uri.path);
  }

  readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
    return directoryEntriesFor(uri.path);
  }

  readFile(uri: vscode.Uri): Thenable<Uint8Array> {
    const resource = workspaceResource(uri.path);
    return vscode.workspace.fs.readFile(vscode.Uri.joinPath(this.extensionUri, "resources", resource.path.slice(1)));
  }

  writeFile(): never {
    throw vscode.FileSystemError.NoPermissions("Algor Note workspace is read-only");
  }

  delete(): never {
    throw vscode.FileSystemError.NoPermissions("Algor Note workspace is read-only");
  }

  rename(): never {
    throw vscode.FileSystemError.NoPermissions("Algor Note workspace is read-only");
  }

  createDirectory(): never {
    throw vscode.FileSystemError.NoPermissions("Algor Note workspace is read-only");
  }

  watch(): vscode.Disposable {
    return new vscode.Disposable(() => {});
  }
}
