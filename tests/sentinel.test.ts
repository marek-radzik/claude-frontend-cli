import { describe, it, expect } from "vitest";
import {
  SENTINEL_BEGIN,
  SENTINEL_END,
  applyRulesBlockWithMarkers,
  removeRulesBlockWithMarkers,
  extractBlockBody,
} from "../src/lib/sentinel.js";

describe("sentinel", () => {
  it("appends a block to plain content", () => {
    const { content, existed } = applyRulesBlockWithMarkers("# My rules\n\nkeep me\n", "BODY");
    expect(existed).toBe(false);
    expect(content).toContain("keep me");
    expect(content).toContain(SENTINEL_BEGIN);
    expect(content).toContain(SENTINEL_END);
    expect(content).toContain("BODY");
  });

  it("is idempotent — re-apply yields byte-identical output", () => {
    const first = applyRulesBlockWithMarkers("# Rules\n", "BODY").content;
    const second = applyRulesBlockWithMarkers(first, "BODY").content;
    expect(second).toBe(first);
  });

  it("replaces the block in place without duplicating markers", () => {
    const first = applyRulesBlockWithMarkers("intro\n", "OLD").content;
    const updated = applyRulesBlockWithMarkers(first, "NEW");
    expect(updated.existed).toBe(true);
    expect(updated.content).toContain("NEW");
    expect(updated.content).not.toContain("OLD");
    expect(updated.content.match(new RegExp(SENTINEL_BEGIN.replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&"), "g"))?.length).toBe(1);
  });

  it("preserves user text outside the markers", () => {
    const withBlock = applyRulesBlockWithMarkers("TOP\n", "BODY").content;
    const edited = withBlock.replace("TOP", "TOP-EDITED") + "\nBOTTOM\n";
    const updated = applyRulesBlockWithMarkers(edited, "BODY2").content;
    expect(updated).toContain("TOP-EDITED");
    expect(updated).toContain("BOTTOM");
    expect(updated).toContain("BODY2");
  });

  it("removes the block and collapses whitespace", () => {
    const withBlock = applyRulesBlockWithMarkers("A\n", "BODY").content;
    const { content, removed } = removeRulesBlockWithMarkers(withBlock);
    expect(removed).toBe(true);
    expect(content).toContain("A");
    expect(content).not.toContain(SENTINEL_BEGIN);
  });

  it("no-ops on corrupted / out-of-order markers", () => {
    const bad = `${SENTINEL_END}\nx\n${SENTINEL_BEGIN}`;
    expect(removeRulesBlockWithMarkers(bad).removed).toBe(false);
    expect(extractBlockBody(bad)).toBeNull();
  });

  it("extracts the block body", () => {
    const withBlock = applyRulesBlockWithMarkers("", "HELLO").content;
    expect(extractBlockBody(withBlock)).toBe("HELLO");
  });
});
