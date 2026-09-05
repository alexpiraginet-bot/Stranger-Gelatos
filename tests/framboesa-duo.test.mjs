import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { Assets } from "../js/assets.js";
import { FLAVORS } from "../ninja/js/config.js";

const repoRoot = path.resolve();
const legacyMark = ["fra", "nui"].join("");
const textExtensions = new Set([".css", ".html", ".js", ".json", ".md", ".mjs", ".svg", ".txt"]);

function fold(value) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

async function walk(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  const entries = await readdir(absolutePath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = path.join(relativePath, entry.name);
    if (entry.isDirectory()) files.push(...await walk(child));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}

test("the infinite cycle exposes Framboesa Duo with the existing raspberry palette", () => {
  const flavor = FLAVORS.find(({ id }) => id === "framboesa-duo");
  assert.ok(flavor, "missing Framboesa Duo cycle flavor");
  assert.equal(flavor.name, "FRAMBOESA DUO");
  assert.deepEqual(
    [flavor.bg0, flavor.bg1, flavor.fog, flavor.body0, flavor.body1, flavor.edge, flavor.core, flavor.accent, flavor.accent2],
    ["#12060f", "#2c0d2a", "#7a1f63", "#ffd7ef", "#c2469a", "#ffeaf7", "#fff2fb", "#ff5fc8", "#a06bff"],
  );
});

test("the platform game loads the renamed Framboesa Duo reward sprite", async () => {
  const sources = [];
  globalThis.Image = class FakeImage {
    set src(value) {
      sources.push(value);
      queueMicrotask(() => this.onload?.());
    }
  };

  await Assets.load();

  assert.ok(Assets.images.pic_framboesa_duo);
  assert.ok(sources.includes("sprites/pic_framboesa_duo.png"));
});

test("public sources and paths contain no legacy mark", async () => {
  const files = [
    "README.md",
    "sw.js",
    ...await walk("js"),
    ...await walk("ninja"),
    ...await walk("sprites"),
  ];

  for (const relativePath of files) {
    assert.ok(
      !fold(relativePath).includes(legacyMark),
      `legacy mark remains in path: ${relativePath}`,
    );
    if (!textExtensions.has(path.extname(relativePath).toLowerCase())) continue;
    const source = await readFile(path.join(repoRoot, relativePath), "utf8");
    assert.ok(
      !fold(source).includes(legacyMark),
      `legacy mark remains in public content: ${relativePath}`,
    );
  }

  const gameSource = await readFile(path.join(repoRoot, "js/game.js"), "utf8");
  assert.match(gameSource, /pic_framboesa_duo/);
  assert.match(gameSource, /name:\s*['"]Framboesa Duo['"]/);
});
