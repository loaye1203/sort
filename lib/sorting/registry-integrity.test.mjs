import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const registrySource = readFileSync(new URL("./registry.ts", import.meta.url), "utf8");
const registryIds = [...registrySource.matchAll(/id: "([^"]+)"/g)].map((match) => match[1]);
const baselineIds = "bubble-sort|selection-sort|insertion-sort|merge-sort|quick-sort|heap-sort|counting-sort|radix-sort-lsd|bucket-sort|shell-sort|comb-sort|cocktail-shaker-sort|odd-even-sort|gnome-sort|pancake-sort|cycle-sort|patience-sort|binary-insertion-sort|bottom-up-merge-sort|natural-merge-sort|three-way-quick-sort|dual-pivot-quick-sort|intro-sort|tim-sort|radix-sort-msd|pigeonhole-sort|american-flag-sort|tree-sort|tournament-sort|strand-sort|library-sort|bead-sort|spaghetti-sort|stooge-sort|slow-sort|bozo-sort|miracle-sort|in-place-merge-sort|block-merge-sort|weave-merge-sort|smooth-sort|weak-heap-sort|cartesian-tree-sort|flash-sort|spread-sort|proxmap-sort|postman-sort|burstsort|sample-sort|bitonic-sort|odd-even-merge-sort|pairwise-sorting-network|rank-sort|brick-sort|circle-sort|cycle-leader-sort|drop-merge-sort|quickselect-sort|median-of-three-quick-sort|ternary-heap-sort|binomial-heap-sort|pairing-heap-sort|cube-sort|quad-sort|grail-sort|wiki-sort|flux-sort|pdq-sort|power-sort|shivers-sort|merge-insertion-sort|splay-sort|treap-sort|patience-merge-sort|library-insertion-sort|replacement-selection-sort|balanced-merge-sort|external-merge-sort|multiway-merge-sort|polyphase-merge-sort|cascade-merge-sort|distribution-sort|integer-sort|tag-sort|address-calculation-sort|topological-sort-as-sorting|bitset-sort|randomized-quick-sort|block-quick-sort|stable-quick-sort|parallel-merge-sort|parallel-quick-sort|gpu-bitonic-sort|mapreduce-sort|quantum-bogo-sort|bogobogo-sort|bogosort-deterministic-seed|permutation-sort|random-sort|las-vegas-sort|monte-carlo-sort|guess-sort|worstsort|best-sort|panic-sort|annealing-sort|genetic-sort|neural-sort|quantum-sort|entropy-sort|time-sort|calendar-sort|post-office-sort|lexicographic-sort|shortlex-sort|partial-sort|nth-element-sort|aks-sorting-network|alpha-merge-sort|alpha-stack-sort|binar-sort|burnt-pancake-sort|cache-conscious-burstsort|columnsort|crum-sort|exchange-sort|funnel-sort|hash-sort|histogram-sort|intelligent-design-sort|interpolation-sort|msd-string-radix-sort|multikey-quick-sort|peek-sort|poplar-sort|quick-heap-sort|quick-merge-sort|quick-weak-heap-sort|radix-exchange-sort|random-comparator-sort|shearsort|shellsort-network|square-sort|twin-array-sort|zig-zag-sort|bogo-sort|stalin-sort|sleep-sort".split("|");

test("registry preserves all 148 unique ids and their established order", () => {
  assert.equal(registryIds.length, 148);
  assert.equal(new Set(registryIds).size, 148);
  assert.deepEqual(registryIds, baselineIds);
});

test("registry descriptions have one authoritative source", () => {
  assert.equal([...registrySource.matchAll(/description: "/g)].length, 148);
  assert.doesNotMatch(registrySource, /readableDescriptionsById/);
  assert.doesNotMatch(registrySource, /meta\.description\s*=/);
});

test("registry exposes an id map without replacing the ordered array", () => {
  assert.match(registrySource, /export const algorithmRegistryById = new Map/);
  assert.match(registrySource, /algorithmRegistry\.map\(\(entry\) => \[entry\.meta\.id, entry\]\)/);
  assert.doesNotMatch(registrySource, /algorithmRegistry\.find\(/);
});

test("id map resolves the same entry objects as the ordered registry", () => {
  const output = ts.transpileModule(registrySource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const moduleRecord = { exports: {} };
  new Function("require", "module", "exports", output)(
    (id) => id === "./types" ? {} : require(id),
    moduleRecord,
    moduleRecord.exports,
  );

  for (const entry of moduleRecord.exports.algorithmRegistry) {
    assert.equal(moduleRecord.exports.algorithmRegistryById.get(entry.meta.id), entry);
  }
});

test("every entry has exactly one legal implementation level", () => {
  const levels = [...registrySource.matchAll(/implementationLevel: "([^"]+)"/g)].map((match) => match[1]);
  assert.equal(levels.length, 148);
  assert.ok(levels.every((level) => ["full", "simplified", "simulated", "catalog-only"].includes(level)));
});

test("catalog-only entries cannot enter the runnable loading flow", () => {
  assert.equal([...registrySource.matchAll(/    load: null,/g)].length, 25);
});
