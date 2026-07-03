/**
 * The artifact writer — the heart of cfc.
 *
 * Given the kit manifest, template vars, and a set of enabled layers/modules,
 * it expands each artifact into concrete files and applies them to the target
 * project according to its strategy, honoring:
 *   - idempotent re-apply (byte-identical → `unchanged`)
 *   - skip-if-exists / template-once for user-owned config
 *   - sentinel-block merge for CLAUDE.md (user edits outside markers preserved)
 *   - conflict resolution for locally-edited managed files
 *   - `--dry-run` (compute the same report without touching disk)
 */

import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { kitPath } from "./paths.js";
import { render, type TemplateVars } from "./template.js";
import { applyRulesBlockWithMarkers } from "./sentinel.js";
import { getProfile } from "./tool-profile.js";
import { getStack, techTableMarkdown, librariesJson } from "./stack.js";
import type { ConflictResolver } from "./conflict-prompt.js";
import {
  contentHash,
  KIT_VERSION,
  type Artifact,
  type EnvKey,
  type InstalledFile,
  type InstallManifest,
  type KitManifest,
  type Strategy,
} from "./manifest.js";

export type ArtifactAction =
  | "created"
  | "updated"
  | "unchanged"
  | "skipped"
  | "removed"
  | "conflict_overwritten"
  | "conflict_saved_user"
  | "conflict_skipped";

export interface FileResult {
  path: string;
  action: ArtifactAction;
  note?: string;
}

export interface WriteOptions {
  projectRoot: string;
  vars: TemplateVars;
  /** Enabled optional modules, e.g. ["jira"]. */
  modules: string[];
  /** Restrict to these artifact ids (used by `get`). */
  onlyArtifactIds?: string[];
  /** File-level selection for `get` (by artifact type and/or artifact name). */
  select?: { type?: string; name?: string };
  /** Selected frontend stack id (gates docs/skills, tech table, MCP libraries). */
  stack?: string;
  dryRun: boolean;
  force: boolean;
  resolver: ConflictResolver;
  /** Remove tracked files no longer produced by the current run (sync). */
  prune?: boolean;
  toolId?: string;
}

export interface WriteReport {
  results: FileResult[];
  manifest: InstallManifest;
}

interface ResolvedFile {
  artifactId: string;
  type: Artifact["type"];
  strategy: Strategy;
  srcAbs: string;
  destRel: string;
  isTemplate: boolean;
  executable: boolean;
}

// ---------------------------------------------------------------------------
// Artifact expansion
// ---------------------------------------------------------------------------

function listGlob(srcDirAbs: string, glob: string): { name: string; srcAbs: string }[] {
  if (!existsSync(srcDirAbs)) return [];
  if (glob === "*.md") {
    return readdirSync(srcDirAbs)
      .filter((f) => f.endsWith(".md"))
      .map((f) => ({ name: f, srcAbs: join(srcDirAbs, f) }));
  }
  if (glob === "*/SKILL.md") {
    return readdirSync(srcDirAbs, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => ({ name: d.name, srcAbs: join(srcDirAbs, d.name, "SKILL.md") }))
      .filter((e) => existsSync(e.srcAbs));
  }
  return [];
}

function isTemplateStrategy(s: Strategy): boolean {
  return s === "template" || s === "template-once";
}

function expandArtifact(a: Artifact): ResolvedFile[] {
  const files: ResolvedFile[] = [];
  const tmpl = isTemplateStrategy(a.strategy);

  if (a.src && a.dest) {
    files.push({
      artifactId: a.id,
      type: a.type,
      strategy: a.strategy,
      srcAbs: kitPath(a.src),
      destRel: a.dest,
      isTemplate: tmpl,
      executable: Boolean(a.executable),
    });
    return files;
  }

  if (a.srcDir && a.destDir && a.glob) {
    for (const entry of listGlob(kitPath(a.srcDir), a.glob)) {
      const destRel =
        a.glob === "*/SKILL.md"
          ? join(a.destDir, entry.name, "SKILL.md")
          : join(a.destDir, entry.name);
      files.push({
        artifactId: a.id,
        type: a.type,
        strategy: a.strategy,
        srcAbs: entry.srcAbs,
        destRel,
        isTemplate: tmpl,
        executable: Boolean(a.executable),
      });
    }
  }
  return files;
}

/** Human-facing name of a resolved file (skill dir, doc/agent basename). */
export function fileName(rf: ResolvedFile): string {
  if (rf.destRel.endsWith("SKILL.md")) {
    return rf.destRel.split("/").slice(-2, -1)[0];
  }
  return (rf.destRel.split("/").pop() as string).replace(/\.(md|sh|json)$/, "");
}

function matchesSelect(rf: ResolvedFile, select: { type?: string; name?: string }): boolean {
  if (select.type && rf.type !== select.type) return false;
  if (select.name && fileName(rf) !== select.name) return false;
  return true;
}

/** True when the selected stack excludes this doc/skill. */
function isExcludedByStack(
  rf: ResolvedFile,
  excludeDocs: Set<string>,
  excludeSkills: Set<string>,
): boolean {
  if (rf.type === "doc") {
    const name = (rf.destRel.split("/").pop() as string).replace(/\.md$/, "");
    return excludeDocs.has(name);
  }
  if (rf.type === "skill" && rf.destRel.endsWith("SKILL.md")) {
    return excludeSkills.has(fileName(rf));
  }
  return false;
}

// ---------------------------------------------------------------------------
// CLAUDE.md rules-block generation
// ---------------------------------------------------------------------------

const DOC_DESCRIPTIONS: Record<string, string> = {
  "ARCHITECTURE.md": "Layered architecture & data flow",
  "TDD.md": "Test-Driven Development (mandatory)",
  "TABLES.md": "Data table implementation patterns",
  "FORMS.md": "Form implementation with Zod",
  "COMPONENTS.md": "Vue 3 Composition API patterns",
  "PERMISSIONS.md": "RBAC implementation",
  "TYPESCRIPT.md": "TypeScript standards",
  "API.md": "API communication patterns",
  "I18N.md": "Internationalization",
  "ERROR-HANDLING.md": "Error handling & feedback",
  "README.md": "Docs index",
};

function readSkillDescription(skillMdAbs: string): string {
  try {
    const txt = readFileSync(skillMdAbs, "utf8");
    const m = txt.match(/^description:\s*(.+)$/m);
    return m ? m[1].trim() : "";
  } catch {
    return "";
  }
}

function buildDocsTable(files: ResolvedFile[]): string {
  const docs = files.filter((f) => f.type === "doc" && f.destRel.endsWith(".md"));
  const rows = docs
    .map((f) => {
      const name = f.destRel.split("/").pop() as string;
      const desc = DOC_DESCRIPTIONS[name] ?? "";
      return `| [${name}](./${f.destRel}) | ${desc} |`;
    })
    .sort();
  return ["| File | Purpose |", "|------|---------|", ...rows].join("\n");
}

function buildSkillsTable(files: ResolvedFile[], vars: TemplateVars): string {
  const skills = files.filter((f) => f.type === "skill" && f.destRel.endsWith("SKILL.md"));
  const rows = skills
    .map((f) => {
      const name = f.destRel.split("/").slice(-2, -1)[0];
      const desc = render(readSkillDescription(f.srcAbs), vars);
      return `| \`/${name}\` | ${desc} |`;
    })
    .sort();
  return ["| Skill | Purpose |", "|-------|---------|", ...rows].join("\n");
}

// ---------------------------------------------------------------------------
// Main apply
// ---------------------------------------------------------------------------

export async function applyArtifacts(
  kit: KitManifest,
  options: WriteOptions,
  prior: InstallManifest | null,
): Promise<WriteReport> {
  const { projectRoot, vars, modules, dryRun, force, resolver } = options;
  const results: FileResult[] = [];
  const priorMap = new Map<string, InstalledFile>((prior?.files ?? []).map((f) => [f.path, f]));
  const nextFiles = new Map<string, InstalledFile>();

  const selecting = Boolean(options.select && (options.select.name || options.select.type));

  // Stack preset drives gating (excluded docs/skills), the CLAUDE.md tech table,
  // and the .mcp.json library list. Its values are exposed as extra render vars.
  const stack = getStack(kit, options.stack);
  const renderVars: TemplateVars = {
    ...vars,
    STACK_LABEL: stack.label,
    TECH_TABLE: techTableMarkdown(stack),
    MCP_LIBRARIES_JSON: librariesJson(stack),
  };
  const excludeDocs = new Set(stack.excludeDocs);
  const excludeSkills = new Set(stack.excludeSkills);

  // Filter artifacts by layer/module/onlyIds. When file-level selecting, keep
  // all layers as candidates (so `get` can pull an optional skill directly).
  const artifacts = kit.artifacts.filter((a) => {
    if (options.onlyArtifactIds && !options.onlyArtifactIds.includes(a.id)) return false;
    if (selecting) return true;
    if (a.layer === "optional") return a.module ? modules.includes(a.module) : false;
    return true;
  });

  // Expand the flat file list once (needed for CLAUDE.md tables too).
  const rulesArtifacts = artifacts.filter(
    (a) => a.strategy === "rules-block" && (!selecting || options.select?.type === "rules"),
  );
  const envArtifacts = artifacts.filter(
    (a) => a.strategy === "env-file" && (!selecting || options.select?.type === "env"),
  );
  const fileArtifacts = artifacts.filter(
    (a) => a.strategy !== "rules-block" && a.strategy !== "env-file",
  );
  let allFiles = fileArtifacts.flatMap(expandArtifact);
  // Stack gating: drop docs/skills excluded by the selected stack.
  allFiles = allFiles.filter((rf) => !isExcludedByStack(rf, excludeDocs, excludeSkills));
  if (selecting) allFiles = allFiles.filter((rf) => matchesSelect(rf, options.select as object));

  // ---- normal files ----
  for (const rf of allFiles) {
    const res = await applyFile(rf, {
      projectRoot,
      vars: renderVars,
      dryRun,
      force,
      resolver,
      priorMap,
      nextFiles,
    });
    results.push(res);
  }

  // ---- env file (.env.example, generated from envKeys) ----
  for (const a of envArtifacts) {
    const res = applyEnvArtifact(a, kit, modules, {
      projectRoot,
      vars: renderVars,
      dryRun,
      force,
      nextFiles,
    });
    if (res) results.push(res);
  }

  // ---- rules-block (CLAUDE.md) ----
  for (const a of rulesArtifacts) {
    const res = applyRulesArtifact(a, allFiles, {
      projectRoot,
      vars: renderVars,
      dryRun,
      priorMap,
      nextFiles,
      kitRepo: kit.kitRepo,
    });
    results.push(res);
  }

  // ---- prune stale (sync only) ----
  if (options.prune && !options.onlyArtifactIds) {
    for (const [path, entry] of priorMap) {
      if (nextFiles.has(path)) continue;
      // Only remove files that are still ours (unchanged since we wrote them).
      const abs = join(projectRoot, path);
      if (!existsSync(abs)) continue;
      const current = readFileSync(abs, "utf8");
      if (contentHash(current) === entry.hash) {
        if (!dryRun) {
          // best-effort removal; keep the tree tidy
          try {
            rmSync(abs);
          } catch {
            /* ignore */
          }
        }
        results.push({ path, action: "removed" });
      } else {
        // user changed it — keep and stop tracking
        results.push({ path, action: "skipped", note: "stale but locally modified" });
        nextFiles.set(path, entry);
      }
    }
  } else {
    // carry over prior entries we didn't touch (e.g. partial `get` runs)
    for (const [path, entry] of priorMap) {
      if (!nextFiles.has(path)) nextFiles.set(path, entry);
    }
  }

  // Modules reflect what is actually installed on disk, not merely requested.
  const moduleByArtifact = new Map(
    kit.artifacts.filter((a) => a.module).map((a) => [a.id, a.module as string]),
  );
  const installedModules = new Set(prior?.modules ?? []);
  for (const f of nextFiles.values()) {
    const m = moduleByArtifact.get(f.artifactId);
    if (m) installedModules.add(m);
  }

  const manifest: InstallManifest = {
    kitVersion: KIT_VERSION,
    installedAt: prior?.installedAt ?? null, // stamped by the command layer
    vars: {
      ...prior?.vars,
      ...stripDerived(vars),
      STACK: options.stack ?? prior?.vars?.STACK ?? stack.id,
    },
    modules: [...installedModules].sort(),
    files: [...nextFiles.values()].sort((a, b) => a.path.localeCompare(b.path)),
  };

  return { results, manifest };
}

// ---------------------------------------------------------------------------
// .env.example generation (all secrets live in env, never in files)
// ---------------------------------------------------------------------------

interface EnvCtx {
  projectRoot: string;
  vars: TemplateVars;
  dryRun: boolean;
  force: boolean;
  nextFiles: Map<string, InstalledFile>;
}

/** Which env groups are active given the enabled modules. */
function envGroupEnabled(group: EnvKey["group"], modules: string[]): boolean {
  if (group === "git" || group === "project") return true; // always offered (optional)
  if (group === "mcp") return modules.includes("mcp");
  if (group === "jira") return modules.includes("jira");
  return false;
}

const ENV_GROUP_ORDER: EnvKey["group"][] = ["mcp", "git", "project", "jira"];
const ENV_GROUP_HEADING: Record<EnvKey["group"], string> = {
  mcp: "# ── REQUIRED ──",
  git: "# ── OPTIONAL: git host token ──",
  project: "# ── OPTIONAL: project API / E2E (add when needed) ──",
  jira: "# ── JIRA module ──",
};

export function buildEnvExample(
  envKeys: EnvKey[],
  modules: string[],
  vars: TemplateVars,
): string {
  const lines: string[] = [
    "# ── START: copy & fill in, then export (do NOT commit .env) ──",
    "#   cp .env.example .env",
    "#   # edit .env and paste your values",
    "#   export $(grep -v '^#' .env | xargs)",
    "",
  ];
  for (const group of ENV_GROUP_ORDER) {
    if (!envGroupEnabled(group, modules)) continue;
    const keys = envKeys.filter((k) => k.group === group);
    if (!keys.length) continue;
    lines.push(ENV_GROUP_HEADING[group]);
    for (const k of keys) {
      lines.push(`${render(k.key, vars)}=          # ${render(k.comment, vars)}`);
    }
    lines.push("");
  }
  return lines.join("\n").replace(/\n+$/, "\n");
}

/** Ensure `.env` is git-ignored (idempotent). */
function ensureGitignore(projectRoot: string, dryRun: boolean): void {
  if (dryRun) return;
  const gi = join(projectRoot, ".gitignore");
  const existing = existsSync(gi) ? readFileSync(gi, "utf8") : "";
  const has = existing.split(/\r?\n/).some((l) => l.trim() === ".env");
  if (has) return;
  const prefix = existing.length && !existing.endsWith("\n") ? "\n" : "";
  writeFileSync(gi, `${existing}${prefix}.env\n`, "utf8");
}

/**
 * Generate `.env.example` from the kit's envKeys. Skipped entirely when no
 * secret-bearing module (mcp/jira) is enabled. template-once: never clobbers a
 * user's existing file. Also ensures `.env` is git-ignored.
 */
function applyEnvArtifact(
  a: Artifact,
  kit: KitManifest,
  modules: string[],
  ctx: EnvCtx,
): FileResult | null {
  if (!modules.includes("mcp") && !modules.includes("jira")) return null;

  const destRel = a.dest ?? ".env.example";
  const abs = join(ctx.projectRoot, destRel);
  const content = buildEnvExample(kit.envKeys, modules, ctx.vars);

  ensureGitignore(ctx.projectRoot, ctx.dryRun);

  if (existsSync(abs) && !ctx.force) {
    trackRaw(ctx.nextFiles, destRel, readFileSync(abs, "utf8"), a.id, a.strategy);
    return { path: destRel, action: "skipped", note: "exists" };
  }
  const action: ArtifactAction = existsSync(abs) ? "updated" : "created";
  writeFile(abs, content, false, ctx.dryRun);
  trackRaw(ctx.nextFiles, destRel, content, a.id, a.strategy);
  return { path: destRel, action };
}

interface FileCtx {
  projectRoot: string;
  vars: TemplateVars;
  dryRun: boolean;
  force: boolean;
  resolver: ConflictResolver;
  priorMap: Map<string, InstalledFile>;
  nextFiles: Map<string, InstalledFile>;
}

async function applyFile(rf: ResolvedFile, ctx: FileCtx): Promise<FileResult> {
  const abs = join(ctx.projectRoot, rf.destRel);
  const raw = readFileSync(rf.srcAbs, "utf8");
  const newContent = rf.isTemplate ? render(raw, ctx.vars) : raw;
  const exists = existsSync(abs);

  // Config-style: create once, never overwrite (unless --force).
  if (rf.strategy === "skip-if-exists" || rf.strategy === "template-once") {
    if (exists && !ctx.force) {
      // Re-track the on-disk content so prune keeps these user-owned files.
      trackRaw(ctx.nextFiles, rf.destRel, readFileSync(abs, "utf8"), rf.artifactId, rf.strategy);
      return { path: rf.destRel, action: "skipped", note: "exists" };
    }
    if (exists && ctx.force) {
      writeFile(abs, newContent, rf.executable, ctx.dryRun);
      track(ctx, rf, newContent);
      return { path: rf.destRel, action: "updated", note: "forced" };
    }
    writeFile(abs, newContent, rf.executable, ctx.dryRun);
    track(ctx, rf, newContent);
    return { path: rf.destRel, action: "created" };
  }

  // Managed files: copy / template.
  if (!exists) {
    writeFile(abs, newContent, rf.executable, ctx.dryRun);
    track(ctx, rf, newContent);
    return { path: rf.destRel, action: "created" };
  }

  const existing = readFileSync(abs, "utf8");
  if (existing === newContent) {
    track(ctx, rf, newContent);
    return { path: rf.destRel, action: "unchanged" };
  }

  const priorEntry = ctx.priorMap.get(rf.destRel);
  const isOurs = priorEntry && contentHash(existing) === priorEntry.hash;

  if (isOurs || ctx.force) {
    writeFile(abs, newContent, rf.executable, ctx.dryRun);
    track(ctx, rf, newContent);
    return {
      path: rf.destRel,
      action: ctx.force && !isOurs ? "conflict_overwritten" : "updated",
    };
  }

  // Locally edited (or never tracked) → conflict.
  const decision = await ctx.resolver({ artifactType: rf.type, path: rf.destRel });
  if (decision === "skip") {
    if (priorEntry) ctx.nextFiles.set(rf.destRel, priorEntry);
    return { path: rf.destRel, action: "conflict_skipped" };
  }
  if (decision === "save_user") {
    writeFile(`${abs}.user`, existing, false, ctx.dryRun);
    writeFile(abs, newContent, rf.executable, ctx.dryRun);
    track(ctx, rf, newContent);
    return { path: rf.destRel, action: "conflict_saved_user", note: `${rf.destRel}.user` };
  }
  writeFile(abs, newContent, rf.executable, ctx.dryRun);
  track(ctx, rf, newContent);
  return { path: rf.destRel, action: "conflict_overwritten" };
}

interface RulesCtx {
  projectRoot: string;
  vars: TemplateVars;
  dryRun: boolean;
  priorMap: Map<string, InstalledFile>;
  nextFiles: Map<string, InstalledFile>;
  kitRepo: string;
}

function applyRulesArtifact(a: Artifact, allFiles: ResolvedFile[], ctx: RulesCtx): FileResult {
  const profile = getProfile();
  const destRel = a.dest ?? profile.rulesFile;
  const abs = join(ctx.projectRoot, destRel);

  const blockRaw = readFileSync(kitPath(a.blockSrc as string), "utf8");
  const vars: TemplateVars = {
    ...ctx.vars,
    DOCS_TABLE: buildDocsTable(allFiles),
    SKILLS_TABLE: buildSkillsTable(allFiles, ctx.vars),
  };
  const blockBody = render(blockRaw, vars);

  let newContent: string;
  if (existsSync(abs)) {
    const existing = readFileSync(abs, "utf8");
    newContent = applyRulesBlockWithMarkers(existing, blockBody).content;
    if (newContent === existing) {
      trackRaw(ctx.nextFiles, destRel, newContent, a.id, a.strategy);
      return { path: destRel, action: "unchanged" };
    }
    writeFileRaw(abs, newContent, ctx.dryRun);
    trackRaw(ctx.nextFiles, destRel, newContent, a.id, a.strategy);
    return { path: destRel, action: "updated", note: "managed block" };
  }

  // Fresh: render the full template, inject the block wrapped in sentinels.
  const fullRaw = readFileSync(kitPath(a.fullSrc as string), "utf8");
  const managed = `${profile.sentinelBegin}\n${blockBody.trim()}\n${profile.sentinelEnd}`;
  // Normalize trailing newlines to match the merge path (applyRulesBlockWithMarkers),
  // so a subsequent `sync` sees byte-identical content and reports `unchanged`.
  newContent = render(fullRaw, { ...vars, MANAGED_BLOCK: managed }).replace(/[\r\n]*$/, "\n");
  writeFileRaw(abs, newContent, ctx.dryRun);
  trackRaw(ctx.nextFiles, destRel, newContent, a.id, a.strategy);
  return { path: destRel, action: "created" };
}

// ---------------------------------------------------------------------------
// low-level helpers
// ---------------------------------------------------------------------------

function writeFile(abs: string, content: string, executable: boolean, dryRun: boolean): void {
  if (dryRun) return;
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, "utf8");
  if (executable) chmodSync(abs, 0o755);
}

function writeFileRaw(abs: string, content: string, dryRun: boolean): void {
  writeFile(abs, content, false, dryRun);
}

function track(ctx: FileCtx, rf: ResolvedFile, content: string): void {
  trackRaw(ctx.nextFiles, rf.destRel, content, rf.artifactId, rf.strategy);
}

function trackRaw(
  map: Map<string, InstalledFile>,
  path: string,
  content: string,
  artifactId: string,
  strategy: Strategy,
): void {
  map.set(path, { path, hash: contentHash(content), artifactId, strategy });
}

/** Keep only real answers (not generated tables) in the persisted vars. */
function stripDerived(vars: TemplateVars): TemplateVars {
  const out: TemplateVars = {};
  for (const [k, v] of Object.entries(vars)) {
    if (k === "DOCS_TABLE" || k === "SKILLS_TABLE" || k === "MANAGED_BLOCK") continue;
    out[k] = v;
  }
  return out;
}
