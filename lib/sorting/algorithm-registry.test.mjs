import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const registrySource = readFileSync(new URL("./registry.ts", import.meta.url), "utf8");
const algorithmsSource = readFileSync(new URL("./algorithms.ts", import.meta.url), "utf8");

function numberLiteralValue(value) {
  return Number(value.replaceAll("_", ""));
}

function modeLimit(mode, key) {
  const escapedMode = mode.replaceAll("-", "\\-");
  const modePattern = new RegExp(`${mode === "catalog-only" ? `"${escapedMode}"` : mode}: \\{([\\s\\S]*?)\\n  \\}`);
  const modeMatch = registrySource.match(modePattern);
  assert.ok(modeMatch, `${mode} safety block is missing`);

  const keyMatch = modeMatch[1].match(new RegExp(`${key}: ([0-9_]+)`));
  assert.ok(keyMatch, `${mode}.${key} is missing`);

  return numberLiteralValue(keyMatch[1]);
}

function explicitLimit(id, key) {
  const blockPattern = new RegExp(`"${id}": \\{([\\s\\S]*?)\\n  \\}`);
  const blockMatch = registrySource.match(blockPattern);
  assert.ok(blockMatch, `${id} explicit safety block is missing`);

  const keyMatch = blockMatch[1].match(new RegExp(`${key}: ([0-9_]+)`));
  assert.ok(keyMatch, `${id}.${key} is missing`);

  return numberLiteralValue(keyMatch[1]);
}

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

const thirdBatchIds = [
  "in-place-merge-sort",
  "block-merge-sort",
  "weave-merge-sort",
  "smooth-sort",
  "weak-heap-sort",
  "cartesian-tree-sort",
  "flash-sort",
  "spread-sort",
  "proxmap-sort",
  "postman-sort",
  "burstsort",
  "sample-sort",
  "bitonic-sort",
  "odd-even-merge-sort",
  "pairwise-sorting-network",
  "rank-sort",
  "brick-sort",
  "circle-sort",
  "cycle-leader-sort",
  "drop-merge-sort",
];

const fourthBatchIds = [
  "quickselect-sort",
  "median-of-three-quick-sort",
  "ternary-heap-sort",
  "binomial-heap-sort",
  "pairing-heap-sort",
  "cube-sort",
  "quad-sort",
  "grail-sort",
  "wiki-sort",
  "flux-sort",
  "pdq-sort",
  "power-sort",
  "shivers-sort",
  "merge-insertion-sort",
  "splay-sort",
  "treap-sort",
  "patience-merge-sort",
  "library-insertion-sort",
  "replacement-selection-sort",
  "balanced-merge-sort",
];

const fifthBatchIds = [
  "external-merge-sort",
  "multiway-merge-sort",
  "polyphase-merge-sort",
  "cascade-merge-sort",
  "distribution-sort",
  "integer-sort",
  "tag-sort",
  "address-calculation-sort",
  "topological-sort-as-sorting",
  "bitset-sort",
  "randomized-quick-sort",
  "block-quick-sort",
  "stable-quick-sort",
  "parallel-merge-sort",
  "parallel-quick-sort",
  "gpu-bitonic-sort",
  "mapreduce-sort",
  "quantum-bogo-sort",
  "bogobogo-sort",
  "bogosort-deterministic-seed",
];

const finalBatchIds = [
  "permutation-sort",
  "random-sort",
  "las-vegas-sort",
  "monte-carlo-sort",
  "guess-sort",
  "worstsort",
  "best-sort",
  "panic-sort",
  "annealing-sort",
  "genetic-sort",
  "neural-sort",
  "quantum-sort",
  "entropy-sort",
  "time-sort",
  "calendar-sort",
  "post-office-sort",
  "lexicographic-sort",
  "shortlex-sort",
  "partial-sort",
  "nth-element-sort",
];

const remainingCatalogIds = [
  "aks-sorting-network",
  "alpha-merge-sort",
  "alpha-stack-sort",
  "binar-sort",
  "burnt-pancake-sort",
  "cache-conscious-burstsort",
  "columnsort",
  "crum-sort",
  "exchange-sort",
  "funnel-sort",
  "hash-sort",
  "histogram-sort",
  "intelligent-design-sort",
  "interpolation-sort",
  "msd-string-radix-sort",
  "multikey-quick-sort",
  "peek-sort",
  "poplar-sort",
  "quick-heap-sort",
  "quick-merge-sort",
  "quick-weak-heap-sort",
  "radix-exchange-sort",
  "random-comparator-sort",
  "shearsort",
  "shellsort-network",
  "square-sort",
  "twin-array-sort",
  "zig-zag-sort",
];

const implementedIds = [
  ...firstBatchIds,
  ...secondBatchIds,
  ...thirdBatchIds,
  ...fourthBatchIds,
  ...fifthBatchIds,
  ...finalBatchIds,
  ...remainingCatalogIds,
];

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

test("safety limits leave normal algorithms roomy and only cap risky ones", () => {
  assert.ok(modeLimit("real", "maxRuntimeMs") >= 120_000, "real algorithms should have a roomy fallback runtime");
  assert.ok(modeLimit("limited", "maxRuntimeMs") >= 60_000, "limited algorithms should not stop after a few seconds");
  assert.ok(modeLimit("simulated", "maxRuntimeMs") >= 30_000, "simulated algorithms should have at least 30 seconds");
  assert.equal(modeLimit("catalog-only", "maxRuntimeMs"), 0, "catalog-only algorithms should not execute");

  const riskyIds = [
    "bogo-sort",
    "bozo-sort",
    "bogobogo-sort",
    "bogosort-deterministic-seed",
    "las-vegas-sort",
    "permutation-sort",
    "random-sort",
    "slow-sort",
    "stooge-sort",
    "time-sort",
    "sleep-sort",
    "worstsort",
    "random-comparator-sort",
  ];

  for (const id of riskyIds) {
    assert.ok(explicitLimit(id, "maxRuntimeMs") >= 30_000, `${id} should have at least 30 seconds`);
  }
});

test("each algorithm has a simple user-facing description override", () => {
  const registeredIds = [...registrySource.matchAll(/id: "([^"]+)"/g)].map((match) => match[1]);
  const blockMatch = registrySource.match(/const readableDescriptionsById: Record<string, string> = \{([\s\S]*?)\n\};/);
  assert.ok(blockMatch, "readable description override map is missing");

  const descriptionEntries = [...blockMatch[1].matchAll(/^\s+"([^"]+)": "([^"]+)",$/gm)];
  const descriptions = new Map(descriptionEntries.map((match) => [match[1], match[2]]));

  for (const id of registeredIds) {
    const description = descriptions.get(id);
    assert.ok(description, `${id} is missing a readable description`);
    assert.match(description, /[\u4e00-\u9fa5]/, `${id} description should be Chinese-readable`);
    assert.ok(description.length >= 24, `${id} description is too short to explain the idea`);
  }

  assert.match(descriptions.get("heap-sort") ?? "", /树|最大值|末尾/, "heap-sort should explain the heap idea in plain words");
  assert.match(descriptions.get("quick-sort") ?? "", /基准|左|右/, "quick-sort should explain partitioning plainly");
  assert.match(descriptions.get("bogo-sort") ?? "", /随机|可能|限制/, "bogo-sort should clearly explain the risk");
});
