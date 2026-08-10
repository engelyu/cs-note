import { access, cp, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCodeOssConfig } from "./config.mjs";
import { fetchCodeOss } from "./fetch.mjs";
import { renderWorkbench } from "./render-workbench.mjs";

const MAX_OUTPUT_BYTES = 1_000_000_000;

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
  const urls = content.matchAll(/["'`]((?:\/)(?!\/)[^"'`\s<>()]*)["'`]/g);
  for (const match of urls) {
    if (!match[1].startsWith(base)) {
      throw new Error(`Generated URL in ${file} must begin with ${base}: ${match[1]}`);
    }
  }
}

export async function verifyStaticOutput(outputDirectory, base) {
  if (!(await exists(path.join(outputDirectory, "index.html")))) {
    throw new Error(`Static Code-OSS output is missing index.html: ${outputDirectory}`);
  }
  const files = await collectFiles(outputDirectory);
  let totalBytes = 0;
  for (const file of files) {
    totalBytes += (await stat(file)).size;
    if (totalBytes >= MAX_OUTPUT_BYTES) throw new Error("Static Code-OSS output exceeds 1 GB");
    if (!/[.](?:html|js|mjs|cjs)$/i.test(file)) continue;
    const content = await readFile(file, "utf8");
    if (/remoteAuthority|ws:\/\/|wss:\/\//.test(content)) {
      throw new Error(`Static Code-OSS output contains a forbidden network marker: ${file}`);
    }
    verifyProjectUrls(content, file, base);
  }
}

export async function buildCodeOss(config, { fetch = fetchCodeOss, run = runCommand, root = process.cwd() } = {}) {
  await fetch(config);
  await run("npm", ["ci"], config.cacheDirectory);
  await run("npm", ["run", "gulp", "compile-build"], config.cacheDirectory);
  await run("npm", ["run", "gulp", "minify-vscode-reh-web"], config.cacheDirectory);

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

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = await loadCodeOssConfig(process.cwd());
  if (process.argv[2] === "--verify") await verifyStaticOutput(config.outputDirectory, config.pagesBase);
  else await buildCodeOss(config);
}
