// Quiz engine. Tallies are rebuilt on every answer, never mutated.
import { winner } from "./score.js";

const stage = document.getElementById("stage");
const src = new URLSearchParams(location.search).get("src");

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

function intro(data) {
  stage.replaceChildren(
    h("h1", {}, "Which goth gf ", h("em", {}, "are you?")),
    h("p", { class: "lead" }, "Five questions. Six archetypes. Please be normal about the result."),
    h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: () => ask(data, 0, {}) }, "Start")),
    h("p", { class: "fine", style: "margin-top:14px" }, "For fun. No sign-up needed."));
  stage.querySelector("button").focus();
}

function ask(data, index, tally) {
  const question = data.questions[index];
  const total = data.questions.length;
  const pick = (id) => {
    const next = { ...tally, [id]: (tally[id] ?? 0) + 1 };
    if (index + 1 < total) return ask(data, index + 1, next);
    const result = winner(data.archetypes, next);
    location.assign(`./${result.id}/${src ? `?src=${encodeURIComponent(src)}` : ""}`);
  };
  stage.replaceChildren(
    h("p", { class: "fine" }, `Question ${index + 1} of ${total}`),
    h("div", { class: "bar", role: "presentation" }, h("i", { style: `width:${((index + 1) / total) * 100}%` })),
    h("h1", {}, question.q),
    h("div", { class: "answers" }, question.a.map(([text, id]) => h("button", { class: "answer", type: "button", onclick: () => pick(id) }, text))));
  stage.querySelector("h1").setAttribute("tabindex", "-1");
  stage.querySelector("h1").focus();
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
