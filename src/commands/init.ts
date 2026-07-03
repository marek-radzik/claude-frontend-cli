/**
 * `cfc init` — bootstrap (fresh project) or merge (existing Claude Code config).
 * Behaves like `claude init` when nothing is set up yet; otherwise adds our
 * artifacts and refreshes the managed CLAUDE.md block non-destructively.
 */

import type { ParsedArgs } from "../index.js";
import { detectProject } from "../lib/tool-detect.js";
import { readKitManifest } from "../lib/manifest.js";
import { collectVars } from "../lib/prompts.js";
import { readSavedVars } from "../lib/config.js";
import { runApply } from "../lib/apply-run.js";
import { heading, info, success, warn } from "../lib/output.js";
import { getProfile } from "../lib/tool-profile.js";

export async function initCommand(args: ParsedArgs, projectRoot: string): Promise<void> {
  const toolId = (args.flags.tool as string) || undefined;
  const withJira = Boolean(args.flags["with-jira"]);
  const dryRun = Boolean(args.flags["dry-run"]);
  const force = Boolean(args.flags.force);
  const yes = Boolean(args.flags.yes);

  const state = detectProject(projectRoot, toolId);
  const profile = getProfile(toolId);
  const kit = readKitManifest();

  heading(`cfc init — ${profile.displayName}`);
  if (state.isFreshInit) {
    info("No existing Claude Code config detected → bootstrapping from scratch.");
  } else {
    info("Existing config detected → merging (managed block + missing artifacts).");
    if (state.hasClaudeDir) info("  • .claude/ present");
    if (state.hasRulesFile) info(`  • ${profile.rulesFile} present`);
  }

  if (!state.hasPackageJson) {
    warn("No package.json found — this does not look like a JS/TS project.");
  } else {
    const missing = ["lint", "type-check", "test:unit"].filter((s) => !state.scripts[s]);
    if (missing.length) {
      warn(`package.json is missing scripts some skills rely on: ${missing.join(", ")}`);
    }
  }

  const modules = withJira ? ["jira"] : [];
  const vars = await collectVars(kit, {
    yes,
    includeJira: withJira,
    saved: readSavedVars(projectRoot),
  });

  await runApply({ projectRoot, vars, modules, dryRun, force, toolId });

  if (!dryRun) {
    success("Done.");
    heading("Next steps");
    info("  1. Review CLAUDE.md and fill in .instructions/ for your project.");
    info("  2. Commit .claude/, .docs/, .instructions/ and CLAUDE.md.");
    info("  3. Run  cfc doctor  to verify, or  cfc list  to see what's installed.");
  }
}
