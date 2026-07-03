/**
 * Resolve paths inside the installed kit package (where `content/`, `skills/`
 * and `manifest.json` live) regardless of where `cfc` is invoked from.
 *
 * At runtime the built entry is `<pkg>/dist/index.js`, so the package root is
 * one directory up from this module's directory.
 */

import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { existsSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
// dist/ (bundled) -> package root is one up. In dev (tsx) this file sits in
// src/lib/, so walk up. We detect by checking for manifest.json.
function findKitRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 6; i++) {
    // manifest.json marks the package root.
    if (existsSync(join(dir, "manifest.json"))) return dir;
    dir = resolve(dir, "..");
  }
  // Fallback: assume one level up from dist.
  return resolve(start, "..");
}

export const KIT_ROOT = findKitRoot(here);

/** Absolute path to a file inside the kit package. */
export function kitPath(...segments: string[]): string {
  return join(KIT_ROOT, ...segments);
}
