import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist-electron",
    target: "node16",
    rollupOptions: {
      input: "electron/main.ts",
    },
  },
});
