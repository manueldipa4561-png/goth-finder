// Match page: personalises the screen, builds the story-sized share image on a canvas, and handles the waitlist form.
import { cleanName, ZERO_HEX_CHEMISTRY } from "./score.js";

const main = document.querySelector("main[data-id]");
const { id, name: herName, age, img, tags, bio } = main.dataset;
const params = new URLSearchParams(location.search);
const yourName = cleanName(params.get("name"));
const chem = Number(params.get("c")) || null;
const isVisitor = params.get("src") === "share";
const statusEl = document.getElementById("status");
const W = 1080;
const H = 1920;

function setStatus(message, kind = "") {
  statusEl.textContent = message;
  statusEl.className = `status ${kind}`;
}

// ---- personalise the screen (text only, never HTML) ----
const youEl = document.getElementById("you");
if (isVisitor) {
  document.body.classList.add("visitor-view");
  document.getElementById("sharer").textContent = yourName || "Someone";
  youEl.textContent = yourName ? yourName[0].toUpperCase() : "?";
} else {
  if (yourName) {
    youEl.textContent = yourName[0].toUpperCase();
    document.getElementById("line-own").textContent = `${yourName} and ${herName} hexed each other.`;
  }
  if (chem === ZERO_HEX_CHEMISTRY) document.getElementById("line-own").textContent = `You hexed nobody. ${herName} hexed you anyway.`;
}
youEl.classList.toggle("word", youEl.textContent.length > 1);
if (chem) {
  const chemEl = document.getElementById("chem");
  chemEl.textContent = chem === ZERO_HEX_CHEMISTRY ? `${chem}% chemistry. Please be normal about it.` : `${chem}% chemistry`;
  chemEl.hidden = false;
}

// ---- share image ----
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });
}

function wrapLines(ctx, text, maxWidth) {
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test;
  }
  return [...lines, line];
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function heart(ctx, cx, cy, size) {
  const s = size / 24;
  ctx.save();
  ctx.translate(cx - 12 * s, cy - 12 * s);
  ctx.scale(s, s);
  ctx.fill(new Path2D("M12 21s-7.5-4.6-9.5-9.2C1 8.2 3.2 5 6.3 5c1.9 0 3.5 1 4.5 2.6C11.8 6 13.4 5 15.3 5c3.1 0 5.3 3.2 3.8 6.8C19.5 16.4 12 21 12 21z"));
  ctx.restore();
}

function avatar(ctx, cx, cy, r, draw) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  draw();
  ctx.restore();
  ctx.lineWidth = 10;
  ctx.strokeStyle = "#14060f";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}

async function buildCard() {
  await Promise.all([document.fonts.load('italic 500 150px "Cormorant Garamond"'), document.fonts.load("700 56px Inter"), document.fonts.load("400 40px Inter")]);
  const photo = await loadImage(`../../img/q/${img}.jpg`);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#3a1450");
  bg.addColorStop(1, "#14060f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 760, 40, W / 2, 760, 620);
  glow.addColorStop(0, "rgba(232,96,122,.45)");
  glow.addColorStop(1, "rgba(232,96,122,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.fillStyle = "#b3a5ae";
  ctx.font = "600 30px Inter, sans-serif";
  ctx.letterSpacing = "10px";
  ctx.fillText("HEXED", W / 2, 120);
  ctx.letterSpacing = "0px";
  const title = ctx.createLinearGradient(220, 0, 860, 0);
  title.addColorStop(0, "#ff8fa8");
  title.addColorStop(1, "#ffffff");
  ctx.fillStyle = title;
  ctx.font = 'italic 500 190px "Cormorant Garamond", Georgia, serif';
  ctx.fillText("It's a match!", W / 2, 360);

  const cy = 760;
  avatar(ctx, 370, cy, 200, () => {
    const g = ctx.createLinearGradient(170, cy - 200, 570, cy + 200);
    g.addColorStop(0, "#ff6b8b");
    g.addColorStop(1, "#5a2d7a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff";
    ctx.font = '600 150px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(yourName ? yourName[0].toUpperCase() : "You", 370, cy + 50);
  });
  avatar(ctx, 710, cy, 200, () => {
    const scale = Math.max(400 / photo.width, 400 / photo.height);
    ctx.drawImage(photo, 710 - (photo.width * scale) / 2, cy - 200, photo.width * scale, photo.height * scale);
  });
  ctx.fillStyle = "#14060f";
  ctx.beginPath();
  ctx.arc(540, cy, 56, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8607a";
  heart(ctx, 540, cy, 64);

  ctx.fillStyle = "#efe6da";
  ctx.font = "700 56px Inter, sans-serif";
  ctx.fillText(`${(yourName || "You").toUpperCase()} + ${herName.toUpperCase()}`, W / 2, 1100);
  const label = chem ? `${chem}% chemistry` : "Chemistry: off the charts";
  ctx.font = "600 38px Inter, sans-serif";
  const pill = ctx.measureText(label).width + 80;
  ctx.strokeStyle = "#e8607a";
  ctx.lineWidth = 3;
  roundRect(ctx, (W - pill) / 2, 1140, pill, 76, 38);
  ctx.stroke();
  ctx.fillStyle = "#e8607a";
  ctx.fillText(label, W / 2, 1192);

  ctx.fillStyle = "rgba(255,255,255,.07)";
  roundRect(ctx, 80, 1290, W - 160, 340, 36);
  ctx.fill();
  ctx.textAlign = "left";
  ctx.fillStyle = "#fff";
  ctx.font = "700 54px Inter, sans-serif";
  ctx.fillText(`${herName}, ${age}`, 130, 1370);
  ctx.font = "400 32px Inter, sans-serif";
  ctx.fillStyle = "#e8607a";
  ctx.fillText(tags.split("|").join("  ·  "), 130, 1424);
  ctx.fillStyle = "#efe6da";
  ctx.font = 'italic 500 46px "Cormorant Garamond", Georgia, serif';
  wrapLines(ctx, `"${bio}"`, W - 260).slice(0, 3).forEach((line, i) => ctx.fillText(line, 130, 1494 + i * 54));

  ctx.textAlign = "center";
  const cta = ctx.createLinearGradient(240, 0, 840, 0);
  cta.addColorStop(0, "#ff6b8b");
  cta.addColorStop(1, "#b3122f");
  ctx.fillStyle = cta;
  roundRect(ctx, 200, 1700, W - 400, 100, 50);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "700 40px Inter, sans-serif";
  ctx.fillText("Find your goth match", W / 2, 1764);
  ctx.fillStyle = "#b3a5ae";
  ctx.font = "400 30px Inter, sans-serif";
  ctx.fillText(`${location.host}/quiz`, W / 2, 1850);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Image export failed"))), "image/png"));
}

function shareUrl() {
  const query = new URLSearchParams({ src: "share", c: String(chem ?? 95) });
  if (yourName) query.set("name", yourName);
  return new URL(`./?${query}`, location.href).href;
}

async function share() {
  try {
    const blob = await buildCard();
    const file = new File([blob], `hexed-match-${id}.png`, { type: "image/png" });
    const payload = { title: "Hexed", text: `I matched with ${herName}. Who's your goth match?`, url: shareUrl() };
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ ...payload, files: [file] });
    else if (navigator.share) await navigator.share(payload);
    else { await navigator.clipboard.writeText(payload.url); setStatus("Link copied. Paste it anywhere.", "ok"); }
  } catch (error) {
    if (error.name !== "AbortError") { console.error("Share failed:", error); setStatus("Couldn't share. Try Download instead.", "err"); }
  }
}

async function download() {
  try {
    const blob = await buildCard();
    const link = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `hexed-match-${id}.png` });
    link.click();
    URL.revokeObjectURL(link.href);
    setStatus("Saved. Post it to your story and tag a friend.", "ok");
  } catch (error) {
    console.error("Download failed:", error);
    setStatus("Couldn't build the image. Take a screenshot instead.", "err");
  }
}

document.getElementById("share").addEventListener("click", share);
document.getElementById("download").addEventListener("click", download);

// ---- waitlist form ----
const form = document.getElementById("join");
const joinStatus = document.getElementById("join-status");
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  joinStatus.textContent = "Summoning your spot...";
  joinStatus.className = "status";
  try {
    const response = await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(new FormData(form)).toString() });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    form.reset();
    joinStatus.textContent = "You're in. We'll email you at launch, and only then.";
    joinStatus.className = "status ok";
  } catch (error) {
    console.error("Waitlist signup failed:", error);
    joinStatus.textContent = "Something went wrong. Please try again in a minute.";
    joinStatus.className = "status err";
  } finally {
    button.disabled = false;
  }
});
