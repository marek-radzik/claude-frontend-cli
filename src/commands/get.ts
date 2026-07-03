/**
 * `cfc get --type <t> --name <n>` — install a single artifact into an already
 * initialized project. Reuses saved vars so templates render correctly.
 */

import type { ParsedArgs } from "../index.js";
import { readKitManifest } from "../lib/manifest.js";
import { readSavedVars, readInstalledModules } from "../lib/config.js";
import { withDerived } from "../lib/template.js";
import { runApply } from "../lib/apply-run.js";
import { error, heading, info } from "../lib/output.js";

export async function getCommand(args: ParsedArgs, projectRoot: string): Promise<void> {
  const type = args.flags.type as string | undefined;
  const name = args.flags.name as string | undefined;
  const dryRun = Boolean(args.flags["dry-run"]);
  const force = Boolean(args.flags.force);

  if (!type && !name) {
    error("Specify at least --name (and optionally --type). e.g. cfc get --type skill --name new-form");
    process.exitCode = 1;
    return;
  }

  const kit = readKitManifest();
  const vars = withDerived(readSavedVars(projectRoot), kit.kitRepo);
  // Enable jira module so optional skills are reachable by name.
  const modules = [...new Set([...readInstalledModules(projectRoot), "jira"])];

  heading(`cfc get — ${type ?? "any"}${name ? ` / ${name}` : ""}`);
  const report = await runApply({
    projectRoot,
    vars,
    modules,
    select: { type, name },
    dryRun,
    force,
  });

  if (report.results.length === 0) {
    info("No matching artifact found. Run  cfc list  to see available names.");
  }
}
