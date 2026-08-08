import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await readFile(path.join(repositoryRoot, "package.json"), "utf8"));
const directPackages = Object.keys({
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
});

const requiredFiles = [
  "vendor/excalidraw/LICENSE-excalidraw",
  "vendor/excalidraw/LICENSE-react",
  "vendor/excalidraw/LICENSE-react-dom",
  "vendor/excalidraw/VENDOR-NOTES.md",
];

for (const relativePath of requiredFiles) {
  await access(path.join(repositoryRoot, relativePath));
}

for (const packageName of directPackages) {
  const packagePath = path.join(repositoryRoot, "node_modules", ...packageName.split("/"), "package.json");
  const metadata = JSON.parse(await readFile(packagePath, "utf8"));
  if (!metadata.license && !metadata.licenses) {
    throw new Error(`Missing license metadata for direct package: ${packageName}`);
  }
}

const bundle = await readFile(path.join(repositoryRoot, "vendor/excalidraw/excalidraw.js"), "utf8");
if (!bundle.includes("Bundled license information") && !bundle.includes("bundled license information")) {
  throw new Error("Vendored Excalidraw bundle is missing its bundled-license section");
}

console.log(`Verified license metadata for ${directPackages.length} direct packages and vendored Excalidraw notices`);
