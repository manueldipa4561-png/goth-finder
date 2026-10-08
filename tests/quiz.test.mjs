import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { winner } from "../quiz/score.js";

const data = JSON.parse(readFileSync(new URL("../quiz/data.json", import.meta.url), "utf8"));
const ids = data.archetypes.map((a) => a.id);

test("highest tally wins", () => {
  assert.equal(winner(data.archetypes, { critic: 2, mommy: 1 }).id, "critic");
});

test("a tie goes to the archetype listed first", () => {
  assert.equal(winner(data.archetypes, { moth: 2, tarot: 2 }).id, "tarot");
  assert.equal(winner(data.archetypes, {}).id, ids[0]);
});

test("every answer points at a real archetype", () => {
  const targets = data.questions.flatMap((q) => q.a.map(([, id]) => id));
  assert.ok(targets.every((id) => ids.includes(id)), "unknown archetype id in an answer");
});

test("every archetype can be reached", () => {
  const targets = new Set(data.questions.flatMap((q) => q.a.map(([, id]) => id)));
  assert.deepEqual(ids.filter((id) => !targets.has(id)), []);
});

test("every question offers four answers", () => {
  assert.ok(data.questions.every((q) => q.a.length === 4));
});
