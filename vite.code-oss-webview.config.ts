import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const excalidrawVendor = path.resolve(process.cwd(), "vendor/excalidraw");
const excalidrawAliases = [
  { find: /^react-dom\/client$/, replacement: `${excalidrawVendor}/react-dom.js` },
  { find: /^react-dom$/, replacement: `${excalidrawVendor}/react-dom.js` },
  { find: /^react\/jsx-runtime$/, replacement: `${excalidrawVendor}/react-jsx-runtime.js` },
  { find: /^react$/, replacement: `${excalidrawVendor}/react.js` },
];

export default defineConfig({
  root: "src/codeOssWebview",
  base: "./",
  plugins: [react({ jsxRuntime: "classic" })],
  build: {
    outDir: "../../extensions/algor-note/dist/webview",
    emptyOutDir: true,
    rollupOptions: {
      input: "index.html",
      output: {
        entryFileNames: "assets/main.js",
        assetFileNames: (assetInfo) => assetInfo.name?.endsWith(".css") ? "assets/main.css" : "assets/[name][extname]",
      },
    },
  },
  resolve: { alias: excalidrawAliases },
});
