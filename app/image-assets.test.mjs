import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appDirectory = fileURLToPath(new URL(".", import.meta.url));
const webDirectory = fileURLToPath(new URL("..", import.meta.url));

function readPngSize(path) {
  const bytes = readFileSync(path);
  assert.equal(bytes.subarray(1, 4).toString("ascii"), "PNG", `${path} must be a PNG`);
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

test("brand and metadata images use purpose-sized assets", () => {
  assert.deepEqual(readPngSize(`${webDirectory}/public/brand-icon-transparent.png`), { width: 60, height: 60 });
  assert.deepEqual(readPngSize(`${appDirectory}/icon.png`), { width: 512, height: 512 });
  assert.deepEqual(readPngSize(`${appDirectory}/apple-icon.png`), { width: 180, height: 180 });
  assert.ok(statSync(`${appDirectory}/favicon.ico`).size > 0, "favicon.ico must not be empty");
});

test("obsolete duplicate icon and metadata references are removed", () => {
  assert.throws(() => statSync(`${webDirectory}/public/brand-icon-white.png`), { code: "ENOENT" });
  const layoutSource = readFileSync(`${appDirectory}/layout.tsx`, "utf8");
  assert.doesNotMatch(layoutSource, /brand-icon-white\.png/);
  assert.doesNotMatch(layoutSource, /icons\s*:/);
});
