/**
 * Read/write the answered template vars for a project. Persisted inside the
 * install manifest (`.claude/.cfc-manifest.json`) so `sync`/`get` can re-render
 * templates without re-prompting.
 */

import { readInstallManifest } from "./manifest.js";

export function readSavedVars(projectRoot: string): Record<string, string> {
  const m = readInstallManifest(projectRoot);
  return m?.vars ?? {};
}

export function readInstalledModules(projectRoot: string): string[] {
  const m = readInstallManifest(projectRoot);
  return m?.modules ?? [];
}
