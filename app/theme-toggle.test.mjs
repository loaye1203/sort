import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(new URL("./sorting-zoo.tsx", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("./page.module.css", import.meta.url), "utf8");

test("sorting page exposes a dark and light theme toggle", () => {
  assert.match(pageSource, /data-theme=\{theme\}/, "shell should expose current theme as data-theme");
  assert.match(pageSource, /themeToggle/, "page should render a dedicated theme toggle control");
  assert.match(pageSource, /setTheme/, "page should update theme state");
  assert.match(cssSource, /\.shell\[data-theme="light"\]/, "CSS should define a light theme");
});
