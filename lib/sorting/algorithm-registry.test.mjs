import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const registrySource = readFileSync(new URL("./registry.ts", import.meta.url), "utf8");
const algorithmsSource = readFileSync(new URL("./algorithms.ts", import.meta.url), "utf8");

const firstBatchIds = [
  "bubble-sort",
  "selection-sort",
  "insertion-sort",
  "merge-sort",
  "quick-sort",
  "heap-sort",
  "counting-sort",
  "radix-sort-lsd",
  "bucket-sort",
  "shell-sort",
  "comb-sort",
  "cocktail-shaker-sort",
  "odd-even-sort",
  "gnome-sort",
  "pancake-sort",
  "cycle-sort",
  "patience-sort",
  "bogo-sort",
  "stalin-sort",
  "sleep-sort",
];

const secondBatchIds = [
  "binary-insertion-sort",
  "bottom-up-merge-sort",
  "natural-merge-sort",
  "three-way-quick-sort",
  "dual-pivot-quick-sort",
  "intro-sort",
  "tim-sort",
  "radix-sort-msd",
  "pigeonhole-sort",
  "american-flag-sort",
  "tree-sort",
  "tournament-sort",
  "strand-sort",
  "library-sort",
  "bead-sort",
  "spaghetti-sort",
  "stooge-sort",
  "slow-sort",
  "bozo-sort",
  "miracle-sort",
];

const implementedIds = [...firstBatchIds, ...secondBatchIds];

test("implemented batch ids are registered and implemented", () => {
  for (const id of implementedIds) {
    assert.match(registrySource, new RegExp(`id: "${id}"`), `${id} is missing from registry metadata`);
    assert.match(algorithmsSource, new RegExp(`"${id}": \\{`), `${id} is missing from algorithms map`);
    assert.match(registrySource, new RegExp(`algorithms\\["${id}"\\]`), `${id} is missing from registry loader`);
  }
});

test("registered algorithm ids are unique", () => {
  const registeredIds = [...registrySource.matchAll(/id: "([^"]+)"/g)].map((match) => match[1]);
  const implementedIds = [...algorithmsSource.matchAll(/^  "([^"]+)": \{/gm)].map((match) => match[1]);

  assert.equal(new Set(registeredIds).size, registeredIds.length, "registry contains duplicate ids");
  assert.equal(new Set(implementedIds).size, implementedIds.length, "algorithms map contains duplicate ids");
});
