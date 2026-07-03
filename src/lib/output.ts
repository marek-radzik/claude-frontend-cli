/** Tiny formatting helpers for consistent CLI output. */

import pc from "picocolors";
import type { ArtifactAction } from "./writer.js";

export function heading(text: string): void {
  process.stdout.write("\n" + pc.bold(text) + "\n");
}

export function info(text: string): void {
  process.stdout.write(text + "\n");
}

export function warn(text: string): void {
  process.stdout.write(pc.yellow("! ") + text + "\n");
}

export function error(text: string): void {
  process.stderr.write(pc.red("✖ ") + text + "\n");
}

export function success(text: string): void {
  process.stdout.write(pc.green("✓ ") + text + "\n");
}

const ACTION_STYLE: Record<ArtifactAction, (s: string) => string> = {
  created: pc.green,
  updated: pc.cyan,
  unchanged: pc.dim,
  skipped: pc.yellow,
  removed: pc.magenta,
  conflict_overwritten: pc.red,
  conflict_saved_user: pc.yellow,
  conflict_skipped: pc.dim,
};

export function actionLine(action: ArtifactAction, path: string, note?: string): void {
  const label = ACTION_STYLE[action](action.padEnd(20));
  const extra = note ? pc.dim(`  (${note})`) : "";
  process.stdout.write(`  ${label} ${path}${extra}\n`);
}

/** Render a small summary count line, e.g. "3 created, 2 unchanged, 1 skipped". */
export function summarize(actions: ArtifactAction[]): string {
  const counts = new Map<ArtifactAction, number>();
  for (const a of actions) counts.set(a, (counts.get(a) ?? 0) + 1);
  return [...counts.entries()].map(([a, n]) => `${n} ${a}`).join(", ") || "nothing to do";
}
