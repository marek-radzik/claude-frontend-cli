/**
 * Frontend stack presets — gate which docs/skills apply and provide the
 * tech-stack table (for CLAUDE.md) and the Context7 library list (for .mcp.json).
 */

import type { KitManifest, StackPreset } from "./manifest.js";

export function getStack(kit: KitManifest, id?: string): StackPreset {
  const wanted = id || kit.defaultStack;
  const found = kit.stacks.find((s) => s.id === wanted);
  if (!found) {
    throw new Error(
      `Unknown stack "${wanted}". Available: ${kit.stacks.map((s) => s.id).join(", ")}`,
    );
  }
  return found;
}

/** Markdown table of the stack's technologies, for {{TECH_TABLE}}. */
export function techTableMarkdown(stack: StackPreset): string {
  const rows = stack.techTable.map(([tech, purpose]) => `| ${tech} | ${purpose} |`);
  return ["| Technology | Purpose |", "|------------|---------|", ...rows].join("\n");
}

/** JSON array of Context7 libraries, for {{MCP_LIBRARIES_JSON}}. */
export function librariesJson(stack: StackPreset): string {
  return JSON.stringify(stack.libraries);
}
