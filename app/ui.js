import {
  SUBGENRES, ROLES, REPORT_REASONS, MIN_AGE, MAX_AGE, initialState, validateProfile, buildDeck, admirersFor,
  applySwipe, addMessage, blockProfile, reportProfile, setProfile, acceptGate,
} from "./logic.js";
import { ALL_PROFILES, DEMO_REPLIES, PROMPTS } from "./seed.js";

const STORAGE_KEY = "hexed.v1";
const SWIPE_THRESHOLD = 100;
const DEMO_REPLY_DELAY_MS = 1100;
const TOAST_MS = 3500;
const MAX_PHOTO_PX = 480;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const MAX_CHIPS = 4;
const FLY_MS = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 220;
const SVG_NS = "http://www.w3.org/2000/svg";
const SIGIL_PATHS = [
  "M70 18A40 40 0 1 0 70 82A34 34 0 0 1 70 18zM80 22l2 6 6 2-6 2-2 6-2-6-6-2 6-2z",
  "M6 50C22 24 78 24 94 50 78 76 22 76 6 50zM50 36a14 14 0 1 0 .01 0z",
  "M50 6l6 38 38 6-38 6-6 38-6-38-38-6 38-6z",
];

const $ = (selector) => document.querySelector(selector);
const byId = (id) => ALL_PROFILES.find((p) => p.id === id);
const pendingReplies = new Set();
let state = loadState();
let view = { tab: "discover", chat: null };
let draftMessage = "";
let swiping = false;
let toastTimer = null;

// ---------- state ----------

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    return parsed && parsed.version === 1 ? { ...initialState(), ...parsed } : initialState();
  } catch (error) {
    console.error("Could not read saved state, starting fresh:", error);
    return initialState();
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Could not save state:", error);
    toast("Couldn't save on this device. Your changes last until you close the page.");
  }
}

function commit(next) {
  state = next;
  save();
  render();
}

function go(tab, chat = null) {
  view = { tab, chat };
  render();
  $("#screen").focus();
}

// ---------- tiny DOM helpers (text is always set as text, never as HTML) ----------

function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === false || value == null) continue;
    if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? "" : value);
  }
  el.append(...children.flat().filter((c) => c != null && c !== false));
  return el;
}

function sigil(index) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("class", "sigil");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", SIGIL_PATHS[index % SIGIL_PATHS.length]);
  path.setAttribute("fill", "currentColor");
  path.setAttribute("fill-rule", "evenodd");
  svg.append(path);
  return svg;
}

function art(profile) {
  const hue = ((profile.sigil ?? 0) * 36 + 270) % 360;
  const picture = profile.photo
    ? h("img", { src: profile.photo, alt: `Photo of ${profile.name}` })
    : sigil(profile.sigil ?? 0);
  return h("div", { class: "art", style: `--hue:${hue}` }, picture);
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.textContent = ""; }, TOAST_MS);
}

function openSheet(...content) {
  const dialog = $("#sheet");
  dialog.replaceChildren(...content);
  if (!dialog.open) dialog.showModal();
}
const closeSheet = () => { if ($("#sheet").open) $("#sheet").close(); };

// ---------- render ----------

function render() {
  const focusedId = document.activeElement?.id;
  $("#screen").replaceChildren(currentScreen());
  const ready = state.gate.adult && state.me && view.tab !== "edit";
  $("#tabs").hidden = !ready;
  $("#tabs").replaceChildren(...(ready ? tabButtons() : []));
  if (focusedId) document.getElementById(focusedId)?.focus();
}

function currentScreen() {
  if (!state.gate.adult) return gateScreen();
  if (!state.me || view.tab === "edit") return setupScreen();
  if (view.chat) return chatScreen(view.chat);
  const screens = { discover: discoverScreen, admirers: admirersScreen, matches: matchesScreen, me: meScreen };
  return (screens[view.tab] ?? discoverScreen)();
}

function tabButtons() {
  const admirerCount = admirersFor(state, ALL_PROFILES).length;
  const tabs = [
    ["discover", "Discover"],
    ...(state.me.role === "goth_girl" ? [["admirers", admirerCount ? `Admirers (${admirerCount})` : "Admirers"]] : []),
    ["matches", "Matches"],
    ["me", "Me"],
  ];
  return tabs.map(([id, label]) => h("button", {
    type: "button", class: "tab", "aria-current": view.tab === id && !view.chat ? "page" : false,
    onclick: () => go(id),
  }, label));
}

// ---------- gate and profile setup ----------

function gateScreen() {
  return h("form", { class: "stack-y", onsubmit: (e) => { e.preventDefault(); commit(acceptGate(state)); } },
    h("h1", {}, "Before you swipe"),
    h("p", { class: "lead" }, "Hexed is for goth girls and the people who want to meet them."),
    h("label", { class: "check" }, h("input", { type: "checkbox", name: "adult", required: true }), h("span", {}, "I'm 18 or older.")),
    h("label", { class: "check" }, h("input", { type: "checkbox", name: "rules", required: true }),
      h("span", {}, "I'll be respectful: no harassment, no mocking how anyone looks, no sharing profiles outside Hexed.")),
    h("p", { class: "fine" }, "This is a demo. Profiles are fictional and everything you enter stays on this device."),
    h("button", { class: "btn", type: "submit" }, "Enter"));
}

function field(id, label, control) {
  return h("div", {}, h("label", { for: id }, label), control, h("p", { class: "error", id: `${id}-err`, role: "alert" }));
}

function optionChips(name, type, items, selected, onChange) {
  return h("div", { class: "opts" }, items.map(([value, label]) => h("label", { class: "opt" },
    h("input", { type, name, value, checked: selected.includes(value), required: type === "radio", onchange: onChange }),
    h("span", {}, label))));
}

function limitChips(form) {
  const boxes = [...form.querySelectorAll('input[name="subgenres"]')];
  const full = boxes.filter((b) => b.checked).length >= MAX_CHIPS;
  boxes.forEach((b) => { b.disabled = full && !b.checked; });
}

async function readPhoto(file) {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > MAX_PHOTO_BYTES) throw new Error("That image is over 8 MB.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_PHOTO_PX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
}

function showErrors(form, errors) {
  form.querySelectorAll(".error").forEach((el) => { el.textContent = ""; });
  Object.entries(errors).forEach(([name, message]) => { form.querySelector(`#${name}-err`).textContent = message; });
  form.querySelector(`[name="${Object.keys(errors)[0]}"]`)?.focus();
}

function setupScreen() {
  const mine = state.me;
  let photo = mine?.photo ?? null;
  const form = h("form", { class: "stack-y", novalidate: true });
  const photoInput = h("input", { id: "photo", name: "photo", type: "file", accept: "image/*", onchange: async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      photo = await readPhoto(file);
      form.querySelector("#photo-err").textContent = "Photo added.";
    } catch (error) {
      photo = null;
      form.querySelector("#photo-err").textContent = error.message;
    }
  } });
  form.append(
    h("h1", {}, mine ? "Edit your profile" : "Make your profile"),
    field("name", "Name", h("input", { id: "name", name: "name", type: "text", maxlength: 30, value: mine?.name ?? "", autocomplete: "given-name" })),
    field("age", `Age (${MIN_AGE}+)`, h("input", { id: "age", name: "age", type: "number", min: MIN_AGE, max: MAX_AGE, inputmode: "numeric", value: mine?.age ?? "" })),
    field("city", "City", h("input", { id: "city", name: "city", type: "text", maxlength: 40, value: mine?.city ?? "", autocomplete: "address-level2" })),
    h("fieldset", {}, h("legend", {}, "I'm here as"),
      optionChips("role", "radio", Object.entries(ROLES), [mine?.role], () => showRoleHint(form)),
      h("p", { class: "error", id: "role-err", role: "alert" })),
    h("fieldset", {}, h("legend", {}, `Your scene (up to ${MAX_CHIPS})`),
      optionChips("subgenres", "checkbox", SUBGENRES.map((s) => [s, s]), mine?.subgenres ?? [], () => limitChips(form)),
      h("p", { class: "error", id: "subgenres-err", role: "alert" })),
    field("obsession", "Current obsession (optional)", h("input", { id: "obsession", name: "obsession", type: "text", maxlength: 80, value: mine?.obsession ?? "" })),
    field("promptQ", "Pick a prompt", h("select", { id: "promptQ", name: "promptQ" }, PROMPTS.map((q) => h("option", { value: q, selected: q === mine?.promptQ }, q)))),
    field("promptA", "Your answer (optional)", h("textarea", { id: "promptA", name: "promptA", maxlength: 200 }, mine?.promptA ?? "")),
    field("photo", "Photo (optional, stays on this device in the demo)", photoInput),
    h("p", { class: "fine", id: "role-hint" }),
    h("button", { class: "btn", type: "submit" }, "Save and start swiping"),
    mine && h("button", { class: "btn ghost", type: "button", onclick: () => go("me") }, "Cancel"));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const result = validateProfile({
      name: data.get("name"), age: data.get("age"), city: data.get("city"), role: data.get("role"),
      subgenres: data.getAll("subgenres"), obsession: data.get("obsession"),
      promptQ: data.get("promptQ"), promptA: data.get("promptA"), photo,
    });
    if (!result.ok) return showErrors(form, result.errors);
    view = { tab: "discover", chat: null };
    commit(setProfile(state, result.profile));
  });
  queueMicrotask(() => { limitChips(form); showRoleHint(form); });
  return form;
}

function showRoleHint(form) {
  const role = new FormData(form).get("role");
  const hints = {
    goth_girl: "You decide first: people who hex you wait in your Admirers tab until you answer.",
    admirer: "You only see goth girls. A match happens when she hexes you back.",
  };
  form.querySelector("#role-hint").textContent = hints[role] ?? "";
}

// ---------- profile cards ----------

function profileCard(p, extraClass = "") {
  return h("article", { class: `card ${extraClass}`.trim(), "aria-label": `${p.name}, ${p.age}, ${p.city}` },
    art(p),
    p.demo && h("span", { class: "demo-tag" }, "DEMO"),
    h("div", { class: "info" },
      h("h2", {}, `${p.name}, ${p.age}`),
      h("p", { class: "city" }, p.city),
      p.subgenres?.length > 0 && h("ul", { class: "chips" }, p.subgenres.map((s) => h("li", {}, s))),
      p.obsession && h("p", { class: "obsession" }, p.obsession),
      p.promptA && h("div", { class: "prompt" }, h("small", {}, p.promptQ), h("p", {}, p.promptA))));
}

function enableDrag(card, onDecision) {
  const hex = card.querySelector(".stamp.hex");
  const pass = card.querySelector(".stamp.pass");
  let startX = null;
  const reset = () => { card.style.transform = ""; hex.style.opacity = 0; pass.style.opacity = 0; };
  card.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    startX = e.clientX;
    card.setPointerCapture(e.pointerId);
    card.classList.add("dragging");
  });
  card.addEventListener("pointermove", (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    card.style.transform = `translateX(${dx}px) rotate(${dx / 20}deg)`;
    hex.style.opacity = Math.max(0, Math.min(1, dx / SWIPE_THRESHOLD));
    pass.style.opacity = Math.max(0, Math.min(1, -dx / SWIPE_THRESHOLD));
  });
  card.addEventListener("pointerup", (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    card.classList.remove("dragging");
    if (Math.abs(dx) >= SWIPE_THRESHOLD) { card.style.transform = ""; onDecision(dx > 0 ? "hex" : "pass"); } else reset();
  });
  card.addEventListener("pointercancel", () => { startX = null; card.classList.remove("dragging"); reset(); });
}

// ---------- discover ----------

function swipe(profile, choice, options = {}) {
  if (swiping) return;
  swiping = true;
  const finish = () => {
    const { state: next, matched } = applySwipe(state, profile, choice, Date.now(), options);
    swiping = false;
    commit(next);
    if (matched) showMatch(profile);
  };
  const card = document.querySelector(".card.top");
  if (card && FLY_MS) {
    card.classList.add(choice === "hex" ? "fly-hex" : "fly-pass");
    setTimeout(finish, FLY_MS);
  } else finish();
}

function discoverScreen() {
  const [top, next] = buildDeck(state, ALL_PROFILES);
  if (!top) {
    return h("section", { class: "empty" }, h("h1", {}, "That's everyone"),
      h("p", { class: "lead" }, "You've seen every demo profile. Reset the demo in Me to swipe again."),
      h("button", { class: "btn", type: "button", onclick: () => go("me") }, "Open Me"));
  }
  const card = profileCard(top, "top");
  card.prepend(h("span", { class: "stamp hex" }, "HEX"), h("span", { class: "stamp pass" }, "LET GO"),
    h("button", { type: "button", class: "more-btn", "aria-label": `Report or block ${top.name}`, onclick: () => openReportSheet(top.id) }, "⋯"));
  enableDrag(card, (choice) => swipe(top, choice));
  return h("section", {},
    h("div", { class: "deck" }, next && h("div", { class: "behind" }, profileCard(next)), card),
    h("div", { class: "actions" },
      h("button", { class: "btn ghost", type: "button", onclick: () => swipe(top, "pass") }, "Let go"),
      h("button", { class: "btn", type: "button", onclick: () => swipe(top, "hex") }, "Hex")),
    h("p", { class: "fine", style: "text-align:center;margin-top:10px" }, "Drag the card, or use the ← and → keys."));
}

function showMatch(profile) {
  openSheet(h("h2", {}, "It's a match"), h("p", {}, `${profile.name} hexed you back.`),
    h("p", { class: "fine" }, "Demo: she's fictional and her replies are scripted."),
    h("div", { class: "btn-row" },
      h("button", { class: "btn", type: "button", onclick: () => { closeSheet(); go("matches", profile.id); } }, "Say hi"),
      h("button", { class: "btn ghost", type: "button", onclick: closeSheet }, "Keep swiping")));
}

// ---------- admirers (goth girls only) ----------

function admirersScreen() {
  const queue = admirersFor(state, ALL_PROFILES);
  if (queue.length === 0) {
    return h("section", { class: "empty" }, h("h1", {}, "No admirers waiting"),
      h("p", { class: "lead" }, "People who hex you appear here. Nobody can message you until you hex them back."));
  }
  return h("section", {}, h("h1", {}, "Admirers"),
    h("p", { class: "lead" }, "You decide first. They can't message you unless you hex back."),
    h("ul", { class: "list" }, queue.map((p) => h("li", { class: "admirer" }, profileCard(p, "static"),
      h("div", { class: "actions" },
        h("button", { class: "btn ghost small", type: "button", onclick: () => swipe(p, "pass") }, "Let go"),
        h("button", { class: "btn small", type: "button", onclick: () => swipe(p, "hex", { alreadyLikedMe: true }) }, "Hex back"),
        h("button", { class: "btn ghost small", type: "button", "aria-label": `Report or block ${p.name}`, onclick: () => openReportSheet(p.id) }, "⋯"))))));
}

// ---------- matches and chat ----------

function matchesScreen() {
  const rows = state.matches.map((m) => byId(m.id)).filter(Boolean);
  if (rows.length === 0) {
    return h("section", { class: "empty" }, h("h1", {}, "No matches yet"), h("p", { class: "lead" }, "Hex someone and hope she hexes back."));
  }
  return h("section", {}, h("h1", {}, "Matches"), h("ul", { class: "list" }, rows.map((p) => {
    const last = (state.messages[p.id] ?? []).at(-1);
    return h("li", {}, h("button", { type: "button", class: "row", onclick: () => go("matches", p.id) },
      art(p), h("span", {}, h("strong", {}, p.name), h("small", {}, last ? last.text : "Say hi"))));
  })));
}

function scheduleDemoReply(id) {
  if (pendingReplies.has(id)) return;
  pendingReplies.add(id);
  setTimeout(() => {
    pendingReplies.delete(id);
    const count = (state.messages[id] ?? []).length;
    commit(addMessage(state, id, "them", DEMO_REPLIES[count % DEMO_REPLIES.length], Date.now()));
  }, DEMO_REPLY_DELAY_MS);
}

function chatScreen(id) {
  const p = byId(id);
  const thread = state.messages[id] ?? [];
  if (thread.length === 0) scheduleDemoReply(id);
  const send = (e) => {
    e.preventDefault();
    const text = draftMessage;
    draftMessage = "";
    commit(addMessage(state, id, "me", text, Date.now()));
    scheduleDemoReply(id);
  };
  queueMicrotask(() => $(".thread")?.lastElementChild?.scrollIntoView({ block: "end" }));
  return h("section", {},
    h("div", { class: "chat-head" },
      h("button", { class: "btn ghost small", type: "button", onclick: () => go("matches") }, "Back"),
      h("h2", {}, p.name),
      h("button", { class: "btn ghost small", type: "button", "aria-label": `Report or block ${p.name}`, onclick: () => openReportSheet(id) }, "⋯")),
    h("p", { class: "fine" }, "Demo chat: replies are scripted."),
    h("div", { class: "thread", role: "log", "aria-live": "polite" },
      thread.map((m) => h("div", { class: `msg ${m.from}` }, m.text))),
    h("form", { class: "compose", onsubmit: send },
      h("input", { id: "msg", type: "text", maxlength: 500, "aria-label": "Message", placeholder: "Write a message", value: draftMessage,
        oninput: (e) => { draftMessage = e.target.value; } }),
      h("button", { class: "btn", type: "submit" }, "Send")));
}

// ---------- report, block, me ----------

function openReportSheet(id) {
  const p = byId(id);
  const reason = h("select", { id: "reason", "aria-label": "Reason" }, REPORT_REASONS.map((r) => h("option", { value: r }, r)));
  // Leave the chat first so the redraw inside commit() doesn't show a thread with someone we just blocked.
  const apply = (next, message) => {
    if (view.chat === id) view = { tab: "matches", chat: null };
    closeSheet();
    commit(next);
    toast(message);
  };
  openSheet(h("h2", {}, `Report or block ${p.name}`), h("p", { class: "fine" }, "Blocked people disappear from your deck and chats."), reason,
    h("div", { class: "btn-row" },
      h("button", { class: "btn danger", type: "button", onclick: () => apply(reportProfile(state, id, reason.value, Date.now()), "Reported and blocked. In this demo, reports stay on this device.") }, "Report and block"),
      h("button", { class: "btn ghost", type: "button", onclick: () => apply(blockProfile(state, id), "Blocked.") }, "Just block"),
      h("button", { class: "btn ghost", type: "button", onclick: closeSheet }, "Cancel")));
}

function meScreen() {
  const resetDemo = () => commit({ ...state, swipes: {}, matches: [], messages: {}, blocked: [], reports: [] });
  const wipe = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch (error) { console.error("Could not clear storage:", error); }
    state = initialState();
    view = { tab: "discover", chat: null };
    closeSheet();
    render();
  };
  const confirmDelete = () => openSheet(h("h2", {}, "Delete everything?"),
    h("p", {}, "This removes your profile, swipes, matches and messages from this device. It can't be undone."),
    h("div", { class: "btn-row" },
      h("button", { class: "btn danger", type: "button", onclick: wipe }, "Delete everything"),
      h("button", { class: "btn ghost", type: "button", onclick: closeSheet }, "Cancel")));
  return h("section", { class: "stack-y" }, h("h1", {}, "Me"), profileCard(state.me, "static"),
    h("button", { class: "btn", type: "button", onclick: () => go("edit") }, "Edit profile"),
    h("button", { class: "btn ghost", type: "button", onclick: resetDemo }, "Reset demo swipes"),
    h("button", { class: "btn ghost", type: "button", onclick: confirmDelete }, "Delete all my data"),
    h("p", { class: "fine" }, "Demo mode: your profile, swipes and messages are saved only in this browser. Nothing is sent anywhere. Verification and real members come later."));
}

// ---------- keyboard ----------

document.addEventListener("keydown", (e) => {
  if (view.tab !== "discover" || view.chat || $("#sheet").open) return;
  if (e.target.closest("input, textarea, select, button")) return;
  const top = buildDeck(state, ALL_PROFILES)[0];
  if (!top || !state.me) return;
  if (e.key === "ArrowRight") swipe(top, "hex");
  if (e.key === "ArrowLeft") swipe(top, "pass");
});

render();
