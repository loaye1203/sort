import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(new URL("./sorting-zoo.tsx", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("./page.module.css", import.meta.url), "utf8");
const themeHookSource = readFileSync(new URL("./hooks/use-theme-mode.ts", import.meta.url), "utf8");
const runnerHookSource = readFileSync(new URL("./hooks/use-sorting-runner.ts", import.meta.url), "utf8");
const sidebarSource = readFileSync(new URL("./components/algorithm-sidebar.tsx", import.meta.url), "utf8");

test("sorting page exposes a dark and light theme toggle", () => {
  assert.match(pageSource, /data-theme=\{themeMode\.theme\}/, "shell should expose current theme as data-theme");
  assert.match(pageSource, /themeToggle/, "page should render a dedicated theme toggle control");
  assert.match(pageSource, /useThemeMode/, "page should delegate theme state to the theme hook");
  assert.match(themeHookSource, /localStorage\.getItem\("sorting-zoo-theme"\)/);
  assert.match(themeHookSource, /localStorage\.setItem\("sorting-zoo-theme", theme\)/);
  assert.match(cssSource, /\.shell\[data-theme="light"\]/, "CSS should define a light theme");
});

test("initial visual array is deterministic for hydration", () => {
  assert.match(runnerHookSource, /createHydrationSafeArray/, "runner should use a deterministic first render array");
  assert.doesNotMatch(
    runnerHookSource,
    /useState<number\[\]>\(\(\)\s*=>\s*createRandomArray/,
    "initial state must not call random generation during hydration",
  );
});

test("algorithm library has mobile entry, run-mode filters, and brand icon", () => {
  assert.match(sidebarSource, /mobileTopbar/, "mobile layout should expose a compact top bar");
  assert.match(sidebarSource, /libraryToggle/, "mobile layout should expose an algorithm library toggle");
  assert.match(sidebarSource, /runModeFilters/, "algorithm library should expose run-mode filters");
  assert.match(sidebarSource, /brand-icon-transparent\.png/, "page chrome should use the transparent brand icon");
  assert.match(pageSource, /scrollIntoView/, "selecting an algorithm should return the user to the stage");
  assert.match(cssSource, /\.sidebarOpen/, "CSS should define the opened mobile library state");
});
