import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// gonefishing.gg's API sends no CORS headers, so the dev server relays it under /gf-api.
// Read-only allow-list: only what this app uses (profiles, catch logs, single catches, the live catch stream).
const ALLOW = /^\/gf-api\/(player\/|catch\/\d+$|liveview\/recent|seasons|challenges)/;

export default defineConfig({
  plugins: [react()],
  // live/public is filled by scripts/prepare-public.mjs (map images from ../source/maps + the field guide)
  publicDir: "public",
  server: {
    port: 5173,
    host: "127.0.0.1",
    fs: { allow: [".."] },
    proxy: {
      "/gf-api": {
        target: "https://gonefishing.gg",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/gf-api/, "/api"),
        headers: { "User-Agent": "GONE Fishing field guide (local session tracker)" },
        bypass: (req) => (ALLOW.test(req.url ?? "") ? undefined : false), // false -> 404
      },
    },
  },
});
