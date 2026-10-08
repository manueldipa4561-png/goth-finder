import test from "node:test";
import assert from "node:assert/strict";
import {
  initialState, validateProfile, buildDeck, admirersFor, applySwipe,
  addMessage, blockProfile, reportProfile, setProfile,
} from "../app/logic.js";
import { ALL_PROFILES } from "../app/seed.js";

const deepFreeze = (o) => {
  Object.values(o).forEach((v) => typeof v === "object" && v !== null && deepFreeze(v));
  return Object.freeze(o);
};

const validInput = { name: "Sam", age: 25, city: "Milan", role: "admirer", subgenres: ["Trad goth"], obsession: "", promptQ: "", promptA: "", photo: null };
const meWith = (overrides) => setProfile(initialState(), validateProfile({ ...validInput, ...overrides }).profile);

test("rejects anyone under 18", () => {
  const result = validateProfile({ ...validInput, age: 17 });
  assert.equal(result.ok, false);
  assert.ok(result.errors.age);
});

test("rejects a missing name and an unknown role", () => {
  const result = validateProfile({ ...validInput, name: "  ", role: "robot" });
  assert.deepEqual(Object.keys(result.errors).sort(), ["name", "role"]);
});

test("drops a photo that is not an image data URL", () => {
  const result = validateProfile({ ...validInput, photo: "javascript:alert(1)" });
  assert.equal(result.profile.photo, null);
});

test("deck contains goth girls only, never admirers", () => {
  const deck = buildDeck(meWith({}), ALL_PROFILES);
  assert.ok(deck.length > 0);
  assert.ok(deck.every((p) => p.role === "goth_girl"));
});

test("deck puts the viewer's city first", () => {
  const deck = buildDeck(meWith({ city: "Turin" }), ALL_PROFILES);
  assert.equal(deck[0].city, "Turin");
});

test("deck hides swiped and blocked profiles", () => {
  const base = meWith({});
  const first = buildDeck(base, ALL_PROFILES)[0];
  const swiped = applySwipe(base, first, "pass", 1).state;
  assert.ok(!buildDeck(swiped, ALL_PROFILES).some((p) => p.id === first.id));
  const blocked = blockProfile(base, first.id);
  assert.ok(!buildDeck(blocked, ALL_PROFILES).some((p) => p.id === first.id));
});

test("hex matches only when she hexes back", () => {
  const base = meWith({});
  const yes = ALL_PROFILES.find((p) => p.role === "goth_girl" && p.hexBack);
  const no = ALL_PROFILES.find((p) => p.role === "goth_girl" && !p.hexBack);
  assert.equal(applySwipe(base, yes, "hex", 1).matched, true);
  assert.equal(applySwipe(base, no, "hex", 1).matched, false);
  assert.equal(applySwipe(base, yes, "pass", 1).matched, false);
});

test("a goth girl sees admirers; an admirer sees none", () => {
  assert.ok(admirersFor(meWith({ role: "goth_girl" }), ALL_PROFILES).length > 0);
  assert.equal(admirersFor(meWith({ role: "admirer" }), ALL_PROFILES).length, 0);
});

test("messages need a match and ignore blank text", () => {
  const base = meWith({});
  assert.equal(addMessage(base, "g1", "me", "hi", 1), base);
  const g1 = ALL_PROFILES.find((p) => p.id === "g1");
  const matched = applySwipe(base, g1, "hex", 1).state;
  assert.equal(addMessage(matched, "g1", "me", "   ", 2), matched);
  assert.equal(addMessage(matched, "g1", "me", "hi", 2).messages.g1.length, 1);
});

test("blocking removes the match and its messages; reporting also blocks", () => {
  const g1 = ALL_PROFILES.find((p) => p.id === "g1");
  const matched = addMessage(applySwipe(meWith({}), g1, "hex", 1).state, "g1", "me", "hi", 2);
  const blocked = blockProfile(matched, "g1");
  assert.equal(blocked.matches.length, 0);
  assert.equal(blocked.messages.g1, undefined);
  const reported = reportProfile(matched, "g1", "Harassment or hate", 3);
  assert.ok(reported.blocked.includes("g1"));
  assert.equal(reported.reports[0].reason, "Harassment or hate");
  assert.throws(() => reportProfile(matched, "g1", "nope", 3));
});

test("no function mutates its input state", () => {
  const frozen = deepFreeze(meWith({}));
  const g1 = ALL_PROFILES.find((p) => p.id === "g1");
  const swiped = applySwipe(frozen, g1, "hex", 1).state;
  addMessage(swiped, "g1", "me", "hi", 2);
  blockProfile(swiped, "g1");
  reportProfile(swiped, "g1", "Other", 3);
});
