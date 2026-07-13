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
  const localRequire = (id) => (Object.hasOwn(dependencies, id) ? dependencies[id] : require(id));

  new Function("require", "module", "exports", output)(localRequire, moduleRecord, moduleRecord.exports);
  return moduleRecord.exports;
}

const engine = loadTypeScriptModule(new URL("./engine.ts", import.meta.url), { "./types": {} });

function stats(overrides = {}) {
  return {
    steps: 0,
    comparisons: 0,
    swaps: 0,
    writes: 0,
    startedAt: null,
    elapsedMs: 0,
    ...overrides,
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

test("only the latest asynchronous algorithm load may update current state", async () => {
  const guard = engine.createLatestRequestGuard();
  const oldLoad = deferred();
  const newLoad = deferred();
  const state = { algorithm: null, loading: false, error: null };

  const load = async (request) => {
    const token = guard.begin();
    state.algorithm = null;
    state.loading = true;
    state.error = null;

    try {
      const algorithm = await request;
      if (guard.isCurrent(token)) {
        state.algorithm = algorithm;
        state.loading = false;
      }
    } catch (error) {
      if (guard.isCurrent(token)) {
        state.error = error.message;
        state.loading = false;
      }
    }
  };

  const oldPending = load(oldLoad.promise);
  state.algorithm = { id: "old-visible" };
  state.error = "old-error";
  const newPending = load(newLoad.promise);

  assert.deepEqual(state, { algorithm: null, loading: true, error: null });

  newLoad.resolve({ id: "new" });
  await newPending;
  oldLoad.reject(new Error("stale failure"));
  await oldPending;

  assert.deepEqual(state, { algorithm: { id: "new" }, loading: false, error: null });
});

test("paused wall-clock time is excluded from elapsed time and runtime limits", () => {
  const safety = { maxSteps: 100, maxRuntimeMs: 1_000, maxArraySize: 20 };
  const running = engine.resumeTiming(stats(), 100);
  const paused = engine.pauseTiming(running, 500);
  const resumed = engine.resumeTiming(paused, 10_500);

  assert.equal(paused.elapsedMs, 400);
  assert.equal(paused.startedAt, null);
  assert.equal(engine.getActiveElapsedMs(resumed, 11_000), 900);
  assert.equal(engine.shouldAbort(resumed, safety, 11_000), null);
  assert.match(engine.shouldAbort(resumed, safety, 11_100), /运行上限/);
});

test("aborted events do not count as executed algorithm steps", () => {
  const state = {
    ...engine.createInitialState([3, 2, 1]),
    status: "running",
    stats: engine.resumeTiming(stats(), 100),
  };
  const afterCompare = engine.applySortStep(state, { type: "compare", indices: [0, 1] });
  const algorithmAbort = engine.applySortStep(afterCompare, { type: "aborted", reason: "手动中断" });
  const timeoutAbort = engine.applySortStep(afterCompare, { type: "aborted", reason: "运行超时" });
  const safetyAbort = engine.applySortStep(afterCompare, { type: "aborted", reason: "安全限制" });

  assert.equal(afterCompare.stats.steps, 1);
  assert.equal(algorithmAbort.stats.steps, 1);
  assert.equal(timeoutAbort.stats.steps, 1);
  assert.equal(safetyAbort.stats.steps, 1);
  assert.equal(algorithmAbort.status, "aborted");
});
