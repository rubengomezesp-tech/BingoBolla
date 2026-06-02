import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, Script } from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/server/world-notifications.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    esModuleInterop: true,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
});

const module = { exports: {} };
const sandbox = {
  exports: module.exports,
  module,
};

new Script(outputText, { filename: "world-notifications.ts" }).runInContext(createContext(sandbox));

const { buildWorldNotifications, rouletteSecondsLeftFromLatestSpin } = module.exports;
const now = new Date("2026-06-02T12:00:00.000Z");

function findNotice(notices, id) {
  const notice = notices.find((entry) => entry.id === id);
  assert.ok(notice, `Expected ${id} notice`);
  return notice;
}

{
  const notices = buildWorldNotifications({ now });
  assert.equal(findNotice(notices, "daily").badge, "");
  assert.equal(findNotice(notices, "daily").timer, "Ver estado");
  assert.equal(findNotice(notices, "spin").badge, "");
  assert.equal(findNotice(notices, "spin").timer, "Ver estado");
}

{
  const notices = buildWorldNotifications({
    activeGameLabel: "Neural Cascade",
    activeNode: {
      node_id: "node-5",
      node_index: 5,
      max_stars: 3,
      reward_gold: 100,
      reward_xp: 200,
    },
    bollaMaster: {
      dailySpinLimit: 5,
      dailySpins: 2,
      energy: 3,
      maxEnergy: 5,
      progressPct: 40,
      tickets: 12,
    },
    daily: { available: true, secondsLeft: 0 },
    jackpotGold: 2_000_000,
    now,
    roulette: { secondsLeft: 0 },
  });

  assert.equal(JSON.stringify(notices.slice(0, 3).map((notice) => notice.id)), JSON.stringify(["mission", "daily", "bolla-master"]));
  assert.equal(findNotice(notices, "mission").action.nodeId, "node-5");
  assert.equal(findNotice(notices, "daily").badge, "1");
  assert.equal(findNotice(notices, "bolla-master").badge, "3");
  assert.equal(findNotice(notices, "spin").badge, "1");
  assert.equal(findNotice(notices, "vip").badge, "!");
}

{
  const notices = buildWorldNotifications({
    bollaMaster: {
      dailySpinLimit: 150,
      dailySpins: 5,
      energy: 5,
      maxEnergy: 5,
      progressPct: 12,
      tickets: 20,
    },
    now,
  });
  const bolla = findNotice(notices, "bolla-master");
  assert.equal(bolla.badge, "5");
  assert.match(bolla.detail, /Quedan 25 del plan diario/);
  assert.doesNotMatch(bolla.detail, /145/);
}

{
  const latestSpin = new Date(now.getTime() - 2 * 3600 * 1000).toISOString();
  assert.equal(rouletteSecondsLeftFromLatestSpin(latestSpin, now), 6 * 3600);
}

console.log("world notifications smoke ok");
