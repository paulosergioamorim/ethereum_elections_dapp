import { describe, expect, it } from "vitest";
import { limitations, supportingTools, technologies } from "@/about";

const allDocs = [
  ...technologies.flatMap((technology) => technology.docs),
  ...supportingTools.map((tool) => tool.doc),
  ...limitations.flatMap((item) => (item.doc ? [item.doc] : [])),
];

describe("conteúdo da página Sobre", () => {
  it("should only link to https documentation", () => {
    for (const doc of allDocs) {
      expect(new URL(doc.href).protocol, doc.href).toBe("https:");
    }
  });

  it("should not repeat a link inside the same card", () => {
    for (const technology of technologies) {
      const hrefs = technology.docs.map((doc) => doc.href);
      expect(new Set(hrefs).size, technology.title).toBe(hrefs.length);
    }
  });

  it("should focus on Ethereum and Semaphore, each with a unique anchor", () => {
    expect(technologies.map((technology) => technology.id)).toEqual(["ethereum", "semaphore"]);
  });
});
