/** Shared CLI arg types + helpers. */

export type FlagValue = string | boolean | string[];

/** Parse `--set KEY=VALUE` (possibly repeated) into a vars object. */
export function parseSet(raw: FlagValue | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (raw === undefined || raw === true) return out;
  const list = Array.isArray(raw) ? raw : [String(raw)];
  for (const item of list) {
    const eq = item.indexOf("=");
    if (eq === -1) continue;
    out[item.slice(0, eq).trim()] = item.slice(eq + 1);
  }
  return out;
}

/** Coerce a flag value to a plain string (first element if array). */
export function flagString(raw: FlagValue | undefined): string | undefined {
  if (raw === undefined || raw === true) return undefined;
  return Array.isArray(raw) ? raw[0] : String(raw);
}
