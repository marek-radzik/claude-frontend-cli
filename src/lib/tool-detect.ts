/**
 * Detect the state of the target project: is Claude Code already set up, does
 * it have the npm scripts our skills rely on, is a prior cfc install present.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getProfile } from "./tool-profile.js";
import { INSTALL_MANIFEST_PATH } from "./manifest.js";

export interface ProjectState {
  projectRoot: string;
  hasPackageJson: boolean;
  hasClaudeDir: boolean;
  hasRulesFile: boolean;
  hasCfcInstall: boolean;
  /** npm scripts present in package.json (subset we care about). */
  scripts: Record<string, boolean>;
  /** True when neither .claude nor CLAUDE.md exists → bootstrap from scratch. */
  isFreshInit: boolean;
}

const RELEVANT_SCRIPTS = ["lint", "lint:style", "type-check", "test:unit", "dev"];

export function detectProject(projectRoot: string, toolId?: string): ProjectState {
  const profile = getProfile(toolId);
  const hasClaudeDir = existsSync(join(projectRoot, profile.markerDir));
  const hasRulesFile = existsSync(join(projectRoot, profile.rulesFile));
  const pkgPath = join(projectRoot, "package.json");
  const hasPackageJson = existsSync(pkgPath);

  const scripts: Record<string, boolean> = {};
  if (hasPackageJson) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      const s = (pkg.scripts ?? {}) as Record<string, string>;
      for (const name of RELEVANT_SCRIPTS) scripts[name] = Boolean(s[name]);
    } catch {
      /* ignore malformed package.json */
    }
  }

  return {
    projectRoot,
    hasPackageJson,
    hasClaudeDir,
    hasRulesFile,
    hasCfcInstall: existsSync(join(projectRoot, INSTALL_MANIFEST_PATH)),
    scripts,
    isFreshInit: !hasClaudeDir && !hasRulesFile,
  };
}
