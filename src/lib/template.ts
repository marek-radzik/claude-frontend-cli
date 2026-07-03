/**
 * Minimal `{{PLACEHOLDER}}` substitution — no template engine, just a regex.
 * Unknown placeholders are left untouched (so partially-filled templates and
 * the `--yes` flow degrade gracefully).
 */

export type TemplateVars = Record<string, string>;

const PLACEHOLDER_RE = /\{\{\s*([A-Z0-9_]+)\s*\}\}/g;

/** Replace every `{{KEY}}` present in `vars`; leave the rest as-is. */
export function render(input: string, vars: TemplateVars): string {
  return input.replace(PLACEHOLDER_RE, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match,
  );
}

/** List distinct placeholder keys referenced in `input`. */
export function placeholdersIn(input: string): string[] {
  const found = new Set<string>();
  for (const m of input.matchAll(PLACEHOLDER_RE)) found.add(m[1]);
  return [...found];
}

/** Derive the standard computed vars from the answered ones. */
export function withDerived(vars: TemplateVars, kitRepo: string): TemplateVars {
  const out: TemplateVars = { ...vars, KIT_REPO: kitRepo };
  if (vars.PRIMARY_ENTITY) out.PRIMARY_ENTITY_LOWER = vars.PRIMARY_ENTITY.toLowerCase();
  if (vars.PROJECT_NAME) {
    out.PROJECT_SLUG = kebab(vars.PROJECT_NAME);
    out.PROJECT_ENV_PREFIX = upperSnake(vars.PROJECT_NAME);
  }
  return out;
}

export function kebab(s: string): string {
  return s
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export function upperSnake(s: string): string {
  return kebab(s).replace(/-/g, "_").toUpperCase();
}
