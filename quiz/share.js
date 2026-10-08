// Result page: builds the shareable image on a canvas, shares or downloads it, and handles the waitlist form.
const main = document.querySelector("main[data-id]");
const { id, title, img } = main.dataset;
const statusEl = document.getElementById("status");
const CARD_W = 1080;
const CARD_H = 1350;

function setStatus(message, kind = "") {
  statusEl.textContent = message;
  statusEl.className = `status ${kind}`;
}

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

function memeText(ctx, lines, x, firstY, size) {
  ctx.font = `${size}px Anton, Impact, "Arial Narrow", sans-serif`;
  ctx.textAlign = "center";
  ctx.lineJoin = "round";
  ctx.lineWidth = size * 0.18;
  lines.forEach((text, i) => {
    const y = firstY + i * size * 1.08;
    ctx.strokeStyle = "#000";
    ctx.strokeText(text, x, y);
    ctx.fillStyle = "#fff";
    ctx.fillText(text, x, y);
  });
}

async function buildCard() {
  await document.fonts.load("64px Anton");
  const photo = await loadImage(`../../img/q/${img}.jpg`);
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  const scale = Math.max(CARD_W / photo.width, CARD_H / photo.height);
  const w = photo.width * scale;
  ctx.drawImage(photo, (CARD_W - w) / 2, 0, w, photo.height * scale);
  const shade = ctx.createLinearGradient(0, 0, 0, CARD_H);
  shade.addColorStop(0, "rgba(0,0,0,.55)");
  shade.addColorStop(0.3, "rgba(0,0,0,0)");
  shade.addColorStop(0.75, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,.7)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.font = '96px Anton, Impact, "Arial Narrow", sans-serif';
  memeText(ctx, wrapLines(ctx, `I'M ${title.toUpperCase()}`, CARD_W - 120), CARD_W / 2, 130, 96);
  memeText(ctx, ["WHICH GOTH GF ARE YOU?"], CARD_W / 2, CARD_H - 90, 68);
  ctx.font = "34px Inter, system-ui, sans-serif";
  ctx.fillStyle = "#e8607a";
  ctx.textAlign = "center";
  ctx.fillText(`${location.host}/quiz`, CARD_W / 2, CARD_H - 36);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Image export failed"))), "image/png"));
}

const shareUrl = () => new URL("./?src=share", location.href).href;

async function share() {
  try {
    const blob = await buildCard();
    const file = new File([blob], `hexed-${id}.png`, { type: "image/png" });
    const payload = { title: "Hexed", text: `I'm ${title}. Which goth gf are you?`, url: shareUrl() };
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
    const link = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `hexed-${id}.png` });
    link.click();
    URL.revokeObjectURL(link.href);
    setStatus("Saved. Post it and tag a friend.", "ok");
  } catch (error) {
    console.error("Download failed:", error);
    setStatus("Couldn't build the image. Take a screenshot instead.", "err");
  }
}

document.getElementById("share").addEventListener("click", share);
document.getElementById("download").addEventListener("click", download);

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
