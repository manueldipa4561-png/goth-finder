import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { tally, winner, chemistry, cleanName, ZERO_HEX_CHEMISTRY } from "../quiz/score.js";

const data = JSON.parse(readFileSync(new URL("../quiz/data.json", import.meta.url), "utf8"));
const ids = data.archetypes.map((a) => a.id);
const indexesOf = (id) => data.cards.map((c, i) => (c.by === id ? i : -1)).filter((i) => i >= 0);

test("most right-swipes wins", () => {
  const counts = tally(data.cards, [...indexesOf("critic"), ...indexesOf("moth").slice(0, 1)]);
  assert.equal(winner(data.archetypes, counts).id, "critic");
});

test("a tie goes to the archetype listed first", () => {
  const counts = tally(data.cards, [...indexesOf("moth").slice(0, 1), ...indexesOf("tarot").slice(0, 1)]);
  assert.equal(winner(data.archetypes, counts).id, "tarot");
  assert.equal(winner(data.archetypes, {}).id, ids[0]);
});

test("chemistry stays between 88 and 99, and zero hexes is its own joke", () => {
  const counts = tally(data.cards, indexesOf("mommy"));
  const value = chemistry(counts, "mommy");
  assert.ok(value >= 88 && value <= 99);
  assert.equal(chemistry({}, "mommy"), ZERO_HEX_CHEMISTRY);
});

test("names are cleaned and capped", () => {
  assert.equal(cleanName("  Sam<script>  "), "Samscript");
  assert.equal(cleanName("A".repeat(50)).length, 20);
  assert.equal(cleanName(null), "");
});

test("every card belongs to a real archetype, and each archetype has two cards", () => {
  assert.ok(data.cards.every((c) => ids.includes(c.by)));
  assert.ok(ids.every((id) => indexesOf(id).length === 2));
});

test("every archetype is an adult with a photo, name and tags", () => {
  assert.ok(data.archetypes.every((a) => a.age >= 21 && a.name && a.img && a.tags.length === 3 && a.bio));
});
