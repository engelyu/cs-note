import { access, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCodeOssConfig } from "./config.mjs";

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

export async function fetchCodeOss(config, run = runCommand) {
  await mkdir(config.cacheDirectory, { recursive: true });
  if (!(await exists(path.join(config.cacheDirectory, ".git")))) {
    await run("git", ["init"], config.cacheDirectory);
    await run("git", ["remote", "add", "origin", config.repository], config.cacheDirectory);
  }
  await run("git", ["fetch", "--depth", "1", "origin", config.commit], config.cacheDirectory);
  await run("git", ["checkout", "--detach", "FETCH_HEAD"], config.cacheDirectory);
  const actual = (await run("git", ["rev-parse", "HEAD"], config.cacheDirectory)).trim();
  if (actual !== config.commit) throw new Error(`Expected Code-OSS ${config.commit}, received ${actual}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await fetchCodeOss(await loadCodeOssConfig(process.cwd()));
}
