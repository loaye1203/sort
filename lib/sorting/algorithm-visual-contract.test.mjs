import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadTypeScriptModule(path, dependencies = {}) {
  const source = readFileSync(path, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const moduleRecord = { exports: {} };

  new Function("require", "module", "exports", output)(
    (id) => Object.hasOwn(dependencies, id) ? dependencies[id] : require(id),
    moduleRecord,
    moduleRecord.exports,
  );

  return moduleRecord.exports;
}

const registry = loadTypeScriptModule(new URL("./registry.ts", import.meta.url), { "./types": {} });
const planner = loadTypeScriptModule(new URL("./animation-planner.ts", import.meta.url), { "./types": {} });
const implementations = Object.assign(
  {},
  ...["full", "simplified", "simulated"].map((level) => (
    loadTypeScriptModule(new URL(`./algorithms/${level}.ts`, import.meta.url), { "../types": {} }).algorithms
  )),
);
const supportedMotionKinds = new Set([
  "aborted",
  "compare",
  "delete",
  "done",
  "mark",
  "message",
  "shuffle",
  "swap",
  "timer",
  "write",
]);

function runAlgorithm(id, input) {
  const meta = registry.findRegistryEntry(id).meta;
  const steps = [...implementations[id].generateSteps(input, { safety: registry.getSafetyLimit(meta) })];
  return { steps, terminal: steps.at(-1) };
}

test("all runnable algorithms keep Pixi step indices inside the visible array", () => {
  const runnableEntries = registry.algorithmRegistry.filter((entry) => entry.load !== null);
  const originalRandom = Math.random;
  let seed = 0x12345678;

  Math.random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 0x100000000;
  };

  try {
    assert.equal(runnableEntries.length, 123);
    assert.equal(Object.keys(implementations).length, 123);

    for (const { meta } of runnableEntries) {
      const implementation = implementations[meta.id];
      const baseSafety = registry.getSafetyLimit(meta);
      const inputSize = Math.max(
        2,
        Math.min(baseSafety.maxArraySize, meta.canRunForever || meta.category === "危险排序" ? 4 : 8),
      );
      const input = Array.from({ length: inputSize }, (_, index) => ((inputSize - index) * 7) % 17 + 1);
      const safety = {
        ...baseSafety,
        maxRuntimeMs: Math.min(baseSafety.maxRuntimeMs, 5_000),
        maxSteps: Math.min(baseSafety.maxSteps, 20_000),
      };
      const generator = implementation.generateSteps(input, { safety });
      let visibleArray = [...input];
      let terminalType = null;
      let stepCount = 0;

      while (stepCount < 25_000) {
        const result = generator.next();
        if (result.done) break;

        const step = result.value;
        const prefix = `${meta.id} step ${stepCount + 1}`;
        const motion = planner.planSortMotion(step, visibleArray);
        assert.ok(supportedMotionKinds.has(motion.kind), `${prefix} has unsupported motion ${motion.kind}`);

        if (step.type === "compare" || step.type === "mark") {
          assert.ok(
            step.indices.every((index) => Number.isInteger(index) && index >= 0 && index < visibleArray.length),
            `${prefix} highlights outside the visible array`,
          );
        }

        if (step.type === "swap") {
          assert.equal(step.array.length, visibleArray.length, `${prefix} changes length during swap`);
          assert.ok(
            step.indices.every((index) => Number.isInteger(index) && index >= 0 && index < visibleArray.length),
            `${prefix} swaps outside the visible array`,
          );
        }

        if (step.type === "write") {
          assert.ok(
            Number.isInteger(step.index) && step.index >= 0 && step.index < step.array.length,
            `${prefix} writes outside its next visible array`,
          );
        }

        if (step.type === "delete") {
          assert.ok(
            Number.isInteger(step.index) && step.index >= 0 && step.index < visibleArray.length,
            `${prefix} deletes outside the visible array`,
          );
          assert.equal(step.array.length, visibleArray.length - 1, `${prefix} must remove exactly one element`);
        }

        if (step.type === "shuffle") {
          assert.equal(step.array.length, visibleArray.length, `${prefix} changes length during shuffle`);
        }

        if (step.animation?.kind === "move" || step.animation?.kind === "range-shift") {
          assert.equal(step.type, "write", `${prefix} movement hint requires a write step`);
          assert.ok(
            step.animation.from >= 0 && step.animation.from < visibleArray.length,
            `${prefix} moves from outside the visible array`,
          );
          assert.equal(step.animation.to, step.index, `${prefix} movement target must match the write index`);
        }

        if ("array" in step) visibleArray = [...step.array];
        if (step.type === "done" || step.type === "aborted") terminalType = step.type;
        stepCount += 1;
      }

      assert.ok(stepCount < 25_000, `${meta.id} exceeded the visual-contract audit cap`);
      assert.equal(terminalType, "done", `${meta.id} must finish the deterministic audit input`);
    }
  } finally {
    Math.random = originalRandom;
  }
});

test("selection-extraction and drop algorithms preserve their intended outputs", () => {
  const input = [6, 2, 8, 1, 7, 3, 5, 4];
  const sorted = [...input].sort((left, right) => left - right);

  for (const id of ["tournament-sort", "cartesian-tree-sort", "quickselect-sort"]) {
    const { steps, terminal } = runAlgorithm(id, input);
    assert.equal(terminal?.type, "done", `${id} must finish`);
    assert.deepEqual(terminal.array, sorted, `${id} must preserve its sorted output`);
    assert.ok(
      steps.filter((step) => step.type === "write").every((step) => step.array.length === input.length),
      `${id} must keep the full visible array during extraction`,
    );
  }

  const dropMerge = runAlgorithm("drop-merge-sort", input);
  assert.equal(dropMerge.terminal?.type, "done");
  assert.deepEqual(dropMerge.terminal.array, [6, 8]);
  assert.ok(dropMerge.steps.some((step) => step.type === "delete"), "drop-merge-sort must expose deletions");
});
