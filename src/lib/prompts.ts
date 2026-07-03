/**
 * Interactive collection of the stack choice and template vars via
 * @clack/prompts. In non-interactive / --yes mode, returns provided values and
 * leaves the rest as `{{PLACEHOLDER}}` for the developer to fill in later.
 */

import * as p from "@clack/prompts";
import type { KitManifest } from "./manifest.js";
import { withDerived, type TemplateVars } from "./template.js";

export interface CollectOptions {
  yes: boolean;
  includeJira: boolean;
  /** Pre-existing answers (from a prior install) used as defaults. */
  saved?: TemplateVars;
  /** Values supplied via --set KEY=VALUE (not prompted). */
  preset?: TemplateVars;
}

/** Choose the frontend stack (interactive select, or resolved from flags/saved). */
export async function collectStack(
  kit: KitManifest,
  opts: { yes: boolean; cliStack?: string; saved?: string },
): Promise<string> {
  if (opts.cliStack) return opts.cliStack;
  if (opts.yes) return opts.saved ?? kit.defaultStack;

  const value = await p.select({
    message: "Frontend stack",
    initialValue: opts.saved ?? kit.defaultStack,
    options: kit.stacks.map((s) => ({ value: s.id, label: s.label })),
  });
  if (p.isCancel(value)) {
    p.cancel("Cancelled.");
    process.exit(1);
  }
  return String(value);
}

export async function collectVars(
  kit: KitManifest,
  opts: CollectOptions,
): Promise<TemplateVars> {
  const groups = opts.includeJira ? ["core", "jira"] : ["core"];
  const defs = kit.placeholders.filter((d) => groups.includes(d.group));
  const preset = opts.preset ?? {};

  if (opts.yes) {
    // Always derive so constants like KIT_REPO are present (keeps init and sync
    // byte-identical); unprovided user placeholders simply stay as {{...}}.
    return withDerived({ ...opts.saved, ...preset }, kit.kitRepo);
  }

  const answers: TemplateVars = { ...opts.saved, ...preset };
  for (const def of defs) {
    if (preset[def.key] !== undefined) continue; // provided via --set
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
