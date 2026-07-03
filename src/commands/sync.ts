/**
 * `cfc sync` — re-apply the kit at its current version, preserving local edits.
 * Uses the saved vars/modules, prunes files we previously wrote that the kit no
 * longer ships, and refreshes the managed CLAUDE.md block.
 */

import type { ParsedArgs } from "../index.js";
import { readKitManifest, readInstallManifest, KIT_VERSION } from "../lib/manifest.js";
import { readSavedVars, readInstalledModules, readSavedStack } from "../lib/config.js";
import { withDerived } from "../lib/template.js";
import { runApply } from "../lib/apply-run.js";
import { error, heading, info } from "../lib/output.js";

export async function syncCommand(args: ParsedArgs, projectRoot: string): Promise<void> {
  const dryRun = Boolean(args.flags["dry-run"]);
  const force = Boolean(args.flags.force);

  const prior = readInstallManifest(projectRoot);
  if (!prior) {
    error("No cfc install found here. Run  cfc init  first.");
    process.exitCode = 1;
    return;
  }

  const kit = readKitManifest();
  const vars = withDerived(readSavedVars(projectRoot), kit.kitRepo);
  const modules = readInstalledModules(projectRoot);

  heading(`cfc sync — kit v${KIT_VERSION} (installed: v${prior.kitVersion})`);
  if (!dryRun && !force) {
    info("Tip: run with --dry-run first to preview. Local edits trigger a prompt.");
  }

  await runApply({
    projectRoot,
    vars,
    modules,
    stack: readSavedStack(projectRoot),
    dryRun,
    force,
    prune: true,
  });
}
