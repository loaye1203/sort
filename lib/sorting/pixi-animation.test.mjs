import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(new URL("./animation-planner.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleRecord = { exports: {} };

new Function("require", "module", "exports", output)(require, moduleRecord, moduleRecord.exports);
const planner = moduleRecord.exports;

test("Pixi animation duration never catches the sorting interval", () => {
  for (const speed of [20, 30, 50, 130, 600]) {
    const duration = planner.getPixiAnimationDuration(speed, false);
    assert.ok(duration >= 16);
    assert.ok(duration < speed);
  }
  assert.equal(planner.getPixiAnimationDuration(130, true), 0);
});

test("range crossings exclude both moving endpoints", () => {
  assert.deepEqual(planner.getCrossedIndices(1, 5), [2, 3, 4]);
  assert.deepEqual(planner.getCrossedIndices(5, 1), [2, 3, 4]);
  assert.deepEqual(planner.getCrossedIndices(2, 3), []);
});

test("write motion stays in-place without a hint and honors explicit movement hints", () => {
  const valueUpdate = planner.planSortMotion(
    { type: "write", index: 2, value: 4, array: [9, 4, 4, 4] },
    [9, 4, 7, 4],
  );
  assert.deepEqual(valueUpdate, {
    kind: "write",
    index: 2,
    sourceIndex: null,
    lane: "upper",
    semantic: "value-update",
  });

  const explicit = planner.planSortMotion(
    {
      type: "write",
      index: 0,
      value: 4,
      array: [4, 4, 7, 4],
      animation: { kind: "move", from: 3, to: 0, lane: "lower" },
    },
    [9, 4, 7, 4],
  );
  assert.deepEqual(explicit, {
    kind: "write",
    index: 0,
    sourceIndex: 3,
    lane: "lower",
    semantic: "move",
  });
});

test("all existing SortStep families map to a supported Pixi motion", () => {
  const previous = [3, 2, 1];
  const steps = [
    { type: "compare", indices: [0, 1] },
    { type: "swap", indices: [0, 1], array: [2, 3, 1] },
    { type: "write", index: 2, value: 3, array: [2, 1, 3] },
    { type: "mark", indices: [1], role: "pivot" },
    { type: "delete", index: 1, array: [3, 1] },
    { type: "shuffle", array: [1, 3, 2] },
    { type: "message", text: "继续演示。" },
    { type: "message", text: "数值 2 醒来。" },
    { type: "done", array: [1, 2, 3] },
    { type: "aborted", reason: "安全限制" },
  ];

  assert.deepEqual(
    steps.map((step) => planner.planSortMotion(step, previous).kind),
    ["compare", "swap", "write", "mark", "delete", "shuffle", "message", "timer", "done", "aborted"],
  );
});
