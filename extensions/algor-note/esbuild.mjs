import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["extensions/algor-note/src/extension.ts"],
  outfile: "extensions/algor-note/dist/extension.js",
  bundle: true,
  platform: "browser",
  format: "cjs",
  external: ["vscode"],
  sourcemap: true,
});
