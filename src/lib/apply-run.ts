/**
 * Orchestrates a single apply pass shared by init / get / sync:
 * builds the resolver, runs the writer, prints the report, and persists the
 * install manifest (unless --dry-run).
 */

import { readKitManifest, readInstallManifest, writeInstallManifest } from "./manifest.js";
import type { TemplateVars } from "./template.js";
import { applyArtifacts, type WriteReport } from "./writer.js";
import {
  createConflictResolver,
  forceResolver,
  skipResolver,
  type ConflictResolver,
} from "./conflict-prompt.js";
import { actionLine, heading, info, summarize } from "./output.js";

export interface RunOptions {
  projectRoot: string;
  vars: TemplateVars;
  modules: string[];
  onlyArtifactIds?: string[];
  select?: { type?: string; name?: string };
  stack?: string;
  dryRun: boolean;
  force: boolean;
  prune?: boolean;
  toolId?: string;
}

export async function runApply(opts: RunOptions): Promise<WriteReport> {
  const kit = readKitManifest();
  const prior = readInstallManifest(opts.projectRoot);
  const tty = Boolean(process.stdout.isTTY);

  const resolver: ConflictResolver = opts.force
    ? forceResolver
    : tty
      ? createConflictResolver(true)
      : skipResolver;

  const report = await applyArtifacts(
    kit,
    {
      projectRoot: opts.projectRoot,
      vars: opts.vars,
      modules: opts.modules,
      onlyArtifactIds: opts.onlyArtifactIds,
      select: opts.select,
      stack: opts.stack,
      dryRun: opts.dryRun,
      force: opts.force,
      resolver,
      prune: opts.prune,
      toolId: opts.toolId,
    },
    prior,
  );

  heading(opts.dryRun ? "Planned changes (dry run)" : "Changes");
  for (const r of report.results) actionLine(r.action, r.path, r.note);
  info("\n" + summarize(report.results.map((r) => r.action)));

  if (!opts.dryRun) {
    const manifest = report.manifest;
    if (!manifest.installedAt) manifest.installedAt = new Date().toISOString();
    writeInstallManifest(opts.projectRoot, manifest);
  }

  return report;
}
