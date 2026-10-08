// Swipe quiz: swipe doll profiles, hex the ones you relate to, and the most-hexed one is your match.
import { tally, winner, chemistry, cleanName } from "./score.js";

const stage = document.getElementById("stage");
const params = new URLSearchParams(location.search);
const src = params.get("src");
const SWIPE_THRESHOLD = 90;
const FLY_MS = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 220;
const SVG_NS = "http://www.w3.org/2000/svg";
let keyHandler = null;
const ICONS = {
  no: "M6 6l12 12M18 6L6 18",
  yes: "M12 21s-7.5-4.6-9.5-9.2C1 8.2 3.2 5 6.3 5c1.9 0 3.5 1 4.5 2.6C11.8 6 13.4 5 15.3 5c3.1 0 5.3 3.2 3.8 6.8C19.5 16.4 12 21 12 21z",
};

function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? "" : value);
  }
  el.append(...children.flat().filter((c) => c != null && c !== false));
  return el;
}

function icon(kind) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", ICONS[kind]);
  path.setAttribute("fill", kind === "yes" ? "currentColor" : "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", kind === "yes" ? "0" : "3");
  path.setAttribute("stroke-linecap", "round");
  svg.append(path);
  return svg;
}

function intro(data) {
  const input = h("input", { id: "name", type: "text", maxlength: 20, autocomplete: "given-name", placeholder: "Your first name" });
  stage.replaceChildren(
    h("h1", {}, "Find your ", h("em", {}, "goth match")),
    h("p", { class: "lead" }, "Swipe 12 profiles. Hex the ones that get you. We'll tell you who's your match."),
    h("div", { class: "name-field" }, h("label", { for: "name" }, "Your first name (optional, only used on your share image)"), input),
    h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: () => swipeDeck(data, cleanName(input.value), 0, []) }, "Start swiping")),
    h("p", { class: "fine", style: "margin-top:14px" }, "For fun. No sign-up needed. 18+ only."));
}

function finish(data, name, hexed) {
  const counts = tally(data.cards, hexed);
  const match = winner(data.archetypes, counts);
  const query = new URLSearchParams({ c: String(chemistry(counts, match.id)) });
  if (name) query.set("name", name);
  if (src) query.set("src", src);
  location.assign(`./${match.id}/?${query}`);
}

function enableDrag(card, decide) {
  const hex = card.querySelector(".stamp.hex");
  const pass = card.querySelector(".stamp.pass");
  let startX = null;
  const reset = () => { card.style.transform = ""; hex.style.opacity = 0; pass.style.opacity = 0; };
  card.addEventListener("pointerdown", (e) => { startX = e.clientX; card.setPointerCapture(e.pointerId); card.classList.add("dragging"); });
  card.addEventListener("pointermove", (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    card.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
    hex.style.opacity = Math.max(0, Math.min(1, dx / SWIPE_THRESHOLD));
    pass.style.opacity = Math.max(0, Math.min(1, -dx / SWIPE_THRESHOLD));
  });
  card.addEventListener("pointerup", (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    card.classList.remove("dragging");
    if (Math.abs(dx) >= SWIPE_THRESHOLD) { card.style.transform = ""; decide(dx > 0 ? "hex" : "pass"); } else reset();
  });
  card.addEventListener("pointercancel", () => { startX = null; card.classList.remove("dragging"); reset(); });
}

function profileCard(data, index, extra = "") {
  const card = data.cards[index];
  const who = data.archetypes.find((a) => a.id === card.by);
  return h("article", { class: `swipe-card ${extra}`.trim(), "aria-label": `${who.name}, ${who.age}: ${card.text}` },
    h("img", { src: `../img/${who.img}.jpg`, alt: "", width: 720, height: 720 }),
    h("div", { class: "shade" }),
    h("span", { class: "stamp hex" }, "HEX"), h("span", { class: "stamp pass" }, "LET GO"),
    h("div", { class: "info" },
      h("h2", {}, who.name, h("small", {}, String(who.age))),
      h("span", { class: "dist" }, who.distance),
      h("p", { class: "say" }, card.text)));
}

function swipeDeck(data, name, index, hexed) {
  let busy = false;
  document.removeEventListener("keydown", keyHandler);
  const total = data.cards.length;
  const decide = (choice) => {
    if (busy) return;
    busy = true;
    const next = choice === "hex" ? [...hexed, index] : hexed;
    const go = () => (index + 1 < total ? swipeDeck(data, name, index + 1, next) : finish(data, name, next));
    const top = stage.querySelector(".swipe-card:not(.behind)");
    if (top && FLY_MS) { top.classList.add(choice === "hex" ? "fly-hex" : "fly-pass"); setTimeout(go, FLY_MS); } else go();
  };
  const top = profileCard(data, index);
  enableDrag(top, decide);
  stage.replaceChildren(
    h("div", { class: "segments", role: "presentation" }, data.cards.map((_, i) => h("i", { class: i <= index ? "on" : "" }))),
    h("div", { class: "deck" }, index + 1 < total && profileCard(data, index + 1, "behind"), top),
    h("div", { class: "actions" },
      h("button", { class: "round no", type: "button", "aria-label": "Let go", onclick: () => decide("pass") }, icon("no")),
      h("button", { class: "round yes", type: "button", "aria-label": "Hex", onclick: () => decide("hex") }, icon("yes"))),
    h("p", { class: "fine", style: "text-align:center;margin-top:12px" }, `${index + 1} of ${total}. Drag the card, or use the ← and → keys.`));
  keyHandler = (e) => {
    if (e.key === "ArrowRight") decide("hex");
    if (e.key === "ArrowLeft") decide("pass");
  };
  document.addEventListener("keydown", keyHandler);
}

fetch("./data.json")
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then(intro)
  .catch((error) => {
    console.error("Quiz failed to load:", error);
    stage.replaceChildren(h("p", { class: "lead" }, "The quiz didn't load. Refresh and try again."));
  });
