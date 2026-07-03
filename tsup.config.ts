import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  clean: true,
  minify: false,
  sourcemap: true,
  // Content and skills are shipped as-is (see package.json "files") and read
  // from disk at runtime relative to the package root — they are NOT bundled.
  banner: {
    js: "#!/usr/bin/env node",
  },
});
