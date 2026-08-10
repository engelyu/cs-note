import { readFile } from "node:fs/promises";
import path from "node:path";

export function normalizePagesBase(value) {
  if (!value.startsWith("/")) throw new Error("Pages base must start with /");
  const normalized = `${value.replace(/\/+$/, "")}/`;
  if (normalized === "/") throw new Error("Pages base must use a project subpath");
  return normalized;
}

export async function loadCodeOssConfig(root) {
  const value = JSON.parse(await readFile(path.join(root, "code-oss/upstream.json"), "utf8"));
  for (const key of ["repository", "ref", "commit", "cacheDirectory", "outputDirectory", "pagesBase"]) {
    if (typeof value[key] !== "string" || value[key].length === 0) throw new Error(`Invalid Code-OSS config field: ${key}`);
  }
  return {
    ...value,
    pagesBase: normalizePagesBase(value.pagesBase),
    cacheDirectory: path.resolve(root, value.cacheDirectory),
    outputDirectory: path.resolve(root, value.outputDirectory),
  };
}
