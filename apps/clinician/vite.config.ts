import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Plain DOM + CSS. The UI used to be written against react-native primitives aliased
// to react-native-web; that alias and the dependency are gone.
export default defineConfig({
  build: { outDir: "dist" },
  plugins: [react()]
});
