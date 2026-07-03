/**
 * Print the paste-able CLI steps for setting up secrets in `.env`.
 * Never prints or collects values — only the commands and the key list.
 */

import type { KitManifest } from "./manifest.js";
import { render, type TemplateVars } from "./template.js";
import { heading, info } from "./output.js";
import pc from "picocolors";

function groupEnabled(group: string, modules: string[]): boolean {
  if (group === "git" || group === "project") return true;
  return modules.includes(group);
}

export function printEnvSteps(kit: KitManifest, modules: string[], vars: TemplateVars): void {
  const keys = kit.envKeys.filter((k) => groupEnabled(k.group, modules));
  const required = keys.filter((k) => k.required).map((k) => render(k.key, vars));
  const optional = keys.filter((k) => !k.required).map((k) => render(k.key, vars));

  heading("Secrets — paste these steps (values go in .env, never committed)");
  info(pc.dim("  # 1) create your local .env from the template"));
  info("  cp .env.example .env");
  info(pc.dim("  # 2) edit .env and paste your values"));
  if (required.length) info(`     required now: ${pc.bold(required.join(", "))}`);
  if (optional.length) info(pc.dim(`     optional (later): ${optional.join(", ")}`));
  info(pc.dim("  # 3) export them into your shell (or add to your shell profile)"));
  info("  export $(grep -v '^#' .env | xargs)");
}
