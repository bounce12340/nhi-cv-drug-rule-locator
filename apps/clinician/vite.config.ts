import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// react-native-web provides the View/Text/Pressable primitives App.tsx is written against,
// so the UI needs no rewrite to run as a plain web bundle.
export default defineConfig({
  build: { outDir: "dist" },
  define: { __DEV__: "false", "process.env.NODE_ENV": '"production"' },
  plugins: [react()],
  resolve: {
    alias: { "react-native": "react-native-web" },
    extensions: [".web.tsx", ".web.ts", ".tsx", ".ts", ".jsx", ".js"]
  }
});
