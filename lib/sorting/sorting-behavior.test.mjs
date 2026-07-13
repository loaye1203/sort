import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadTypeScriptModule(path, dependencies = {}, jsx = ts.JsxEmit.Preserve) {
  const source = readFileSync(path, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      jsx,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const moduleRecord = { exports: {} };
  const localRequire = (id) => {
    if (Object.hasOwn(dependencies, id)) {
      return dependencies[id];
    }

    return require(id);
  };

  new Function("require", "module", "exports", output)(localRequire, moduleRecord, moduleRecord.exports);
  return moduleRecord.exports;
}

const registryPath = new URL("./registry.ts", import.meta.url);
const enginePath = new URL("./engine.ts", import.meta.url);
const algorithmPaths = ["full", "simplified", "simulated"].map(
  (level) => new URL(`./algorithms/${level}.ts`, import.meta.url),
);
const controlsPath = new URL("../../app/components/sorting-controls.tsx", import.meta.url);
const registryModule = loadTypeScriptModule(registryPath, { "./types": {} });
const engineModule = loadTypeScriptModule(enginePath, { "./types": {} });
const algorithmsModule = {
  algorithms: Object.assign({}, ...algorithmPaths.map((path) => loadTypeScriptModule(path, {
    "../types": {},
  }).algorithms)),
};
const controlsModule = loadTypeScriptModule(
  controlsPath,
  {
    "../../lib/sorting/engine": engineModule,
    "../../lib/sorting/types": {},
    "../page.module.css": { default: {} },
  },
  ts.JsxEmit.ReactJSX,
);

function runAlgorithm(id, input) {
  const algorithm = algorithmsModule.algorithms[id];
  const meta = registryModule.findRegistryEntry(id).meta;
  const safety = registryModule.getSafetyLimit(meta);
  const steps = [...algorithm.generateSteps(input, { safety })];
  const terminal = steps.at(-1);

  assert.equal(terminal?.type, "done", `${id} should finish with a done step`);
  return { output: terminal.array, steps };
}

function sorted(values) {
  return [...values].sort((left, right) => left - right);
}

function assertMultisetPreserved(input, output) {
  assert.equal(output.length, input.length, "output length must be preserved");
  assert.deepEqual(sorted(output), sorted(input), "output multiset must match input");
}

test("Circle Sort fully sorts odd, even, duplicate, and sorted inputs", async (context) => {
  const cases = [
    { name: "合法奇数规模 7", input: [1, 2, 3, 4, 5, 7, 6] },
    { name: "偶数规模", input: [8, 3, 6, 1, 7, 2, 5, 4] },
    { name: "重复值", input: [4, 2, 4, 1, 3, 2, 1] },
    { name: "已排序输入", input: [1, 2, 3, 4, 5, 6, 7] },
  ];

  for (const entry of cases) {
    await context.test(entry.name, () => {
      const { output } = runAlgorithm("circle-sort", entry.input);
      assert.deepEqual(output, sorted(entry.input));
      assertMultisetPreserved(entry.input, output);
    });
  }
});

test("Partial Sort preserves elements and partitions around its sorted prefix", () => {
  const input = [8, 1, 7, 2, 6, 3, 5, 4];
  const prefixLength = Math.max(1, Math.floor(input.length / 2));
  const { output } = runAlgorithm("partial-sort", input);
  const prefix = output.slice(0, prefixLength);
  const suffix = output.slice(prefixLength);

  assertMultisetPreserved(input, output);
  assert.deepEqual(prefix, sorted(prefix), "partial-sort prefix must be ascending");
  assert.ok(
    prefix.every((prefixValue) => suffix.every((suffixValue) => prefixValue <= suffixValue)),
    "no prefix element may be greater than a suffix element",
  );
});

test("nth_element places the median and partitions without fully sorting", () => {
  const input = [8, 1, 7, 2, 6, 3, 5, 4];
  const nth = Math.floor(input.length / 2);
  const fullySorted = sorted(input);
  const { output, steps } = runAlgorithm("nth-element-sort", input);

  assertMultisetPreserved(input, output);
  assert.equal(output[nth], fullySorted[nth], "nth element must match the fully sorted reference");
  assert.ok(output.slice(0, nth).every((value) => value <= output[nth]), "left partition must not exceed nth");
  assert.ok(output.slice(nth + 1).every((value) => value >= output[nth]), "right partition must not precede nth");
  assert.notDeepEqual(output, fullySorted, "nth_element must not masquerade as a full sort");
  assert.ok(
    steps.filter((step) => step.type === "write").length < input.length,
    "nth_element must not write back every item from a fully sorted copy",
  );
});

test("catalog-only mode exposes reusable non-executable control state", () => {
  assert.equal(typeof controlsModule.getSortingControlsState, "function", "sorting controls state helper must be exported");

  assert.deepEqual(controlsModule.getSortingControlsState("catalog-only"), {
    canExecute: false,
    notice: "只读图鉴，不执行",
    showExecutionControls: false,
  });
  assert.deepEqual(controlsModule.getSortingControlsState("real"), {
    canExecute: true,
    notice: null,
    showExecutionControls: true,
  });
});
