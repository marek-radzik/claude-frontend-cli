/**
 * `cfc doctor` — diagnostics for the target project:
 * tool detected, npm scripts the skills rely on, install manifest presence,
 * drift between what we wrote and what's on disk, and kit version.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ParsedArgs } from "../index.js";
import { detectProject } from "../lib/tool-detect.js";
import {
  KIT_VERSION,
  contentHash,
  readInstallManifest,
} from "../lib/manifest.js";
import { getProfile } from "../lib/tool-profile.js";
import { extractBlockBody } from "../lib/sentinel.js";
import { heading, info, success, warn } from "../lib/output.js";
import pc from "picocolors";

function check(ok: boolean, label: string, detail = ""): void {
  const mark = ok ? pc.green("✓") : pc.yellow("✗");
  info(`  ${mark} ${label}${detail ? pc.dim("  " + detail) : ""}`);
}

export async function doctorCommand(args: ParsedArgs, projectRoot: string): Promise<void> {
  const toolId = (args.flags.tool as string) || undefined;
  const profile = getProfile(toolId);
  const state = detectProject(projectRoot, toolId);
  const manifest = readInstallManifest(projectRoot);

  heading(`cfc doctor — ${profile.displayName}`);

  check(state.hasClaudeDir, `${profile.markerDir}/ present`);
  check(state.hasRulesFile, `${profile.rulesFile} present`);
  check(Boolean(manifest), "cfc install manifest present", manifest ? `v${manifest.kitVersion}` : "run cfc init");

  heading("npm scripts (skills depend on these)");
  for (const s of ["lint", "type-check", "test:unit"]) {
    check(Boolean(state.scripts[s]), s);
  }

  if (manifest) {
    heading("Managed CLAUDE.md block");
    const rulesAbs = join(projectRoot, profile.rulesFile);
    if (existsSync(rulesAbs)) {
      const body = extractBlockBody(readFileSync(rulesAbs, "utf8"));
      check(body !== null, "sentinel markers intact");
    } else {
      check(false, "rules file missing");
    }

    heading("Drift (tracked files modified locally)");
    let drift = 0;
    let missing = 0;
    for (const f of manifest.files) {
      const abs = join(projectRoot, f.path);
      if (!existsSync(abs)) {
        missing++;
        continue;
      }
      if (contentHash(readFileSync(abs, "utf8")) !== f.hash) drift++;
    }
    if (drift === 0 && missing === 0) success("all tracked files match the kit");
    if (drift > 0) warn(`${drift} file(s) modified locally (sync will prompt)`);
    if (missing > 0) warn(`${missing} tracked file(s) missing (sync will recreate)`);

    const stale = manifest.kitVersion !== KIT_VERSION;
    if (stale) warn(`installed v${manifest.kitVersion} < kit v${KIT_VERSION} — run cfc sync`);
    else success(`up to date with kit v${KIT_VERSION}`);
  }
}
