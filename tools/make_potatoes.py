"""Generates the 8 potato sprites as SVG (assets/tiers/src/*.svg).
Render them to PNG with:  python3 tools/render_pngs.py
Edit freely — or just replace assets/tiers/*.png with your own art."""
import math, os, random

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "tiers", "src")
os.makedirs(OUT, exist_ok=True)
C = 256          # canvas centre (512 x 512)
R = 190          # body radius ≈ collision circle (config scale accounts for hats)


def blob(seed, rx=R, ry=R * 0.94, n=14, wobble=0.07):
    """Lumpy potato outline as a smooth closed path."""
    rnd = random.Random(seed)
    phase = [rnd.random() * 6.28 for _ in range(3)]
    pts = []
    for i in range(n):
        a = i / n * 2 * math.pi
        k = 1 + wobble * (math.sin(2 * a + phase[0]) * .6 + math.sin(3 * a + phase[1]) * .3 + math.sin(5 * a + phase[2]) * .25)
        pts.append((C + math.cos(a) * rx * k, C + 8 + math.sin(a) * ry * k))
    # Catmull-Rom -> cubic Bézier
    d = f"M{pts[0][0]:.1f},{pts[0][1]:.1f}"
    for i in range(n):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f" C{c1[0]:.1f},{c1[1]:.1f} {c2[0]:.1f},{c2[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}"
    return d + "Z"


def spots(seed, count=7):
    rnd = random.Random(seed * 7)
    s = ""
    for _ in range(count):
        a, r = rnd.random() * 6.28, R * (0.35 + rnd.random() * 0.5)
        x, y = C + math.cos(a) * r, C + 30 + math.sin(a) * r * 0.8
        s += f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{5 + rnd.random() * 6:.0f}" ry="{3 + rnd.random() * 4:.0f}" fill="#8a5424" opacity=".35" transform="rotate({rnd.random() * 180:.0f} {x:.0f} {y:.0f})"/>'
    return s


def eyes(kind="normal"):
    out = ""
    for s in (-1, 1):
        x = C + s * 62
        if kind == "star":
            pts = " ".join(f"{x + math.cos(-math.pi / 2 + i * math.pi / 5) * (30 if i % 2 == 0 else 13):.1f},{C - 10 + math.sin(-math.pi / 2 + i * math.pi / 5) * (30 if i % 2 == 0 else 13):.1f}" for i in range(10))
            out += f'<polygon points="{pts}" fill="#fff6a8" stroke="#ffb300" stroke-width="4"/>'
            continue
        out += f'<ellipse cx="{x}" cy="{C - 10}" rx="30" ry="34" fill="#fff"/>'
        out += f'<circle cx="{x + 5}" cy="{C - 4}" r="20" fill="#24161c"/>'
        out += f'<circle cx="{x + 12}" cy="{C - 14}" r="7" fill="#fff"/>'
    out += f'<ellipse cx="{C - 100}" cy="{C + 40}" rx="24" ry="13" fill="#ff7f8a" opacity=".45"/>'
    out += f'<ellipse cx="{C + 100}" cy="{C + 40}" rx="24" ry="13" fill="#ff7f8a" opacity=".45"/>'
    return out


def mouth(kind="smile"):
    if kind == "open":
        return f'<path d="M{C - 26},{C + 38} Q{C},{C + 90} {C + 26},{C + 38} Z" fill="#5a1e1e"/><ellipse cx="{C}" cy="{C + 62}" rx="12" ry="7" fill="#ff8a8a"/>'
    if kind == "grin":
        return f'<path d="M{C - 40},{C + 36} Q{C},{C + 80} {C + 40},{C + 36} Z" fill="#fff" stroke="#5a1e1e" stroke-width="6" stroke-linejoin="round"/>'
    return f'<path d="M{C - 24},{C + 42} Q{C},{C + 66} {C + 24},{C + 42}" fill="none" stroke="#5a1e1e" stroke-width="8" stroke-linecap="round"/>'


def body(seed, skin=("#f5d08a", "#d79a4e", "#97612a")):
    return f'''<defs><radialGradient id="g{seed}" cx="38%" cy="32%" r="75%">
      <stop offset="0" stop-color="{skin[0]}"/><stop offset=".65" stop-color="{skin[1]}"/><stop offset="1" stop-color="{skin[2]}"/></radialGradient></defs>
    <path d="{blob(seed)}" fill="url(#g{seed})" stroke="{skin[2]}" stroke-width="5"/>{spots(seed)}'''


# ---------- accessories ----------
def sprout():
    return f'''<path d="M{C},{C - 165} q-4,-40 6,-70" stroke="#3f8f3a" stroke-width="10" fill="none" stroke-linecap="round"/>
    <path d="M{C + 4},{C - 225} c-60,-30 -90,10 -95,20 c40,15 80,10 95,-20Z" fill="#6cc24a" stroke="#3f8f3a" stroke-width="5"/>
    <path d="M{C + 6},{C - 228} c50,-40 85,-10 92,0 c-35,22 -75,22 -92,0Z" fill="#7fd85a" stroke="#3f8f3a" stroke-width="5"/>'''


def glasses():
    return f'''<g fill="rgba(200,230,255,.25)" stroke="#2b2b2b" stroke-width="9">
      <circle cx="{C - 62}" cy="{C - 10}" r="44"/><circle cx="{C + 62}" cy="{C - 10}" r="44"/></g>
    <path d="M{C - 18},{C - 14} q18,-14 36,0" stroke="#2b2b2b" stroke-width="9" fill="none"/>
    <path d="M{C - 70},{C - 175} l70,-34 l70,34 l-70,34Z" fill="#2f4aa8" stroke="#1b2c6b" stroke-width="5"/><rect x="{C - 40}" y="{C - 168}" width="80" height="30" fill="#24398a"/>
    <path d="M{C + 60},{C - 172} q30,20 28,62" stroke="#f2c230" stroke-width="6" fill="none"/><circle cx="{C + 88}" cy="{C - 108}" r="9" fill="#f2c230"/>'''


def headphones():
    return f'''<path d="M{C - 175},{C - 10} C{C - 175},{C - 250} {C + 175},{C - 250} {C + 175},{C - 10}" stroke="#2c2c3a" stroke-width="26" fill="none" stroke-linecap="round"/>
    <rect x="{C - 210}" y="{C - 60}" width="60" height="110" rx="26" fill="#ff3d7f" stroke="#2c2c3a" stroke-width="8"/>
    <rect x="{C + 150}" y="{C - 60}" width="60" height="110" rx="26" fill="#ff3d7f" stroke="#2c2c3a" stroke-width="8"/>'''


def cowboy():
    return f'''<ellipse cx="{C}" cy="{C - 150}" rx="230" ry="42" fill="#8b5a2b" stroke="#5c3a17" stroke-width="7"/>
    <path d="M{C - 110},{C - 152} C{C - 110},{C - 290} {C + 110},{C - 290} {C + 110},{C - 152}Z" fill="#a0692f" stroke="#5c3a17" stroke-width="7"/>
    <path d="M{C - 105},{C - 175} Q{C},{C - 160} {C + 105},{C - 175}" stroke="#e8463c" stroke-width="16" fill="none"/>
    <path d="M{C - 20},{C - 270} q20,30 40,0" stroke="#5c3a17" stroke-width="6" fill="none"/>'''


def viking():
    horn = lambda s: f'<path d="M{C + s * 120},{C - 150} C{C + s * 210},{C - 170} {C + s * 225},{C - 250} {C + s * 190},{C - 300} C{C + s * 185},{C - 240} {C + s * 160},{C - 205} {C + s * 105},{C - 195}Z" fill="#f4ecd8" stroke="#a89a78" stroke-width="6"/>'
    return f'''{horn(-1)}{horn(1)}
    <path d="M{C - 150},{C - 120} C{C - 150},{C - 300} {C + 150},{C - 300} {C + 150},{C - 120}Z" fill="#b8c2cc" stroke="#6b7682" stroke-width="8"/>
    <rect x="{C - 158}" y="{C - 140}" width="316" height="34" rx="10" fill="#9aa5b1" stroke="#6b7682" stroke-width="6"/>
    <rect x="{C - 12}" y="{C - 270}" width="24" height="140" fill="#9aa5b1"/>
    {''.join(f'<circle cx="{C + x}" cy="{C - 123}" r="6" fill="#6b7682"/>' for x in (-120, -60, 60, 120))}'''


def king_back():
    return f'<path d="M{C - 150},{C - 60} Q{C - 250},{C + 170} {C - 200},{C + 230} L{C + 200},{C + 230} Q{C + 250},{C + 170} {C + 150},{C - 60}Z" fill="#c8102e" stroke="#7a0a1c" stroke-width="7"/>'


def king():
    pts = [(-120, -140), (-130, -260), (-65, -195), (0, -285), (65, -195), (130, -260), (120, -140)]
    poly = " ".join(f"{C + x},{C + y}" for x, y in pts)
    return f'''<polygon points="{poly}" fill="#ffcf33" stroke="#c48f00" stroke-width="8" stroke-linejoin="round"/>
    <circle cx="{C}" cy="{C - 170}" r="16" fill="#3b82f6"/><circle cx="{C - 75}" cy="{C - 165}" r="11" fill="#e11d48"/><circle cx="{C + 75}" cy="{C - 165}" r="11" fill="#22c55e"/>
    <path d="M{C - 150},{C + 150} Q{C},{C + 200} {C + 150},{C + 150}" stroke="#fff" stroke-width="22" fill="none" stroke-dasharray="2 26" stroke-linecap="round"/>'''


def cosmic_back():
    return f'''<defs><radialGradient id="aura"><stop offset=".55" stop-color="#b48cff" stop-opacity=".9"/><stop offset="1" stop-color="#b48cff" stop-opacity="0"/></radialGradient></defs>
    <circle cx="{C}" cy="{C + 8}" r="250" fill="url(#aura)"/>'''


def cosmic():
    star = lambda x, y, r: f'<path d="M{x},{y - r} Q{x},{y} {x + r},{y} Q{x},{y} {x},{y + r} Q{x},{y} {x - r},{y} Q{x},{y} {x},{y - r}Z" fill="#fff8c4"/>'
    return f'''<ellipse cx="{C}" cy="{C - 215}" rx="110" ry="26" fill="none" stroke="#ffe066" stroke-width="16"/>
    {star(C - 175, C - 150, 24)}{star(C + 185, C - 120, 18)}{star(C + 160, C + 160, 22)}{star(C - 190, C + 130, 15)}'''


TIERS = [
    dict(back="", front="", eyes="normal", mouth="smile", skin=("#f5d08a", "#d79a4e", "#97612a")),
    dict(back="", front=sprout(), eyes="normal", mouth="smile", skin=("#f5d08a", "#d49a50", "#946027")),
    dict(back="", front=glasses(), eyes="normal", mouth="smile", skin=("#f3cd86", "#d29548", "#925e25")),
    dict(back="", front=headphones(), eyes="normal", mouth="open", skin=("#f6d28e", "#d89c52", "#99642b")),
    dict(back="", front=cowboy(), eyes="normal", mouth="grin", skin=("#f2c97f", "#cf9142", "#8d5a22")),
    dict(back="", front=viking(), eyes="normal", mouth="open", skin=("#f1c67b", "#cb8c3e", "#88551f")),
    dict(back=king_back(), front=king(), eyes="normal", mouth="grin", skin=("#f7d592", "#dba25a", "#9c6830")),
    dict(back=cosmic_back(), front=cosmic(), eyes="star", mouth="open", skin=("#fbe2a8", "#e6b064", "#a77133")),
]

for i, t in enumerate(TIERS, 1):
    # tiers 1-3 render the face a bit bigger so tiny potatoes stay readable
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="-64 -64 640 640" width="640" height="640">
  {t["back"]}{body(i, t["skin"])}{eyes(t["eyes"])}{mouth(t["mouth"])}{t["front"]}
</svg>'''
    with open(os.path.join(OUT, f"{i}.svg"), "w") as f:
        f.write(svg)
print("wrote", len(TIERS), "SVGs to", os.path.normpath(OUT))
