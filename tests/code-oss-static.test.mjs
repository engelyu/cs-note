import assert from "node:assert/strict";
import { access, mkdtemp, mkdir, readFile, rm, stat, truncate, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildCodeOss, verifyStaticOutput } from "../scripts/code-oss/build.mjs";
import { fetchCodeOss } from "../scripts/code-oss/fetch.mjs";
import { renderWorkbench } from "../scripts/code-oss/render-workbench.mjs";

async function makeStaticOutput(t, index = "") {
  const output = await mkdtemp(path.join(os.tmpdir(), "algor-code-oss-static-"));
  t.after(() => rm(output, { recursive: true, force: true }));
  await mkdir(path.join(output, "out"), { recursive: true });
  await mkdir(path.join(output, "resources"), { recursive: true });
  await mkdir(path.join(output, "extensions", "algor-note"), { recursive: true });
  await writeFile(path.join(output, "index.html"), index);
  await mkdir(path.join(output, "out", "vs", "workbench"), { recursive: true });
  await writeFile(path.join(output, "out", "vs", "workbench", "workbench.web.main.js"), "workbench");
  await mkdir(path.join(output, "extensions", "algor-note", "dist", "webview", "assets"), { recursive: true });
  await mkdir(path.join(output, "extensions", "algor-note", "resources", "workspace"), { recursive: true });
  await writeFile(path.join(output, "extensions", "algor-note", "package.json"), "{}");
  await writeFile(path.join(output, "extensions", "algor-note", "dist", "extension.js"), "extension");
  await writeFile(path.join(output, "extensions", "algor-note", "dist", "webview", "assets", "main.js"), "webview");
  await writeFile(path.join(output, "extensions", "algor-note", "resources", "workspace", "tarjan.algor.json"), "{}");
  await writeFile(
    path.join(output, "extensions", "algor-note", "resources", "workspace", "tarjan.ts"),
    await readFile(path.resolve("src/visualizations/tarjan.ts")),
  );
  return output;
}

function collectLocalUrls(content) {
  const urls = [];
  const attributeUrls = /\b(?:src|href|action|poster|manifest|data-src|data-href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  for (const match of content.matchAll(attributeUrls)) {
    const value = match.slice(1).find(Boolean);
    if (value?.startsWith("/")) urls.push(value);
  }
  return urls;
}

test("assembled Code-OSS output contains the workbench, extension, workspace, and local assets", async () => {
  const outputRoot = path.resolve("dist/code-oss-web");
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
  assert.equal((await stat(path.join(outputRoot, "resources"))).isDirectory(), true);
  assert.deepEqual(JSON.parse(await readFile(
    path.join(outputRoot, "extensions/algor-note/resources/workspace/tarjan.algor.json"),
    "utf8",
  )), {
    schemaVersion: 1,
    packageId: "tarjan-scc",
    scenarioId: "simple-cycle",
    title: "Tarjan's Strongly Connected Components",
    artifact: "src/visualizations/tarjanArtifact.json",
    source: "src/visualizations/tarjan.ts",
    readOnly: true,
  });
  assert.equal(
    Buffer.compare(
      await readFile(path.join(outputRoot, "extensions/algor-note/resources/workspace/tarjan.ts")),
      await readFile(path.resolve("src/visualizations/tarjan.ts")),
    ),
    0,
  );
  for (const url of collectLocalUrls(await readFile(path.join(outputRoot, "index.html"), "utf8"))) {
    assert.ok(url.startsWith("/cs-note/"));
    await access(path.join(outputRoot, url.slice("/cs-note/".length)));
  }
});

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

test("workbench rendering produces a parseable Algor Note configuration", () => {
  const html = renderWorkbench({
    template: '<meta data-settings="{{WORKBENCH_WEB_CONFIGURATION}}" data-builtins="{{WORKBENCH_BUILTIN_EXTENSIONS}}" href="{{WORKBENCH_WEB_BASE_URL}}/out/loader.js"><main>{{WORKBENCH_MAIN}}</main>',
    base: "/cs-note/",
    extensionUri: "/cs-note/extensions/algor-note/",
    folderUri: "algor-note-vfs:/workspace",
  });
  const encoded = html.match(/data-settings="([^"]+)"/)?.[1];
  assert.ok(encoded);
  const configuration = JSON.parse(encoded
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&"));
  assert.deepEqual(configuration, {
    folderUri: "algor-note-vfs:/workspace",
    productConfiguration: { nameShort: "Algor Note", nameLong: "Algor Note" },
    additionalBuiltinExtensions: [{
      scheme: "https",
      authority: "static",
      path: "/cs-note/extensions/algor-note/",
    }],
  });
  assert.match(html, /href="\/cs-note\/out\/loader\.js"/);
  assert.doesNotMatch(html, /\{\{WORKBENCH_/);
  assert.match(html, /src="\/cs-note\/out\/vs\/workbench\/workbench\.web\.main\.js"/);
});

test("Code-OSS fetch initializes and verifies the pinned checkout", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "algor-code-oss-fetch-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const commit = "6928394f91b684055b873eecb8bc281365131f1c";
  const config = {
    repository: "https://github.com/microsoft/vscode.git",
    commit,
    cacheDirectory: path.join(root, "cache"),
  };
  const calls = [];
  const run = async (command, args, cwd) => {
    calls.push({ command, args, cwd });
    return command === "git" && args[0] === "rev-parse" ? `${commit}\n` : "";
  };

  await fetchCodeOss(config, run);

  assert.deepEqual(calls, [
    { command: "git", args: ["init"], cwd: config.cacheDirectory },
    { command: "git", args: ["remote", "add", "origin", config.repository], cwd: config.cacheDirectory },
    { command: "git", args: ["fetch", "--depth", "1", "origin", commit], cwd: config.cacheDirectory },
    { command: "git", args: ["checkout", "--detach", "FETCH_HEAD"], cwd: config.cacheDirectory },
    { command: "git", args: ["rev-parse", "HEAD"], cwd: config.cacheDirectory },
  ]);
  assert.equal((await stat(config.cacheDirectory)).isDirectory(), true);
});

test("Code-OSS fetch reports a pinned commit mismatch without deleting the cache", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "algor-code-oss-fetch-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const commit = "6928394f91b684055b873eecb8bc281365131f1c";
  const config = {
    repository: "https://github.com/microsoft/vscode.git",
    commit,
    cacheDirectory: path.join(root, "cache"),
  };
  await mkdir(config.cacheDirectory, { recursive: true });
  await writeFile(path.join(config.cacheDirectory, "keep.txt"), "keep");
  const run = async (command, args) => command === "git" && args[0] === "rev-parse"
    ? "0123456789abcdef0123456789abcdef01234567\n"
    : "";

  await assert.rejects(
    fetchCodeOss(config, run),
    new Error(`Expected Code-OSS ${commit}, received 0123456789abcdef0123456789abcdef01234567`),
  );
  assert.equal((await stat(config.cacheDirectory)).isDirectory(), true);
  assert.equal(await readFile(path.join(config.cacheDirectory, "keep.txt"), "utf8"), "keep");
});

test("Code-OSS fetch adds origin when an existing cache has no origin", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "algor-code-oss-fetch-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const commit = "6928394f91b684055b873eecb8bc281365131f1c";
  const config = {
    repository: "https://github.com/microsoft/vscode.git",
    commit,
    cacheDirectory: path.join(root, "cache"),
  };
  await mkdir(path.join(config.cacheDirectory, ".git"), { recursive: true });
  const calls = [];
  const run = async (command, args, cwd) => {
    calls.push({ command, args, cwd });
    if (args[0] === "remote" && args.length === 1) return "";
    return args[0] === "rev-parse" ? `${commit}\n` : "";
  };

  await fetchCodeOss(config, run);

  assert.deepEqual(calls, [
    { command: "git", args: ["remote"], cwd: config.cacheDirectory },
    { command: "git", args: ["remote", "add", "origin", config.repository], cwd: config.cacheDirectory },
    { command: "git", args: ["fetch", "--depth", "1", "origin", commit], cwd: config.cacheDirectory },
    { command: "git", args: ["checkout", "--detach", "FETCH_HEAD"], cwd: config.cacheDirectory },
    { command: "git", args: ["rev-parse", "HEAD"], cwd: config.cacheDirectory },
  ]);
});

test("Code-OSS fetch replaces a stale origin in an existing cache", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "algor-code-oss-fetch-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const commit = "6928394f91b684055b873eecb8bc281365131f1c";
  const config = {
    repository: "https://github.com/microsoft/vscode.git",
    commit,
    cacheDirectory: path.join(root, "cache"),
  };
  await mkdir(path.join(config.cacheDirectory, ".git"), { recursive: true });
  const calls = [];
  const run = async (command, args, cwd) => {
    calls.push({ command, args, cwd });
    if (args[0] === "remote" && args[1] === "get-url") return "https://example.invalid/stale.git\n";
    if (args[0] === "remote" && args.length === 1) return "origin\n";
    return args[0] === "rev-parse" ? `${commit}\n` : "";
  };

  await fetchCodeOss(config, run);

  assert.deepEqual(calls, [
    { command: "git", args: ["remote"], cwd: config.cacheDirectory },
    { command: "git", args: ["remote", "get-url", "origin"], cwd: config.cacheDirectory },
    { command: "git", args: ["remote", "remove", "origin"], cwd: config.cacheDirectory },
    { command: "git", args: ["remote", "add", "origin", config.repository], cwd: config.cacheDirectory },
    { command: "git", args: ["fetch", "--depth", "1", "origin", commit], cwd: config.cacheDirectory },
    { command: "git", args: ["checkout", "--detach", "FETCH_HEAD"], cwd: config.cacheDirectory },
    { command: "git", args: ["rev-parse", "HEAD"], cwd: config.cacheDirectory },
  ]);
});

test("static verification accepts project-subpath HTML and JavaScript URLs", async (t) => {
  const output = await makeStaticOutput(t, '<script src="/cs-note/out/main.js"></script>');
  await writeFile(path.join(output, "out", "main.js"), 'const worker = "/cs-note/out/worker.js";');
  await writeFile(path.join(output, "out", "worker.js"), "worker");

  await verifyStaticOutput(output, "/cs-note/");
});

test("static verification rejects a generated URL outside the Pages subpath", async (t) => {
  const output = await makeStaticOutput(t, '<script src="/assets/main.js"></script>');

  await assert.rejects(verifyStaticOutput(output, "/cs-note/"), /must begin with \/cs-note\//);
});

test("static verification rejects an unquoted root-relative URL", async (t) => {
  const output = await makeStaticOutput(t, "<script src=/assets/main.js></script>");

  await assert.rejects(verifyStaticOutput(output, "/cs-note/"), /must begin with \/cs-note\//);
});

test("static verification rejects protocol-relative URLs in textual assets", async (t) => {
  const output = await makeStaticOutput(t, "<link rel=stylesheet href=/cs-note/out/main.css>");
  await writeFile(path.join(output, "main.css"), "body { background: url(//cdn.example.invalid/font.woff2); }");

  await assert.rejects(verifyStaticOutput(output, "/cs-note/"), /must begin with \/cs-note\//);
});

test("static verification rejects absolute HTTPS URLs in textual assets", async (t) => {
  const output = await makeStaticOutput(t, "<script src=/cs-note/out/main.js></script>");
  await writeFile(path.join(output, "manifest.json"), '{"start_url":"https://cdn.example.invalid/app"}');

  await assert.rejects(verifyStaticOutput(output, "/cs-note/"), /must begin with \/cs-note\//);
});

test("static verification rejects WebSocket and remote-authority markers", async (t) => {
  const output = await makeStaticOutput(t, '<script src="/cs-note/out/main.js"></script>');
  await writeFile(path.join(output, "main.js"), 'const authority = "remoteAuthority"; const socket = "wss://example.invalid";');

  await assert.rejects(verifyStaticOutput(output, "/cs-note/"), /forbidden network marker/);
});

test("static verification rejects output larger than one gigabyte", async (t) => {
  const output = await makeStaticOutput(t);
  await writeFile(path.join(output, "oversized.bin"), "");
  await truncate(path.join(output, "oversized.bin"), 1_073_741_825);

  await assert.rejects(verifyStaticOutput(output, "/cs-note/"), /exceeds 1 GB/);
});

test("static verification requires every assembled output artifact", async (t) => {
  const required = ["index.html", "out", "resources", "extensions/algor-note"];
  for (const missing of required) {
    const output = await mkdtemp(path.join(os.tmpdir(), "algor-code-oss-static-"));
    t.after(() => rm(output, { recursive: true, force: true }));
    for (const artifact of required) {
      if (artifact === missing) continue;
      if (artifact.includes("/")) await mkdir(path.join(output, artifact), { recursive: true });
      else if (artifact === "index.html") await writeFile(path.join(output, artifact), "");
      else await mkdir(path.join(output, artifact), { recursive: true });
    }

    await assert.rejects(
      verifyStaticOutput(output, "/cs-note/"),
      new RegExp(`missing required artifact: ${missing.replaceAll("/", "\\/")}`),
    );
  }
});

test("Code-OSS build assembles the verified workbench and extension", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "algor-code-oss-build-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const cache = path.join(root, "cache");
  const output = path.join(root, "output");
  const minified = path.join(cache, "out-vscode-reh-web-min");
  await mkdir(path.join(cache, "resources"), { recursive: true });
  await mkdir(path.join(minified, "vs", "code", "browser", "workbench"), { recursive: true });
  await mkdir(path.join(minified, "vs", "workbench"), { recursive: true });
  await mkdir(path.join(root, "extensions", "algor-note"), { recursive: true });
  await mkdir(path.join(root, "extensions", "algor-note", "dist", "webview", "assets"), { recursive: true });
  await mkdir(path.join(root, "extensions", "algor-note", "resources", "workspace"), { recursive: true });
  await writeFile(path.join(cache, "resources", "marker.txt"), "resources");
  await writeFile(path.join(minified, "vs", "code", "browser", "workbench", "workbench.html"),
    '<main data-settings="{{WORKBENCH_WEB_CONFIGURATION}}">{{WORKBENCH_MAIN}}</main>');
  await writeFile(path.join(minified, "vs", "workbench", "workbench.web.main.js"), "workbench");
  await writeFile(path.join(minified, "main.js"), "out");
  await writeFile(path.join(root, "extensions", "algor-note", "package.json"), '{"name":"algor-note"}');
  await writeFile(path.join(root, "extensions", "algor-note", "dist", "extension.js"), "extension");
  await writeFile(path.join(root, "extensions", "algor-note", "dist", "webview", "assets", "main.js"), "webview");
  await writeFile(path.join(root, "extensions", "algor-note", "resources", "workspace", "tarjan.algor.json"), "{}");
  await writeFile(
    path.join(root, "extensions", "algor-note", "resources", "workspace", "tarjan.ts"),
    await readFile(path.resolve("src/visualizations/tarjan.ts")),
  );
  const config = {
    repository: "https://github.com/microsoft/vscode.git",
    commit: "6928394f91b684055b873eecb8bc281365131f1c",
    cacheDirectory: cache,
    outputDirectory: output,
    pagesBase: "/cs-note/",
  };
  const commands = [];
  let fetched = false;

  await buildCodeOss(config, {
    fetch: async (received) => { fetched = received === config; },
    run: async (command, args, cwd) => { commands.push({ command, args, cwd }); return ""; },
    root,
  });

  assert.equal(fetched, true);
  assert.deepEqual(commands, [
    { command: "npm", args: ["ci"], cwd: cache },
    { command: "npm", args: ["run", "gulp", "compile-build"], cwd: cache },
    { command: "npm", args: ["run", "gulp", "minify-vscode-reh-web"], cwd: cache },
    { command: "npm", args: ["run", "build:code-oss-extension"], cwd: root },
    { command: "npm", args: ["run", "build:code-oss-webview"], cwd: root },
  ]);
  assert.equal(await readFile(path.join(output, "resources", "marker.txt"), "utf8"), "resources");
  assert.equal(await readFile(path.join(output, "out", "main.js"), "utf8"), "out");
  assert.match(await readFile(path.join(output, "index.html"), "utf8"), /Algor Note/);
  assert.equal(await readFile(path.join(output, "extensions", "algor-note", "package.json"), "utf8"), '{"name":"algor-note"}');
  await verifyStaticOutput(output, "/cs-note/");
});

test("Code-OSS build fails when a required upstream directory is missing", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "algor-code-oss-build-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const cache = path.join(root, "cache");
  const minified = path.join(cache, "out-vscode-reh-web-min");
  await mkdir(path.join(minified, "vs", "code", "browser", "workbench"), { recursive: true });
  await writeFile(path.join(minified, "vs", "code", "browser", "workbench", "workbench.html"), "");
  const config = {
    repository: "https://github.com/microsoft/vscode.git",
    commit: "6928394f91b684055b873eecb8bc281365131f1c",
    cacheDirectory: cache,
    outputDirectory: path.join(root, "output"),
    pagesBase: "/cs-note/",
  };

  await assert.rejects(
    buildCodeOss(config, { fetch: async () => {}, run: async () => "", root }),
    /Required Code-OSS path is missing/,
  );
});
