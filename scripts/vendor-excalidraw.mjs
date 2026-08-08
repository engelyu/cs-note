// Regenerate the pinned Excalidraw runtime from the versions in package.json.
// This is an authoring-time vendor step; the site serves the committed output.

import { build } from "esbuild";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outputDirectory = path.join(root, "vendor", "excalidraw");
const temporaryDirectory = path.join(root, ".vendor-tmp");
const define = { "process.env.NODE_ENV": '"production"' };

mkdirSync(outputDirectory, { recursive: true });
mkdirSync(temporaryDirectory, { recursive: true });

const reactNames = [
  "Activity", "Children", "Component", "Fragment", "Profiler", "PureComponent",
  "StrictMode", "Suspense", "act", "cache", "cacheSignal", "captureOwnerStack",
  "cloneElement", "createContext", "createElement", "createRef", "forwardRef",
  "isValidElement", "lazy", "memo", "startTransition", "unstable_useCacheRefresh", "use",
  "useActionState", "useCallback", "useContext", "useDebugValue", "useDeferredValue",
  "useEffect", "useEffectEvent", "useId", "useImperativeHandle", "useInsertionEffect",
  "useLayoutEffect", "useMemo", "useOptimistic", "useReducer", "useRef", "useState",
  "useSyncExternalStore", "useTransition", "version",
];

writeFileSync(path.join(temporaryDirectory, "react-entry.mjs"), `
import React, { ${reactNames.join(", ")} } from "react";
export default React;
export { ${reactNames.join(", ")} };
if (typeof window !== "undefined") {
  window.require = window.require || function (name) {
    if (name === "react") return React;
    throw new Error("No vendored shim for require(\\\"" + name + "\\\")");
  };
}
`);

const reactDomNames = [
  "createPortal", "flushSync", "preconnect", "prefetchDNS", "preinit", "preinitModule",
  "preload", "preloadModule", "requestFormReset", "unstable_batchedUpdates",
  "useFormState", "useFormStatus", "version",
];

writeFileSync(path.join(temporaryDirectory, "react-dom-entry.mjs"), `
import __reactForLoadOrder from "react";
export const __reactLoadOrderGuard = __reactForLoadOrder;
import { ${reactDomNames.join(", ")} } from "react-dom";
import { createRoot, hydrateRoot } from "react-dom/client";
export { ${reactDomNames.join(", ")}, createRoot, hydrateRoot };
export default { ${reactDomNames.join(", ")}, createRoot, hydrateRoot };
`);

writeFileSync(path.join(temporaryDirectory, "jsx-runtime-entry.mjs"), `
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
export { Fragment, jsx, jsxs };
`);

const jobs = [
  { entry: "react-entry.mjs", output: "react.js", external: [] },
  { entry: "react-dom-entry.mjs", output: "react-dom.js", external: ["react"] },
  { entry: "jsx-runtime-entry.mjs", output: "react-jsx-runtime.js", external: [] },
];

for (const job of jobs) {
  await build({
    entryPoints: [path.join(temporaryDirectory, job.entry)],
    bundle: true,
    format: "esm",
    platform: "browser",
    minify: true,
    define,
    external: job.external,
    outfile: path.join(outputDirectory, job.output),
  });
}

const excalidrawPackage = path.join(root, "node_modules", "@excalidraw", "excalidraw");
await build({
  entryPoints: [path.join(excalidrawPackage, "dist", "prod", "index.js")],
  bundle: true,
  format: "esm",
  platform: "browser",
  minify: true,
  define,
  external: ["react", "react-dom", "react-dom/client", "react/jsx-runtime"],
  outfile: path.join(outputDirectory, "excalidraw.js"),
});

cpSync(path.join(excalidrawPackage, "dist", "prod", "index.css"), path.join(outputDirectory, "excalidraw.css"));
rmSync(path.join(outputDirectory, "fonts"), { recursive: true, force: true });
cpSync(path.join(excalidrawPackage, "dist", "prod", "fonts"), path.join(outputDirectory, "fonts"), { recursive: true });

for (const [dependency, output] of [["react", "LICENSE-react"], ["react-dom", "LICENSE-react-dom"]]) {
  const license = path.join(root, "node_modules", dependency, "LICENSE");
  if (existsSync(license)) cpSync(license, path.join(outputDirectory, output));
}

rmSync(temporaryDirectory, { recursive: true, force: true });
await import("./patch-excalidraw-tools.mjs");
console.log("Regenerated and patched vendor/excalidraw.");
