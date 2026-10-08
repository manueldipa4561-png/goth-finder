#!/usr/bin/env python3
"""Builds the quiz result pages (quiz/<id>/index.html) and the social share images (og/*.jpg).

Single source of truth: quiz/data.json. Re-run after editing it:  python3 tools/build_quiz.py
Share images are drawn as SVG and rendered to PNG by macOS Quick Look, then converted to JPEG with sips.
"""
import base64
import html
import json
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / "quiz" / "data.json").read_text(encoding="utf-8"))
SITE = DATA["site"]
FONT = "Impact, Anton, 'Arial Narrow Bold', sans-serif"
LINE_LIMIT = 13


def wrap(text, limit=LINE_LIMIT):
    lines, line = [], ""
    for word in text.split():
        candidate = f"{line} {word}".strip()
        if len(candidate) > limit and line:
            lines.append(line)
            line = word
        else:
            line = candidate
    return [*lines, line]


def og_svg(kicker, title, sub, image_file):
    photo = base64.b64encode((ROOT / "img" / "q" / f"{image_file}.jpg").read_bytes()).decode()
    lines = wrap(title.upper())
    text = "".join(
        f'<text x="60" y="{250 + i * 104}" font-family="{FONT}" font-size="100" fill="#fff" stroke="#000" '
        f'stroke-width="12" paint-order="stroke" stroke-linejoin="round">{html.escape(line)}</text>'
        for i, line in enumerate(lines)
    )
    return f"""<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="1200" viewBox="0 0 1200 1200">
<defs>
<clipPath id="c"><rect x="570" y="0" width="630" height="630"/></clipPath>
<linearGradient id="f" x1="0" x2="1"><stop offset="0" stop-color="#0a0709"/><stop offset="1" stop-color="#0a0709" stop-opacity="0"/></linearGradient>
<radialGradient id="g" cx="25%" cy="30%" r="80%"><stop offset="0" stop-color="#3a1f4d"/><stop offset="1" stop-color="#0a0709"/></radialGradient>
</defs>
<rect width="1200" height="1200" fill="#0a0709"/>
<g transform="translate(0,285)">
<rect width="1200" height="630" fill="url(#g)"/>
<image xlink:href="data:image/jpeg;base64,{photo}" x="570" y="0" width="630" height="630" preserveAspectRatio="xMidYMin slice" clip-path="url(#c)"/>
<rect x="570" y="0" width="170" height="630" fill="url(#f)"/>
<text x="60" y="130" font-family="{FONT}" font-size="48" fill="#e8607a">{html.escape(kicker)}</text>
{text}
<text x="60" y="520" font-family="{FONT}" font-size="46" fill="#efe6da">{html.escape(sub)}</text>
<text x="60" y="580" font-family="{FONT}" font-size="30" fill="#e8607a">{html.escape(SITE.replace("https://", ""))}/quiz</text>
</g>
</svg>"""


def render_jpg(svg, out_path):
    with tempfile.TemporaryDirectory() as tmp:
        svg_path = Path(tmp) / "card.svg"
        svg_path.write_text(svg, encoding="utf-8")
        subprocess.run(["qlmanage", "-t", "-s", "1200", "-o", tmp, str(svg_path)], check=True, capture_output=True)
        # Quick Look renders a square, so the art sits in the middle band of a 1200x1200 canvas and a centred 630px crop keeps it.
        cropped = Path(tmp) / "cropped.png"
        subprocess.run(["sips", "-c", "630", "1200", str(Path(tmp) / "card.svg.png"), "--out", str(cropped)], check=True, capture_output=True)
        subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "85", str(cropped), "--out", str(out_path)], check=True, capture_output=True)


def result_page(a):
    title, tagline = html.escape(a["title"]), html.escape(a["tagline"])
    url, image = f"{SITE}/quiz/{a['id']}/", f"{SITE}/og/{a['id']}.jpg"
    share_title = html.escape(f"I'm {a['title']}. Which goth gf are you?")
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{share_title} | Hexed</title>
<meta name="description" content="{tagline} Take the quiz.">
<meta name="theme-color" content="#0a0709">
<meta property="og:title" content="{share_title}">
<meta property="og:description" content="{tagline} Take the quiz.">
<meta property="og:type" content="website">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{image}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%230a0709'/%3E%3Cpath d='M20 6a10 10 0 1 0 0 20 8 8 0 1 1 0-20z' fill='%23efe6da'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,500&family=Inter:wght@400;500;600&family=Anton&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../quiz.css">
</head>
<body>
<div class="wrap">
  <header><a class="logo" href="../../" aria-label="Hexed home">Hex<span>ed</span></a><span class="tag">18+ ONLY</span></header>
  <main data-id="{a['id']}" data-title="{title}" data-img="{a['img']}">
    <figure class="card" style="margin:8px 0 18px">
      <img src="../../img/q/{a['img']}.jpg" alt="An AI-generated photo of a fictional goth woman, for the result {title}. Not a real member.">
      <span class="cap top">I'm {title}</span>
      <span class="cap bottom">Which goth gf are you?</span>
    </figure>
    <h1>You're <em>{title}.</em></h1>
    <p class="lead">{tagline}</p>
    <div class="row">
      <button class="btn" type="button" id="share">Share my result</button>
      <button class="btn ghost" type="button" id="download">Download the image</button>
      <a class="btn ghost" href="../">Take the quiz again</a>
    </div>
    <p id="status" class="status" role="status" aria-live="polite"></p>
    <form class="join" id="join" name="quiz-waitlist" method="POST" action="/" data-netlify="true" netlify-honeypot="bot-field">
      <h2>Hexed is coming. Be first inside.</h2>
      <input type="hidden" name="form-name" value="quiz-waitlist">
      <input type="hidden" name="src" value="quiz-{a['id']}">
      <p class="hp"><label>Leave this empty <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>
      <div><label for="email">Email</label><input id="email" name="email" type="email" required autocomplete="email" placeholder="you@midnight.com"></div>
      <label class="check" for="age"><input id="age" name="age18" type="checkbox" value="yes" required><span>I'm 18 or older.</span></label>
      <button class="btn" type="submit">Get early access</button>
      <p id="join-status" class="status" role="status" aria-live="polite"></p>
      <p class="fine">We only email you about launch. Leave any time. Photos on this site are AI-generated and show fictional people, not members.</p>
    </form>
  </main>
</div>
<script type="module" src="../share.js"></script>
</body>
</html>
"""


def main():
    (ROOT / "og").mkdir(exist_ok=True)
    render_jpg(og_svg("SWIPE IN THE DARK", "Which goth gf are you?", "Take the quiz. Be normal about it.", "swipe"), ROOT / "og" / "default.jpg")
    for a in DATA["archetypes"]:
        out = ROOT / "quiz" / a["id"]
        out.mkdir(exist_ok=True)
        (out / "index.html").write_text(result_page(a), encoding="utf-8")
        render_jpg(og_svg("I GOT:", a["title"], "Which goth gf are you?", a["img"]), ROOT / "og" / f"{a['id']}.jpg")
        print("built", a["id"])


if __name__ == "__main__":
    main()
