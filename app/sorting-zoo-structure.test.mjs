import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(new URL("./sorting-zoo.tsx", import.meta.url), "utf8");
const runnerSource = readFileSync(new URL("./hooks/use-sorting-runner.ts", import.meta.url), "utf8");
const controlsSource = readFileSync(new URL("./components/sorting-controls.tsx", import.meta.url), "utf8");

test("sorting page delegates generator and timer ownership to useSortingRunner", () => {
  assert.match(pageSource, /useSortingRunner\(/);
  assert.doesNotMatch(pageSource, /Generator<SortStep>/);
  assert.doesNotMatch(pageSource, /setInterval\(/);
  assert.match(runnerSource, /Generator<SortStep>/);
  assert.match(runnerSource, /setInterval\(/);
  assert.match(runnerSource, /createLatestRequestGuard/);
  assert.match(runnerSource, /pauseTiming/);
});

test("sorting controls remain presentational and do not access generators or timers", () => {
  assert.match(controlsSource, /export const SortingControls = memo\(/);
  assert.doesNotMatch(controlsSource, /Generator<SortStep>/);
  assert.doesNotMatch(controlsSource, /setInterval\(/);
  assert.doesNotMatch(controlsSource, /createRandomArray/);
});

test("all requested page regions are composed by sorting-zoo", () => {
  for (const component of [
    "AlgorithmSidebar",
    "SortingVisualizer",
    "SortingControls",
    "AlgorithmInfo",
    "AlgorithmCodePanel",
  ]) {
    assert.match(pageSource, new RegExp(`<${component}\\b`));
  }
});
