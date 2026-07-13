import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const modulePaths = [
  "./algorithms/full.ts",
  "./algorithms/simplified.ts",
  "./algorithms/simulated.ts",
];

test("implementation levels use independent modules", () => {
  for (const path of modulePaths) {
    const url = new URL(path, import.meta.url);
    assert.ok(existsSync(url), `${path} must exist`);
    const source = readFileSync(url, "utf8");
    assert.match(source, /export const algorithms/);
    assert.doesNotMatch(source, /from "\.\.\/registry"/);
  }
});

test("registry has one explicit dynamic import per runnable implementation level", () => {
  const registrySource = readFileSync(new URL("./registry.ts", import.meta.url), "utf8");
  assert.match(registrySource, /import\("\.\/algorithms\/full"\)/);
  assert.match(registrySource, /import\("\.\/algorithms\/simplified"\)/);
  assert.match(registrySource, /import\("\.\/algorithms\/simulated"\)/);
  assert.doesNotMatch(registrySource, /import\("\.\/algorithms"\)/);
});

test("all runnable implementations resolve with the expected export contract", () => {
  const loaded = new Map();

  for (const path of modulePaths) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const moduleRecord = { exports: {} };
    new Function("require", "module", "exports", output)(
      (id) => id === "../types" ? {} : require(id),
      moduleRecord,
      moduleRecord.exports,
    );

    for (const [id, implementation] of Object.entries(moduleRecord.exports.algorithms)) {
      assert.equal(loaded.has(id), false, `${id} must belong to exactly one module`);
      assert.equal(typeof implementation.code, "string", `${id} code must resolve`);
      assert.equal(typeof implementation.generateSteps, "function", `${id} generator must resolve`);
      loaded.set(id, implementation);
    }
  }

  assert.equal(loaded.size, 123, "every non-catalog algorithm must resolve exactly once");
});
