import { describe, it, expect } from "vitest";
import {
  render,
  placeholdersIn,
  withDerived,
  kebab,
  upperSnake,
} from "../src/lib/template.js";

describe("template", () => {
  it("renders known placeholders and leaves unknown ones", () => {
    const out = render("{{A}} and {{B}}", { A: "1" });
    expect(out).toBe("1 and {{B}}");
  });

  it("tolerates whitespace inside braces", () => {
    expect(render("{{ A }}", { A: "x" })).toBe("x");
  });

  it("lists distinct placeholders", () => {
    expect(placeholdersIn("{{A}}{{A}}{{B}}").sort()).toEqual(["A", "B"]);
  });

  it("derives lower/slug/env-prefix and KIT_REPO", () => {
    const d = withDerived({ PROJECT_NAME: "Acme Portal", PRIMARY_ENTITY: "Order" }, "org/kit");
    expect(d.PRIMARY_ENTITY_LOWER).toBe("order");
    expect(d.PROJECT_SLUG).toBe("acme-portal");
    expect(d.PROJECT_ENV_PREFIX).toBe("ACME_PORTAL");
    expect(d.KIT_REPO).toBe("org/kit");
  });

  it("kebab & upperSnake handle camelCase and symbols", () => {
    expect(kebab("MyCoolApp!")).toBe("my-cool-app");
    expect(upperSnake("My Cool App")).toBe("MY_COOL_APP");
  });
});
