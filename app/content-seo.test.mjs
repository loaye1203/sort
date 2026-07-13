import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const layoutSource = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");
const pageSource = readFileSync(new URL("./sorting-zoo.tsx", import.meta.url), "utf8");
const infoSource = readFileSync(new URL("./components/algorithm-info.tsx", import.meta.url), "utf8");
const codePanelSource = readFileSync(new URL("./components/algorithm-code-panel.tsx", import.meta.url), "utf8");
const sidebarSource = readFileSync(new URL("./components/algorithm-sidebar.tsx", import.meta.url), "utf8");
const controlsSource = readFileSync(new URL("./components/sorting-controls.tsx", import.meta.url), "utf8");
const runnerSource = readFileSync(new URL("./hooks/use-sorting-runner.ts", import.meta.url), "utf8");
const registrySource = readFileSync(new URL("../lib/sorting/registry.ts", import.meta.url), "utf8");

test("homepage metadata uses the confirmed production origin", () => {
  assert.match(layoutSource, /metadataBase:\s*new URL\("https:\/\/sort\.loayes\.com"\)/);
  assert.match(layoutSource, /title:\s*"Sorting Zoo[^\"]*"/);
  assert.match(layoutSource, /description:\s*"[^\"]+"/);
  assert.match(layoutSource, /canonical:\s*"\/"/);
  assert.doesNotMatch(layoutSource, /localhost|127\.0\.0\.1|example\.com/);
});

test("Open Graph and Twitter metadata use the existing public icon", () => {
  assert.match(layoutSource, /openGraph:\s*\{/);
  assert.match(layoutSource, /url:\s*"\/"/);
  assert.match(layoutSource, /images:\s*\[\{\s*url:\s*"\/icon\.png"/s);
  assert.match(layoutSource, /twitter:\s*\{/);
  assert.match(layoutSource, /card:\s*"summary"/);
  assert.match(layoutSource, /images:\s*\["\/icon\.png"\]/);
});

test("robots and sitemap routes use only the production origin", () => {
  const robotsUrl = new URL("./robots.ts", import.meta.url);
  const sitemapUrl = new URL("./sitemap.ts", import.meta.url);
  assert.equal(existsSync(robotsUrl), true, "robots.ts must exist");
  assert.equal(existsSync(sitemapUrl), true, "sitemap.ts must exist");
  const robotsSource = readFileSync(robotsUrl, "utf8");
  const sitemapSource = readFileSync(sitemapUrl, "utf8");
  assert.match(robotsSource, /export const dynamic = "force-static"/);
  assert.match(sitemapSource, /export const dynamic = "force-static"/);
  assert.match(robotsSource, /allow:\s*"\/"/);
  assert.match(robotsSource, /sitemap:\s*"https:\/\/sort\.loayes\.com\/sitemap\.xml"/);
  assert.match(sitemapSource, /url:\s*"https:\/\/sort\.loayes\.com\/"/);
  assert.doesNotMatch(`${robotsSource}\n${sitemapSource}`, /localhost|127\.0\.0\.1|example\.com|\?algorithm=/);
  assert.doesNotMatch(sitemapSource, /algorithms\//);
});

test("implementation levels and run modes use one Chinese vocabulary", () => {
  assert.match(registrySource, /full:\s*"真实实现"/);
  assert.match(registrySource, /simplified:\s*"简化实现"/);
  assert.match(registrySource, /simulated:\s*"模拟实现"/);
  assert.match(registrySource, /"catalog-only":\s*"只读图鉴"/);
  assert.match(infoSource, /real:\s*"标准"/);
  assert.match(infoSource, /limited:\s*"受限"/);
  assert.match(sidebarSource, /\{ value: "real", label: "标准运行" \}/);
  assert.match(sidebarSource, /\{ value: "limited", label: "受限运行" \}/);
  assert.match(sidebarSource, /\{ value: "simulated", label: "模拟运行" \}/);
  assert.match(sidebarSource, /\{ value: "catalog-only", label: "只读图鉴" \}/);
});

test("catalog-only code is explicitly presented as conceptual pseudocode", () => {
  assert.match(codePanelSource, /meta\.implementationLevel === "catalog-only"\s*\?\s*"概念伪代码"/);
  assert.match(controlsSource, /"只读图鉴，不执行"/);
  assert.match(runnerSource, /"只读图鉴，不执行"/);
  assert.doesNotMatch(`${infoSource}\n${sidebarSource}\n${controlsSource}\n${runnerSource}`, /仅图鉴|图鉴伪代码|限流运行|真实运行/);
});

test("all visible runtime states have stable Chinese labels", () => {
  for (const [state, label] of Object.entries({ idle: "待机", running: "运行中", paused: "已暂停", done: "完成", aborted: "已中断" })) {
    assert.match(infoSource, new RegExp(`${state}: "${label}"`));
  }
});

test("the existing algorithm query entry remains intact", () => {
  assert.match(pageSource, /params\.get\("algorithm"\)/);
  assert.match(pageSource, /algorithmRegistryById\.has\(algorithmId\)/);
  assert.match(pageSource, /`\?algorithm=\$\{selectedId\}`/);
});
