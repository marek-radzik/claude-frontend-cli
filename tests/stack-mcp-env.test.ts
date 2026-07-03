import { describe, it, expect, beforeEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readKitManifest } from "../src/lib/manifest.js";
import { applyArtifacts } from "../src/lib/writer.js";
import { buildEnvExample } from "../src/lib/writer.js";
import { skipResolver } from "../src/lib/conflict-prompt.js";
import { withDerived } from "../src/lib/template.js";
import { getStack, techTableMarkdown } from "../src/lib/stack.js";

const kit = readKitManifest();
const vars = withDerived({ PROJECT_NAME: "Acme Portal", PRIMARY_ENTITY: "Order" }, kit.kitRepo);

function opts(projectRoot: string, over: Record<string, unknown> = {}) {
  return {
    projectRoot,
    vars,
    modules: ["mcp"] as string[],
    dryRun: false,
    force: false,
    resolver: skipResolver,
    ...over,
  };
}

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "cfc-r2-"));
});

describe("security — no real secrets bundled", () => {
  it("no tokens appear anywhere in content/ or skills/", () => {
    // Grep the shipped content tree for known token prefixes (vitest cwd = repo root).
    const hits = execSync("grep -rIlE 'ctx7sk-|glpat-|ATATT' content skills || true", {
      cwd: process.cwd(),
      encoding: "utf8",
    }).trim();
    expect(hits).toBe("");
  });

  it("rendered .mcp.json references the env var, never a value", async () => {
    await applyArtifacts(kit, opts(root, { stack: "nuxt-vue" }), null);
    const mcp = readFileSync(join(root, ".mcp.json"), "utf8");
    expect(mcp).toContain("${CONTEXT7_API_KEY}");
    expect(mcp).not.toMatch(/ctx7sk-/);
  });
});

describe("env.example tiers", () => {
  it("core (mcp) has REQUIRED CONTEXT7 + OPTIONAL git/project, no jira, no GITLAB_TOKEN", () => {
    const env = buildEnvExample(kit.envKeys, ["mcp"], vars);
    expect(env).toContain("CONTEXT7_API_KEY=");
    expect(env).toContain("GIT_TOKEN=");
    expect(env).toContain("ACME_PORTAL_TOKEN=");
    expect(env).not.toContain("JIRA_TOKEN=");
    expect(env).not.toContain("GITLAB_TOKEN");
    expect(env.split("\n").every((l) => !/=\S/.test(l))).toBe(true); // no filled values
  });

  it("jira module adds the JIRA_* block", () => {
    const env = buildEnvExample(kit.envKeys, ["mcp", "jira"], vars);
    expect(env).toContain("JIRA_EMAIL=");
    expect(env).toContain("JIRA_TOKEN=");
    expect(env).toContain("JIRA_USER_ID=");
  });

  it("applyArtifacts writes .env.example and gitignores .env when mcp on", async () => {
    await applyArtifacts(kit, opts(root, { stack: "nuxt-vue" }), null);
    expect(existsSync(join(root, ".env.example"))).toBe(true);
    expect(readFileSync(join(root, ".gitignore"), "utf8")).toContain(".env");
  });

  it("no .env.example / .mcp.json when neither mcp nor jira enabled", async () => {
    await applyArtifacts(kit, opts(root, { stack: "nuxt-vue", modules: [] }), null);
    expect(existsSync(join(root, ".env.example"))).toBe(false);
    expect(existsSync(join(root, ".mcp.json"))).toBe(false);
  });
});

describe("stack gating", () => {
  it("react/generic exclude Vue-specific docs and new-* skills", async () => {
    await applyArtifacts(kit, opts(root, { stack: "react" }), null);
    for (const doc of ["TABLES", "FORMS", "COMPONENTS"]) {
      expect(existsSync(join(root, `.docs/${doc}.md`))).toBe(false);
    }
    for (const skill of ["new-form", "new-table", "new-feature"]) {
      expect(existsSync(join(root, `.claude/skills/${skill}/SKILL.md`))).toBe(false);
    }
    // core stack-agnostic docs still present
    expect(existsSync(join(root, ".docs/TDD.md"))).toBe(true);
  });

  it("nuxt-vue keeps the full set", async () => {
    await applyArtifacts(kit, opts(root, { stack: "nuxt-vue" }), null);
    expect(existsSync(join(root, ".docs/TABLES.md"))).toBe(true);
    expect(existsSync(join(root, ".claude/skills/new-form/SKILL.md"))).toBe(true);
  });

  it("tech table reflects the stack", () => {
    expect(techTableMarkdown(getStack(kit, "react"))).toContain("React");
    expect(techTableMarkdown(getStack(kit, "nuxt-vue"))).toContain("Nuxt 3");
  });

  it(".mcp.json libraries follow the stack", async () => {
    await applyArtifacts(kit, opts(root, { stack: "react" }), null);
    const mcp = readFileSync(join(root, ".mcp.json"), "utf8");
    expect(mcp).toContain('"react"');
    expect(mcp).not.toContain('"nuxt"');
  });
});
