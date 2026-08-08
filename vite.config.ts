import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const excalidrawVendor = path.resolve(process.cwd(), "vendor/excalidraw");

export default defineConfig({
  plugins: [react({ jsxRuntime: "classic" })],
  resolve: {
    alias: [
      { find: /^react-dom\/client$/, replacement: `${excalidrawVendor}/react-dom.js` },
      { find: /^react-dom$/, replacement: `${excalidrawVendor}/react-dom.js` },
      { find: /^react\/jsx-runtime$/, replacement: `${excalidrawVendor}/react-jsx-runtime.js` },
      { find: /^react$/, replacement: `${excalidrawVendor}/react.js` },
    ],
  },
  optimizeDeps: { entries: ["index.html"] },
  server: { port: 4173 },
});
