/**
 * Tool profiles — where each supported AI coding tool keeps its artifacts.
 * Only `claude-code` is wired up today; the shape is ready for cursor/copilot.
 */

import { SENTINEL_BEGIN, SENTINEL_END } from "./sentinel.js";

export interface ToolProfile {
  toolId: string;
  displayName: string;
  /** Directory that marks an existing install of this tool. */
  markerDir: string;
  /** The rules file that carries the managed sentinel block. */
  rulesFile: string;
  sentinelBegin: string;
  sentinelEnd: string;
}

export const PROFILES: Record<string, ToolProfile> = {
  "claude-code": {
    toolId: "claude-code",
    displayName: "Claude Code",
    markerDir: ".claude",
    rulesFile: "CLAUDE.md",
    sentinelBegin: SENTINEL_BEGIN,
    sentinelEnd: SENTINEL_END,
  },
};

export const DEFAULT_TOOL = "claude-code";

export function getProfile(toolId: string = DEFAULT_TOOL): ToolProfile {
  const p = PROFILES[toolId];
  if (!p) throw new Error(`Unknown tool profile: ${toolId}`);
  return p;
}
