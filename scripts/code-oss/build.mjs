import { access, cp, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCodeOssConfig } from "./config.mjs";
import { fetchCodeOss } from "./fetch.mjs";
import { renderWorkbench } from "./render-workbench.mjs";

const MAX_OUTPUT_BYTES = 1_000_000_000;
const TEXT_ASSET_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".map",
  ".mjs",
  ".svg",
  ".txt",
  ".webmanifest",
  ".xml",
]);
const REQUIRED_FILES = [
  "index.html",
  "out/vs/workbench/workbench.web.main.js",
  "extensions/algor-note/package.json",
  "extensions/algor-note/dist/extension.js",
  "extensions/algor-note/dist/webview/assets/main.js",
  "extensions/algor-note/resources/workspace/tarjan.algor.json",
  "extensions/algor-note/resources/workspace/tarjan.ts",
];
const REQUIRED_DIRECTORIES = ["out", "resources", "extensions/algor-note"];

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }
      const details = stderr.trim() || `exited with code ${code}`;
      reject(new Error(`${command} ${args.join(" ")} failed: ${details}`));
    });
  });
}

async function exists(value) {
  try {
    await access(value);
    return true;
  } catch {
    return false;
  }
}

async function copyRequired(source, destination) {
  if (!(await exists(source))) throw new Error(`Required Code-OSS path is missing: ${source}`);
  if (!(await stat(source)).isDirectory()) throw new Error(`Required Code-OSS directory is missing: ${source}`);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true, force: true });
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const value = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(value));
    else if (entry.isFile()) files.push(value);
  }
  return files;
}

function verifyProjectUrls(content, file, base) {
  const candidates = [];
  const attributeUrls = /\b(?:src|href|action|poster|manifest|data-src|data-href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  const cssUrls = /\burl\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)/gi;
  const quotedUrls = /["'`]((?:\/(?!\/)|\/\/|https?:\/\/|wss?:\/\/)[^"'`\s<>()]*)["'`]/gi;
  const bareUrls = /(?:https?:\/\/|wss?:\/\/|\/\/[A-Za-z0-9.-]+(?:\/[^\s"'<>)]*)?)/g;
  for (const pattern of [attributeUrls, cssUrls, quotedUrls, bareUrls]) {
    for (const match of content.matchAll(pattern)) {
      const value = match.slice(1).find(Boolean) ?? match[0];
      if (/^(?:\/|https?:\/\/|wss?:\/\/)/.test(value)) candidates.push(value);
    }
  }
  for (const value of candidates) {
    if (!value.startsWith(base)) {
      throw new Error(`Generated URL in ${file} must begin with ${base}: ${value}`);
    }
  }
}

export async function verifyStaticOutput(outputDirectory, base, root = process.cwd()) {
  for (const relative of REQUIRED_DIRECTORIES) {
    const value = path.join(outputDirectory, relative);
    if (!(await exists(value))) throw new Error(`Static Code-OSS output is missing required artifact: ${relative}`);
    if (!(await stat(value)).isDirectory()) throw new Error(`Static Code-OSS output requires a directory artifact: ${relative}`);
  }
  for (const relative of REQUIRED_FILES) {
    const value = path.join(outputDirectory, relative);
    if (!(await exists(value))) throw new Error(`Static Code-OSS output is missing required artifact: ${relative}`);
    if (!(await stat(value)).isFile()) throw new Error(`Static Code-OSS output requires a file artifact: ${relative}`);
  }
  const source = await readFile(path.join(root, "src/visualizations/tarjan.ts"));
  const copiedSource = await readFile(path.join(
    outputDirectory,
    "extensions/algor-note/resources/workspace/tarjan.ts",
  ));
  if (Buffer.compare(source, copiedSource) !== 0) {
    throw new Error("Static Code-OSS output contains a stale Tarjan workspace source copy");
  }
  const files = await collectFiles(outputDirectory);
  let totalBytes = 0;
  for (const file of files) {
    totalBytes += (await stat(file)).size;
    if (totalBytes >= MAX_OUTPUT_BYTES) throw new Error("Static Code-OSS output exceeds 1 GB");
    if (!TEXT_ASSET_EXTENSIONS.has(path.extname(file).toLowerCase())) continue;
    const content = await readFile(file, "utf8");
    if (/remoteAuthority|ws:\/\/|wss:\/\//.test(content)) {
      throw new Error(`Static Code-OSS output contains a forbidden network marker: ${file}`);
    }
    verifyProjectUrls(content, file, base);
  }
}

async function assembleCodeOss(config, root) {
  const minifiedDirectory = path.join(config.cacheDirectory, "out-vscode-reh-web-min");
  const template = await readFile(
    path.join(minifiedDirectory, "vs", "code", "browser", "workbench", "workbench.html"),
    "utf8",
  );
  await mkdir(config.outputDirectory, { recursive: true });
  await copyRequired(path.join(config.cacheDirectory, "resources"), path.join(config.outputDirectory, "resources"));
  await copyRequired(minifiedDirectory, path.join(config.outputDirectory, "out"));
  await writeFile(path.join(config.outputDirectory, "index.html"), renderWorkbench({
    template,
    base: config.pagesBase,
    extensionUri: `${config.pagesBase}extensions/algor-note/`,
    folderUri: "algor-note-vfs:/workspace",
  }));
  await copyRequired(path.join(root, "extensions/algor-note"), path.join(config.outputDirectory, "extensions/algor-note"));
}

export async function buildCodeOss(config, { fetch = fetchCodeOss, run = runCommand, root = process.cwd() } = {}) {
  await fetch(config);
  await run("npm", ["ci"], config.cacheDirectory);
  await run("npm", ["run", "gulp", "compile-build"], config.cacheDirectory);
  await run("npm", ["run", "gulp", "minify-vscode-reh-web"], config.cacheDirectory);
  await run("npm", ["run", "build:code-oss-extension"], root);
  await run("npm", ["run", "build:code-oss-webview"], root);
  await assembleCodeOss(config, root);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = await loadCodeOssConfig(process.cwd());
  if (process.argv[2] === "--verify") await verifyStaticOutput(config.outputDirectory, config.pagesBase, process.cwd());
  else await buildCodeOss(config);
}
