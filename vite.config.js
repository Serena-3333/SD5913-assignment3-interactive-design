import { defineConfig } from "vite";
const projectBase = "/SD5913-assignment3-interactive-design/";
export default defineConfig(({ command, isPreview }) => ({
  base: command === "build" || isPreview ? projectBase : "/",
  build: { rollupOptions: { output: { manualChunks: { three: ["three"] } } } },
}));
