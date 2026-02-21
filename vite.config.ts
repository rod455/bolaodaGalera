import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      external: [
        "@codetrix-studio/capacitor-google-auth",
        "@capacitor/app",
      ],
      output: {
        globals: {
          "@codetrix-studio/capacitor-google-auth": "CapacitorGoogleAuth",
          "@capacitor/app": "CapacitorApp",
        },
      },
    },
  },
}));
