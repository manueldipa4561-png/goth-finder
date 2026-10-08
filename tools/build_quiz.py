#!/usr/bin/env python3
"""Builds the quiz match pages (quiz/<id>/index.html) and the link-preview images (og/*.jpg).

Single source of truth: quiz/data.json. Re-run after editing it:  python3 tools/build_quiz.py
Preview images are drawn as SVG, rendered by macOS Quick Look and converted with sips.
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
SERIF = "Georgia, 'Times New Roman', serif"
SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif"
HEART = "M12 21s-7.5-4.6-9.5-9.2C1 8.2 3.2 5 6.3 5c1.9 0 3.5 1 4.5 2.6C11.8 6 13.4 5 15.3 5c3.1 0 5.3 3.2 3.8 6.8C19.5 16.4 12 21 12 21z"
FONTS = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,500&family=Inter:wght@400;500;600;700&display=swap"
ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%230a0709'/%3E%3Cpath d='M20 6a10 10 0 1 0 0 20 8 8 0 1 1 0-20z' fill='%23efe6da'/%3E%3C/svg%3E"


def og_svg(headline, line1, line2, chips, image_file):
    photo = base64.b64encode((ROOT / "img" / "q" / f"{image_file}.jpg").read_bytes()).decode()
    chip_x, chip_markup = 60, ""
    for chip in chips:
        width = 22 + 15 * len(chip)
        chip_markup += (f'<rect x="{chip_x}" y="405" width="{width}" height="46" rx="23" fill="none" stroke="#e8607a" stroke-width="2"/>'
                        f'<text x="{chip_x + width / 2}" y="436" text-anchor="middle" font-family="{SANS}" font-size="24" fill="#e8607a">{html.escape(chip)}</text>')
        chip_x += width + 12
    return f"""<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="1200" viewBox="0 0 1200 1200">
<defs>
<clipPath id="c"><rect x="600" y="0" width="600" height="630"/></clipPath>
<linearGradient id="flame" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8fa8"/><stop offset=".55" stop-color="#e8607a"/><stop offset="1" stop-color="#b3122f"/></linearGradient>
<linearGradient id="f" x1="0" x2="1"><stop offset="0" stop-color="#14060f"/><stop offset="1" stop-color="#14060f" stop-opacity="0"/></linearGradient>
<radialGradient id="g" cx="25%" cy="25%" r="90%"><stop offset="0" stop-color="#4a2160"/><stop offset="1" stop-color="#0a0709"/></radialGradient>
</defs>
<rect width="1200" height="1200" fill="#0a0709"/>
<g transform="translate(0,285)">
<rect width="1200" height="630" fill="url(#g)"/>
<image xlink:href="data:image/jpeg;base64,{photo}" x="600" y="0" width="600" height="630" preserveAspectRatio="xMidYMin slice" clip-path="url(#c)"/>
<rect x="600" y="0" width="150" height="630" fill="url(#f)"/>
<text x="60" y="86" font-family="{SANS}" font-size="26" letter-spacing="8" fill="#b3a5ae">HEXED</text>
<text x="60" y="210" font-family="{SERIF}" font-style="italic" font-size="104" fill="url(#flame)">{html.escape(headline)}</text>
<text x="60" y="300" font-family="{SANS}" font-weight="700" font-size="58" fill="#efe6da">{html.escape(line1)}</text>
<text x="60" y="352" font-family="{SANS}" font-size="30" fill="#b3a5ae">{html.escape(line2)}</text>
{chip_markup}
<rect x="60" y="500" width="430" height="70" rx="35" fill="url(#flame)"/>
<text x="275" y="546" text-anchor="middle" font-family="{SANS}" font-weight="700" font-size="30" fill="#fff">Find your goth match</text>
<text x="60" y="610" font-family="{SANS}" font-size="24" fill="#b3a5ae">{html.escape(SITE.replace("https://", ""))}/quiz</text>
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


def match_page(a):
    name, title, bio = html.escape(a["name"]), html.escape(a["title"]), html.escape(a["bio"])
    url, image = f"{SITE}/quiz/{a['id']}/", f"{SITE}/og/{a['id']}.jpg"
    share_title = html.escape(f"It's a match: {a['name']}, {a['age']}. Find your goth match.")
    chips = "".join(f"<li>{html.escape(t)}</li>" for t in a["tags"])
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{share_title} | Hexed</title>
<meta name="description" content="{bio} Swipe 12 profiles to find your goth match.">
<meta name="theme-color" content="#0a0709">
<meta property="og:title" content="{share_title}">
<meta property="og:description" content="{bio} Swipe 12 profiles to find your goth match.">
<meta property="og:type" content="website">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{image}">
<link rel="icon" href="{ICON}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="{FONTS}" rel="stylesheet">
<link rel="stylesheet" href="../quiz.css">
</head>
<body>
<div class="wrap">
  <header><a class="logo" href="../../" aria-label="Hexed home">Hex<span>ed</span></a><span class="tag">18+ ONLY</span></header>
  <main data-id="{a['id']}" data-name="{name}" data-age="{a['age']}" data-img="{a['img']}" data-tags="{html.escape('|'.join(a['tags']))}" data-bio="{bio}">
    <section class="match">
      <h1 class="match-title">It's a match!</h1>
      <div class="pair">
        <div class="avatar you" id="you" aria-hidden="true">You</div>
        <div class="heart" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="currentColor" d="{html.escape(a_heart())}"/></svg></div>
        <div class="avatar her"><img src="../../img/{a['img']}.jpg" alt="An AI-generated doll-style illustration of {name}, a fictional goth character. Not a real member."></div>
      </div>
      <p class="lead own" id="line-own">You and {name} hexed each other.</p>
      <p class="lead visitor" id="line-visitor"><b id="sharer">Someone</b> matched with {name}. Who's your goth match?</p>
      <span class="chem" id="chem" hidden></span>
    </section>
    <article class="profile">
      <img src="../../img/{a['img']}.jpg" alt="" loading="lazy">
      <div class="body">
        <h2>{name} <small>{a['age']}</small></h2>
        <span class="fine">{html.escape(a['distance'])} &middot; {title}</span>
        <ul class="chips">{chips}</ul>
        <p>{bio}</p>
      </div>
    </article>
    <div class="row">
      <button class="btn own" type="button" id="share">Share my match</button>
      <button class="btn ghost own" type="button" id="download">Download the story image</button>
      <a class="btn visitor" href="../">Find your goth match</a>
      <a class="btn ghost own" href="../">Swipe again</a>
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
      <p class="fine">We only email you about launch. Leave any time. Characters on this site are AI-generated doll-style illustrations of fictional people, not members.</p>
    </form>
  </main>
</div>
<script type="module" src="../share.js"></script>
</body>
</html>
"""


def a_heart():
    return HEART


def main():
    (ROOT / "og").mkdir(exist_ok=True)
    first = DATA["archetypes"][0]
    render_jpg(og_svg("Find your goth match", "Swipe 12 profiles. Hex the ones that get you.", "Six goth characters. One match. 18+ only.", ["Quiz", "Free", "30 seconds"], first["img"]), ROOT / "og" / "default.jpg")
    for a in DATA["archetypes"]:
        out = ROOT / "quiz" / a["id"]
        out.mkdir(exist_ok=True)
        (out / "index.html").write_text(match_page(a), encoding="utf-8")
        render_jpg(og_svg("It's a match!", f"{a['name']}, {a['age']}", f"{a['title']} - {a['distance']}", a["tags"], a["img"]), ROOT / "og" / f"{a['id']}.jpg")
        print("built", a["id"])


if __name__ == "__main__":
    main()
