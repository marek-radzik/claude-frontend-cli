/**
 * Two manifests:
 *  1. The KIT manifest (`manifest.json` at the package root) — the declarative
 *     catalog of everything cfc can install. Read-only.
 *  2. The INSTALL manifest (`.claude/.cfc-manifest.json` in the target project)
 *     — records what was written and its content hash, so `sync` can detect
 *     drift, report unchanged, and clean stale files.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { kitPath } from "./paths.js";

export type Layer = "generic" | "template" | "optional";
export type Strategy =
  | "copy"
  | "template"
  | "template-once"
  | "skip-if-exists"
  | "rules-block"
  | "env-file";

export interface PlaceholderDef {
  key: string;
  prompt: string;
  default: string;
  group: "core" | "jira";
}

export interface StackPreset {
  id: string;
  label: string;
  excludeDocs: string[];
  excludeSkills: string[];
  libraries: string[];
  techTable: [string, string][];
}

export interface EnvKey {
  key: string;
  group: "mcp" | "git" | "project" | "jira";
  required: boolean;
  comment: string;
}

export interface Artifact {
  id: string;
  type: "doc" | "agent" | "settings" | "skill" | "rules" | "instruction" | "script" | "mcp" | "env";
  layer: Layer;
  module?: string;
  strategy: Strategy;
  src?: string;
  dest?: string;
  srcDir?: string;
  destDir?: string;
  glob?: string;
  blockSrc?: string;
  fullSrc?: string;
  executable?: boolean;
}

export interface KitManifest {
  version: number;
  kitRepo: string;
  defaultStack: string;
  stacks: StackPreset[];
  placeholders: PlaceholderDef[];
  envKeys: EnvKey[];
  derived: Record<string, string>;
  artifacts: Artifact[];
}

export function readKitManifest(): KitManifest {
  const raw = readFileSync(kitPath("manifest.json"), "utf8");
  return JSON.parse(raw) as KitManifest;
}

export const KIT_VERSION: string = (() => {
  try {
    const pkg = JSON.parse(readFileSync(kitPath("package.json"), "utf8"));
    return String(pkg.version ?? "0.0.0");
  } catch {
    return "0.0.0";
  }
})();

// ---------------------------------------------------------------------------
// Install manifest (target project side)
// ---------------------------------------------------------------------------

export const INSTALL_MANIFEST_PATH = ".claude/.cfc-manifest.json";

export interface InstalledFile {
  path: string;
  hash: string;
  artifactId: string;
  strategy: Strategy;
}

export interface InstallManifest {
  kitVersion: string;
  installedAt: string | null;
  vars: Record<string, string>;
  modules: string[];
  files: InstalledFile[];
}

export function contentHash(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

export function readInstallManifest(projectRoot: string): InstallManifest | null {
  const p = join(projectRoot, INSTALL_MANIFEST_PATH);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as InstallManifest;
  } catch {
    return null;
  }
}

export function writeInstallManifest(projectRoot: string, manifest: InstallManifest): void {
  const p = join(projectRoot, INSTALL_MANIFEST_PATH);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}
