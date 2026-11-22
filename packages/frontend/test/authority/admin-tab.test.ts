import { describe, expect, it } from "vitest";
import { parseAdminTab } from "@/authority/admin-tab";

describe("parseAdminTab", () => {
  it.each([
    [null, "eleitores"],
    ["", "eleitores"],
    ["xyz", "eleitores"],
    ["Partidos", "eleitores"],
    ["eleitores", "eleitores"],
    ["eleicoes", "eleicoes"],
    ["partidos", "partidos"],
  ])("should read %j as %s", (param, tab) => {
    expect(parseAdminTab(param)).toBe(tab);
  });
});
