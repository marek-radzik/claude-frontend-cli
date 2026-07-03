import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readKitManifest } from "../src/lib/manifest.js";
import { applyArtifacts } from "../src/lib/writer.js";
import { skipResolver } from "../src/lib/conflict-prompt.js";
import { withDerived } from "../src/lib/template.js";

const kit = readKitManifest();
const vars = withDerived({ PROJECT_NAME: "Test App", PRIMARY_ENTITY: "Order" }, kit.kitRepo);

function baseOpts(projectRoot: string, over: Partial<Parameters<typeof applyArtifacts>[1]> = {}) {
  return {
    projectRoot,
    vars,
    modules: [] as string[],
    dryRun: false,
    force: false,
    resolver: skipResolver,
    ...over,
  };
}

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "cfc-test-"));
});

describe("writer / applyArtifacts", () => {
  it("bootstraps a fresh project and is idempotent", async () => {
    const first = await applyArtifacts(kit, baseOpts(root), null);
    expect(existsSync(join(root, ".docs/TDD.md"))).toBe(true);
    expect(existsSync(join(root, ".claude/skills/check/SKILL.md"))).toBe(true);
    const claude = readFileSync(join(root, "CLAUDE.md"), "utf8");
    expect(claude).toContain("<!-- BEGIN claude-frontend-cli -->");
    expect(first.results.every((r) => r.action === "created")).toBe(true);

    const second = await applyArtifacts(kit, baseOpts(root), first.manifest);
    expect(second.results.some((r) => r.action === "created")).toBe(false);
    expect(second.results.every((r) => ["unchanged", "skipped"].includes(r.action))).toBe(true);
  });

  it("does not write anything in dry-run", async () => {
    const report = await applyArtifacts(kit, baseOpts(root, { dryRun: true }), null);
    expect(report.results.length).toBeGreaterThan(0);
    expect(existsSync(join(root, ".docs/TDD.md"))).toBe(false);
    expect(existsSync(join(root, "CLAUDE.md"))).toBe(false);
  });

  it("never overwrites skip-if-exists config without --force", async () => {
    const first = await applyArtifacts(kit, baseOpts(root), null);
    const settingsPath = join(root, ".claude/settings.json");
    writeFileSync(settingsPath, '{"mine":true}', "utf8");

    const second = await applyArtifacts(kit, baseOpts(root), first.manifest);
    expect(readFileSync(settingsPath, "utf8")).toBe('{"mine":true}');
    const settingsResult = second.results.find((r) => r.path === ".claude/settings.json");
    expect(settingsResult?.action).toBe("skipped");
  });

  it("prune does not delete user-owned template-once files", async () => {
    const first = await applyArtifacts(kit, baseOpts(root), null);
    const sync = await applyArtifacts(kit, baseOpts(root, { prune: true }), first.manifest);
    expect(sync.results.some((r) => r.action === "removed")).toBe(false);
    expect(existsSync(join(root, ".instructions/PROJECT-SETUP.md"))).toBe(true);
  });

  it("select installs a single skill by name", async () => {
    const report = await applyArtifacts(
      kit,
      baseOpts(root, { select: { type: "skill", name: "new-form" } }),
      null,
    );
    expect(existsSync(join(root, ".claude/skills/new-form/SKILL.md"))).toBe(true);
    expect(existsSync(join(root, ".claude/skills/check/SKILL.md"))).toBe(false);
    expect(report.results.every((r) => r.path.includes("new-form"))).toBe(true);
  });
});
