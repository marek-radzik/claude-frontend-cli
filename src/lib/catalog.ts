/**
 * Enumerate the installable items in the kit for `list` / `doctor` — names,
 * types, layers, and their destination paths — without reading file contents.
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { kitPath } from "./paths.js";
import type { Artifact, KitManifest } from "./manifest.js";

export interface CatalogItem {
  type: Artifact["type"];
  name: string;
  layer: Artifact["layer"];
  module?: string;
  destRel: string;
}

function expandNames(a: Artifact): CatalogItem[] {
  const items: CatalogItem[] = [];
  const base = { type: a.type, layer: a.layer, module: a.module };

  if (a.dest) {
    const name = (a.dest.split("/").pop() as string).replace(/\.(md|sh|json)$/, "");
    const display = a.dest.endsWith("SKILL.md") ? a.dest.split("/").slice(-2, -1)[0] : name;
    items.push({ ...base, name: display, destRel: a.dest });
    return items;
  }

  if (a.srcDir && a.destDir && a.glob) {
    const srcAbs = kitPath(a.srcDir);
    if (!existsSync(srcAbs)) return items;
    if (a.glob === "*.md") {
      for (const f of readdirSync(srcAbs).filter((x) => x.endsWith(".md"))) {
        items.push({ ...base, name: f.replace(/\.md$/, ""), destRel: join(a.destDir, f) });
      }
    } else if (a.glob === "*/SKILL.md") {
      for (const d of readdirSync(srcAbs, { withFileTypes: true }).filter((x) => x.isDirectory())) {
        items.push({
          ...base,
          name: d.name,
          destRel: join(a.destDir, d.name, "SKILL.md"),
        });
      }
    }
  }
  return items;
}

export function buildCatalog(kit: KitManifest): CatalogItem[] {
  return kit.artifacts.flatMap(expandNames);
}
