/**
 * `cfc init` — bootstrap (fresh project) or merge (existing Claude Code config).
 * Behaves like `claude init` when nothing is set up yet; otherwise adds our
 * artifacts and refreshes the managed CLAUDE.md block non-destructively.
 */

import type { ParsedArgs } from "../index.js";
import { flagString, parseSet } from "../lib/args.js";
import { detectProject } from "../lib/tool-detect.js";
import { readKitManifest } from "../lib/manifest.js";
import { collectStack, collectVars } from "../lib/prompts.js";
import { readSavedVars, readSavedStack } from "../lib/config.js";
import { runApply } from "../lib/apply-run.js";
import { heading, info, success, warn, error } from "../lib/output.js";
import { getProfile } from "../lib/tool-profile.js";
import { printEnvSteps } from "../lib/env-steps.js";

export async function initCommand(args: ParsedArgs, projectRoot: string): Promise<void> {
  const toolId = flagString(args.flags.tool);
  const withJira = Boolean(args.flags["with-jira"]);
  const noMcp = Boolean(args.flags["no-mcp"]);
  const dryRun = Boolean(args.flags["dry-run"]);
  const force = Boolean(args.flags.force);
  const yes = Boolean(args.flags.yes);

  // Interactive prompts need a TTY. In non-interactive contexts (CI, piped,
  // the cfc-setup skill) the caller must pass --yes (+ optional --set / --stack).
  if (!yes && !process.stdin.isTTY) {
    error("Interactive init needs a TTY. Re-run non-interactively, e.g.:");
    info('  cfc init --yes --stack nuxt-vue --set PROJECT_NAME="My App" --set API_BASE_URL=https://api.example.com');
    process.exitCode = 1;
    return;
  }

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

  const stack = await collectStack(kit, {
    yes,
    cliStack: flagString(args.flags.stack),
    saved: readSavedStack(projectRoot),
  });
  const modules: string[] = [];
  if (!noMcp) modules.push("mcp");
  if (withJira) modules.push("jira");

  const vars = await collectVars(kit, {
    yes,
    includeJira: withJira,
    saved: readSavedVars(projectRoot),
    preset: parseSet(args.flags.set),
  });

  await runApply({ projectRoot, vars, modules, stack, dryRun, force, toolId });

  if (!dryRun) {
    success("Done.");
    if (modules.includes("mcp") || modules.includes("jira")) printEnvSteps(kit, modules, vars);
    heading("Next steps");
    info("  1. Review CLAUDE.md and fill in .instructions/ for your project.");
    info("  2. Commit .claude/, .docs/, .instructions/ and CLAUDE.md (NOT .env).");
    info("  3. Run  cfc doctor  to verify, or  cfc list  to see what's installed.");
  }
}
