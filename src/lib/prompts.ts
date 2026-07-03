/**
 * Interactive collection of template vars via @clack/prompts.
 * In non-interactive / --yes mode, returns {} so templates keep their
 * `{{PLACEHOLDER}}` markers for the developer to fill in later.
 */

import * as p from "@clack/prompts";
import type { KitManifest } from "./manifest.js";
import { withDerived, type TemplateVars } from "./template.js";

export interface CollectOptions {
  yes: boolean;
  includeJira: boolean;
  /** Pre-existing answers (from a prior install) used as defaults. */
  saved?: TemplateVars;
}

export async function collectVars(
  kit: KitManifest,
  opts: CollectOptions,
): Promise<TemplateVars> {
  const groups = opts.includeJira ? ["core", "jira"] : ["core"];
  const defs = kit.placeholders.filter((d) => groups.includes(d.group));

  if (opts.yes) {
    // Use saved answers if any; otherwise leave placeholders untouched.
    return opts.saved ? withDerived(opts.saved, kit.kitRepo) : {};
  }

  const answers: TemplateVars = { ...opts.saved };
  for (const def of defs) {
    const initial = answers[def.key] ?? def.default;
    const value = await p.text({
      message: def.prompt,
      placeholder: def.default,
      initialValue: initial,
    });
    if (p.isCancel(value)) {
      p.cancel("Cancelled.");
      process.exit(1);
    }
    answers[def.key] = String(value).trim() || def.default;
  }

  return withDerived(answers, kit.kitRepo);
}
