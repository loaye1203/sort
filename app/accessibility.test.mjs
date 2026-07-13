import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sidebarSource = readFileSync(new URL("./components/algorithm-sidebar.tsx", import.meta.url), "utf8");
const pageSource = readFileSync(new URL("./sorting-zoo.tsx", import.meta.url), "utf8");
const infoSource = readFileSync(new URL("./components/algorithm-info.tsx", import.meta.url), "utf8");
const codeSource = readFileSync(new URL("./components/algorithm-code-panel.tsx", import.meta.url), "utf8");
const controlsSource = readFileSync(new URL("./components/sorting-controls.tsx", import.meta.url), "utf8");
const themeSource = readFileSync(new URL("./hooks/use-theme-mode.ts", import.meta.url), "utf8");
const layoutSource = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("./page.module.css", import.meta.url), "utf8");

test("mobile algorithm library owns one accessible modal lifecycle", () => {
  assert.match(sidebarSource, /aria-controls="algorithm-library"/);
  assert.match(sidebarSource, /aria-expanded=\{isLibraryOpen\}/);
  assert.match(sidebarSource, /role=\{isLibraryOpen \? "dialog" : undefined\}/);
  assert.match(sidebarSource, /aria-modal=\{isLibraryOpen \? "true" : undefined\}/);
  assert.match(sidebarSource, /event\.key === "Escape"/);
  assert.match(sidebarSource, /event\.key !== "Tab"/);
  assert.match(sidebarSource, /previousFocusRef/);
  assert.match(sidebarSource, /focus\(\)/);
  assert.match(sidebarSource, /styles\.libraryBackdrop/);
});

test("open mobile library isolates the stage and restores scrolling", () => {
  assert.match(pageSource, /stageRef/);
  assert.match(sidebarSource, /backgroundRef/);
  assert.match(sidebarSource, /\.inert = true/);
  assert.match(sidebarSource, /setAttribute\("inert", ""\)/);
  assert.match(sidebarSource, /removeAttribute\("inert"\)/);
  assert.match(sidebarSource, /setAttribute\("aria-hidden", "true"\)/);
  assert.match(sidebarSource, /document\.body\.style\.overflow = "hidden"/);
  assert.match(sidebarSource, /window\.scrollTo/);
});

test("critical lifecycle changes use a polite atomic live region", () => {
  assert.match(pageSource, /aria-live="polite"/);
  assert.match(pageSource, /aria-atomic="true"/);
  assert.match(pageSource, /runner\.algorithmLoading/);
  assert.match(pageSource, /runner\.algorithmLoadError/);
  assert.match(infoSource, /getStatusText/);
  assert.doesNotMatch(codeSource, /aria-live/);
});

test("paused runs expose an explicit continue action", () => {
  assert.match(controlsSource, /props\.status === "paused" \? "继续" : "开始"/);
});

test("reduced motion disables visual transitions without changing runner speed", () => {
  assert.match(cssSource, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(cssSource, /--bar-transition-ms:\s*0ms/);
  assert.match(pageSource, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(themeSource, /prefers-reduced-motion/);
});

test("saved and toggled themes synchronize the root color scheme", () => {
  assert.match(themeSource, /useState<ThemeMode>\("dark"\)/);
  assert.match(pageSource, /suppressHydrationWarning/);
  assert.match(themeSource, /document\.documentElement\.style\.colorScheme = theme/);
  assert.match(layoutSource, /sorting-zoo-theme/);
  assert.match(layoutSource, /document\.documentElement\.style\.colorScheme/);
  assert.match(layoutSource, /querySelector\("main"\)/);
  assert.match(layoutSource, /shell\.dataset\.theme/);
});
