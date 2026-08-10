import assert from "node:assert/strict";
import test from "node:test";
import { loadCodeOssConfig, normalizePagesBase } from "../scripts/code-oss/config.mjs";

test("Code-OSS config pins one immutable upstream commit", async () => {
  const config = await loadCodeOssConfig(process.cwd());
  assert.equal(config.ref, "1.124.2");
  assert.equal(config.commit, "6928394f91b684055b873eecb8bc281365131f1c");
  assert.equal(config.pagesBase, "/cs-note/");
});

test("Pages base is absolute and has one trailing slash", () => {
  assert.equal(normalizePagesBase("/cs-note"), "/cs-note/");
  assert.throws(() => normalizePagesBase("cs-note"), /must start with/);
  assert.throws(() => normalizePagesBase("/"), /project subpath/);
});
