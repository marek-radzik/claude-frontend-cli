/**
 * `cfc list` — show the kit catalog and mark what is installed in this project.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ParsedArgs } from "../index.js";
import { readKitManifest, readInstallManifest } from "../lib/manifest.js";
import { buildCatalog, type CatalogItem } from "../lib/catalog.js";
import { heading, info } from "../lib/output.js";
import pc from "picocolors";

export async function listCommand(_args: ParsedArgs, projectRoot: string): Promise<void> {
  const kit = readKitManifest();
  const catalog = buildCatalog(kit);
  const installed = readInstallManifest(projectRoot);
  const installedPaths = new Set((installed?.files ?? []).map((f) => f.path));

  const byType = new Map<string, CatalogItem[]>();
  for (const item of catalog) {
    const arr = byType.get(item.type) ?? [];
    arr.push(item);
    byType.set(item.type, arr);
  }

  heading("cfc catalog");
  for (const [type, items] of byType) {
    info(pc.bold(`\n${type}`));
    for (const item of items.sort((a, b) => a.name.localeCompare(b.name))) {
      const onDisk = installedPaths.has(item.destRel) || existsSync(join(projectRoot, item.destRel));
      const mark = onDisk ? pc.green("✓") : pc.dim("·");
      const layer = item.module ? pc.yellow(`[${item.module}]`) : pc.dim(`[${item.layer}]`);
      info(`  ${mark} ${item.name.padEnd(22)} ${layer}`);
    }
  }

  if (installed) {
    info(pc.dim(`\nInstalled kit version: v${installed.kitVersion}; modules: ${installed.modules.join(", ") || "none"}`));
  } else {
    info(pc.dim("\nNot initialized here yet — run  cfc init"));
  }
}
