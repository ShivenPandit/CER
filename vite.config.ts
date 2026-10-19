import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@microsoft/sp-http": path.resolve(__dirname, "src/stubs/sp-stub.ts"),
      "@microsoft/sp-core-library": path.resolve(__dirname, "src/stubs/sp-stub.ts"),
      "@microsoft/sp-webpart-base": path.resolve(__dirname, "src/stubs/sp-stub.ts"),
      "@microsoft/sp-component-base": path.resolve(__dirname, "src/stubs/sp-stub.ts"),
      "@microsoft/sp-property-pane": path.resolve(__dirname, "src/stubs/sp-stub.ts"),
      "@microsoft/sp-lodash-subset": path.resolve(__dirname, "src/stubs/sp-stub.ts"),
    },
  },
  optimizeDeps: {
    exclude: [
      "@microsoft/sp-http",
      "@microsoft/sp-core-library",
      "@microsoft/sp-webpart-base",
      "@microsoft/sp-component-base",
      "@microsoft/sp-property-pane",
      "@microsoft/sp-lodash-subset",
    ],
  },
  server: {
    port: 3000,
    open: false,
  },
  define: {
    "process.env": {},
  },
});
