import { describe, expect, it } from "vitest";
import { journey, limitations, technologies } from "@/about";

const allDocs = [
  ...technologies.flatMap((technology) => technology.docs),
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

  it("should give every card a unique anchor that the journey can point to", () => {
    const ids = technologies.map((technology) => technology.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const topic of journey.flatMap((step) => step.topics)) {
      expect(ids, topic.label).toContain(topic.target);
    }
  });
});
