import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { selectPackages } from "./select-packages.mjs";

const packages = [
  { name: "@elections/contracts", dir: "packages/contracts", dependencies: ["@elections/shared"] },
  { name: "@elections/frontend", dir: "packages/frontend", dependencies: ["@elections/shared"] },
  { name: "@elections/shared", dir: "packages/shared", dependencies: [] },
];

describe("selectPackages", () => {
  it("should select only the frontend when only the frontend is staged", () => {
    assert.deepEqual(selectPackages(["packages/frontend/src/app.tsx"], packages), ["@elections/frontend"]);
  });

  it("should select shared and the packages that consume it when shared is staged", () => {
    assert.deepEqual(selectPackages(["packages/shared/ballot.ts"], packages), [
      "@elections/contracts",
      "@elections/frontend",
      "@elections/shared",
    ]);
  });

  it("should select only the contracts when only the contracts are staged", () => {
    assert.deepEqual(selectPackages(["packages/contracts/contracts/Party.sol"], packages), [
      "@elections/contracts",
    ]);
  });

  it("should select nothing when only files outside the packages are staged", () => {
    assert.deepEqual(selectPackages([".specs/x.md", "package.json", "README.md"], packages), []);
  });

  it("should select nothing when nothing is staged", () => {
    assert.deepEqual(selectPackages([], packages), []);
  });

  it("should combine a package with files outside the packages", () => {
    assert.deepEqual(selectPackages(["packages/shared/x.ts", ".specs/x.md"], packages), [
      "@elections/contracts",
      "@elections/frontend",
      "@elections/shared",
    ]);
  });

  it("should select two touched packages and nothing else", () => {
    assert.deepEqual(
      selectPackages(["packages/frontend/x.ts", "packages/contracts/x.sol"], packages),
      ["@elections/contracts", "@elections/frontend"],
    );
  });

  it("should not confuse a directory that only shares the prefix", () => {
    assert.deepEqual(selectPackages(["packages/frontend-docs/x.md"], packages), []);
  });

  it("should follow dependents transitively", () => {
    const chain = [
      { name: "a", dir: "packages/a", dependencies: [] },
      { name: "b", dir: "packages/b", dependencies: ["a"] },
      { name: "c", dir: "packages/c", dependencies: ["b"] },
    ];

    assert.deepEqual(selectPackages(["packages/a/x.ts"], chain), ["a", "b", "c"]);
  });
});
