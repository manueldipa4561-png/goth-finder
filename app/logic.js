// Pure, immutable app logic: every function returns new state and never mutates its input.

export const SUBGENRES = [
  "Trad goth", "Romantic goth", "Whimsigoth", "Pastel goth", "Cyber goth",
  "Deathrock", "Dark academia", "Mall goth", "Nosferatu-core",
];
export const ROLES = { goth_girl: "Goth girl", admirer: "Here to meet goth girls" };
export const REPORT_REASONS = ["Fake or catfish", "Harassment or hate", "Under 18", "Spam or scam", "Other"];

export const MIN_AGE = 18;
export const MAX_AGE = 99;
const MAX_NAME = 30;
const MAX_CITY = 40;
const MAX_OBSESSION = 80;
const MAX_ANSWER = 200;
const MAX_SUBGENRES = 4;
const MAX_MESSAGE = 500;

export const initialState = () => ({
  version: 1,
  gate: { adult: false, rules: false },
  me: null,
  swipes: {},
  matches: [],
  messages: {},
  blocked: [],
  reports: [],
});

const clean = (value) => (typeof value === "string" ? value.trim() : "");

export function validateProfile(input) {
  const errors = {};
  const name = clean(input.name);
  const city = clean(input.city);
  const obsession = clean(input.obsession);
  const promptA = clean(input.promptA);
  const age = Number(input.age);
  const subgenres = Array.isArray(input.subgenres) ? input.subgenres.filter((s) => SUBGENRES.includes(s)) : [];
  const photo = typeof input.photo === "string" && input.photo.startsWith("data:image/") ? input.photo : null;

  if (!name || name.length > MAX_NAME) errors.name = `Enter a name (up to ${MAX_NAME} characters).`;
  if (!Number.isInteger(age) || age < MIN_AGE || age > MAX_AGE) errors.age = `Hexed is ${MIN_AGE}+ only.`;
  if (!city || city.length > MAX_CITY) errors.city = `Enter your city (up to ${MAX_CITY} characters).`;
  if (!Object.hasOwn(ROLES, input.role)) errors.role = "Pick one.";
  if (subgenres.length > MAX_SUBGENRES) errors.subgenres = `Pick up to ${MAX_SUBGENRES}.`;
  if (obsession.length > MAX_OBSESSION) errors.obsession = `Up to ${MAX_OBSESSION} characters.`;
  if (promptA.length > MAX_ANSWER) errors.promptA = `Up to ${MAX_ANSWER} characters.`;

  if (Object.keys(errors).length > 0) return { ok: false, errors, profile: null };
  return {
    ok: true,
    errors,
    profile: {
      id: "me", name, age, city, role: input.role, subgenres, obsession,
      promptQ: clean(input.promptQ), promptA, photo,
    },
  };
}

export const sameCity = (a, b) => clean(a).toLowerCase() === clean(b).toLowerCase();

const isHidden = (state, id) => state.blocked.includes(id) || id in state.swipes;

// The deck only ever contains goth girls. People who are here to meet them never appear in it.
export function buildDeck(state, profiles) {
  const candidates = profiles.filter((p) => p.role === "goth_girl" && p.id !== "me" && !isHidden(state, p.id));
  const mine = state.me ? state.me.city : "";
  const local = candidates.filter((p) => sameCity(p.city, mine));
  const rest = candidates.filter((p) => !sameCity(p.city, mine));
  return [...local, ...rest];
}

// Goth girls decide first: admirers who already hexed her wait in her own queue.
export function admirersFor(state, profiles) {
  if (!state.me || state.me.role !== "goth_girl") return [];
  return profiles.filter((p) => p.role === "admirer" && p.likedYou && !isHidden(state, p.id));
}

export function applySwipe(state, profile, choice, now, { alreadyLikedMe = false } = {}) {
  if (choice !== "hex" && choice !== "pass") throw new Error(`Unknown swipe: ${choice}`);
  if (state.blocked.includes(profile.id) || profile.id in state.swipes) return { state, matched: false };
  const matched = choice === "hex" && (alreadyLikedMe || profile.hexBack === true);
  const next = {
    ...state,
    swipes: { ...state.swipes, [profile.id]: choice },
    matches: matched ? [...state.matches, { id: profile.id, at: now }] : state.matches,
  };
  return { state: next, matched };
}

export function addMessage(state, id, from, text, now) {
  const body = clean(text).slice(0, MAX_MESSAGE);
  const isMatch = state.matches.some((m) => m.id === id);
  if (!body || !isMatch) return state;
  const thread = state.messages[id] ?? [];
  return { ...state, messages: { ...state.messages, [id]: [...thread, { from, text: body, at: now }] } };
}

export function blockProfile(state, id) {
  if (state.blocked.includes(id)) return state;
  const { [id]: _removed, ...messages } = state.messages;
  return {
    ...state,
    blocked: [...state.blocked, id],
    matches: state.matches.filter((m) => m.id !== id),
    messages,
  };
}

// Reporting always blocks too, so the reported person disappears at once.
export function reportProfile(state, id, reason, now) {
  if (!REPORT_REASONS.includes(reason)) throw new Error(`Unknown report reason: ${reason}`);
  const blocked = blockProfile(state, id);
  return { ...blocked, reports: [...blocked.reports, { id, reason, at: now }] };
}

export const setProfile = (state, profile) => ({ ...state, me: profile });
export const acceptGate = (state) => ({ ...state, gate: { adult: true, rules: true } });
