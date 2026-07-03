/**
 * Sentinel-block handling for the managed section inside CLAUDE.md.
 *
 * The CLI owns a single block bounded by BEGIN/END markers. Everything outside
 * the markers belongs to the user and is never touched. Re-applying the same
 * body produces byte-identical output so `sync` can report `unchanged`.
 *
 * Intentionally string-in / string-out — no filesystem — so it is trivially
 * unit-testable.
 */

export const SENTINEL_BEGIN = "<!-- BEGIN claude-frontend-cli -->";
export const SENTINEL_END = "<!-- END claude-frontend-cli -->";

export interface ApplyResult {
  content: string;
  /** True when the block already existed and was replaced in place. */
  existed: boolean;
}

/**
 * Insert or replace the sentinel block wrapping `body` in `existing`.
 * If a block is already present it is replaced in place (preserving surrounding
 * text); otherwise the block is appended with one blank line of separation.
 */
export function applyRulesBlockWithMarkers(
  existing: string,
  body: string,
  begin: string = SENTINEL_BEGIN,
  end: string = SENTINEL_END,
): ApplyResult {
  const block = `${begin}\n${body.trim()}\n${end}`;
  const beginIdx = existing.indexOf(begin);
  const endIdx = existing.indexOf(end);

  if (beginIdx !== -1 && endIdx !== -1 && endIdx > beginIdx) {
    const before = existing.slice(0, beginIdx);
    const after = existing.slice(endIdx + end.length);
    const content = `${before}${block}${after}`.replace(/[\r\n]*$/, "\n");
    return { content, existed: true };
  }

  // No (valid) existing block — append.
  const base = existing.replace(/[\r\n]*$/, "");
  const joiner = base.length > 0 ? "\n\n" : "";
  const content = `${base}${joiner}${block}\n`;
  return { content, existed: false };
}

export interface RemoveResult {
  content: string;
  removed: boolean;
}

/**
 * Strip the sentinel block from `existing`, collapsing the splice point to at
 * most one blank line. No-op when markers are missing or out of order.
 */
export function removeRulesBlockWithMarkers(
  existing: string,
  begin: string = SENTINEL_BEGIN,
  end: string = SENTINEL_END,
): RemoveResult {
  const beginIdx = existing.indexOf(begin);
  const endIdx = existing.indexOf(end);
  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) {
    return { content: existing, removed: false };
  }
  const before = existing.slice(0, beginIdx).replace(/[\r\n]*$/, "");
  const after = existing.slice(endIdx + end.length).replace(/^[\r\n]*/, "");
  const joiner = before.length > 0 && after.length > 0 ? "\n\n" : "";
  const combined = `${before}${joiner}${after}`;
  const content = combined.length === 0 ? "" : combined.replace(/[\r\n]*$/, "\n");
  return { content, removed: true };
}

/** Extract the current block body (without markers), or null if absent. */
export function extractBlockBody(
  existing: string,
  begin: string = SENTINEL_BEGIN,
  end: string = SENTINEL_END,
): string | null {
  const beginIdx = existing.indexOf(begin);
  const endIdx = existing.indexOf(end);
  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) return null;
  return existing.slice(beginIdx + begin.length, endIdx).trim();
}
