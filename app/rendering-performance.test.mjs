import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const pagePath = new URL("./sorting-zoo.tsx", import.meta.url);
const pageSource = readFileSync(pagePath, "utf8");
const visualizerSource = readFileSync(new URL("./components/sorting-visualizer.tsx", import.meta.url), "utf8");
const sidebarSource = readFileSync(new URL("./components/algorithm-sidebar.tsx", import.meta.url), "utf8");
const infoSource = readFileSync(new URL("./components/algorithm-info.tsx", import.meta.url), "utf8");
const codePanelSource = readFileSync(new URL("./components/algorithm-code-panel.tsx", import.meta.url), "utf8");

function loadVisualizerModule() {
  const output = ts.transpileModule(visualizerSource, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const moduleRecord = { exports: {} };
  const dependencies = {
    "../../lib/sorting/engine": {},
    "../page.module.css": { default: {} },
  };
  const localRequire = (id) => (Object.hasOwn(dependencies, id) ? dependencies[id] : require(id));

  new Function("require", "module", "exports", output)(localRequire, moduleRecord, moduleRecord.exports);
  return moduleRecord.exports;
}

test("bar transitions stay below the step interval and retain a clear slow-speed cap", () => {
  const { getBarTransitionDuration } = loadVisualizerModule();

  assert.equal(typeof getBarTransitionDuration, "function");
  assert.equal(getBarTransitionDuration(20), 15);
  assert.equal(getBarTransitionDuration(130), 98);
  assert.equal(getBarTransitionDuration(600), 120);

  for (const speed of [20, 30, 50, 130, 600]) {
    assert.ok(getBarTransitionDuration(speed) <= 120);
    assert.ok(getBarTransitionDuration(speed) < speed);
  }
});

test("bar slots use fixed-position keys that do not include changing values", () => {
  assert.match(visualizerSource, /className=\{styles\.barSlot\}\s+key=\{index\}/);
  assert.doesNotMatch(visualizerSource, /key=\{`\$\{index\}-\$\{value\}`\}/);
});

test("low-frequency regions have memoized module-level render boundaries", () => {
  assert.match(sidebarSource, /export const AlgorithmSidebar = memo\(/);
  assert.match(infoSource, /export const AlgorithmInfo = memo\(/);
  assert.match(codePanelSource, /export const AlgorithmCodePanel = memo\(/);
  assert.doesNotMatch(pageSource, /const AlgorithmSidebar = memo\(/);
});
