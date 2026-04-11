"""
MediProof — Video Generator with Voiceover
Run: python generate_video.py
Output: MediProof_Explainer.mp4
"""

import os
import textwrap
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from gtts import gTTS
from moviepy import ImageClip, AudioFileClip, concatenate_videoclips

# ─── Canvas config ─────────────────────────────────────────────────────────────
W, H = 1920, 1080
TMP = Path("_video_tmp")
TMP.mkdir(exist_ok=True)

# ─── Colour palette ─────────────────────────────────────────────────────────────
BG_DARK     = (13, 13, 26)
BG_CARD     = (26, 26, 62)
PURPLE      = (108, 99, 255)
CYAN        = (0, 200, 255)
WHITE       = (255, 255, 255)
GREY        = (170, 170, 204)
LIGHT_BG    = (238, 240, 255)
GREEN       = (34, 197, 94)
YELLOW      = (250, 204, 21)

def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

# ─── Font helpers ───────────────────────────────────────────────────────────────

def get_font(size, bold=False):
    """Try system fonts, fall back gracefully."""
    candidates_bold = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/Library/Fonts/Arial Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    candidates_regular = [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/SFNS.ttf",
    ]
    for path in (candidates_bold if bold else candidates_regular):
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                pass
    return ImageFont.load_default()

# ─── Drawing utilities ──────────────────────────────────────────────────────────

def draw_gradient_bg(img):
    """Draw a vertical gradient background."""
    draw = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        r = int(BG_DARK[0] + (BG_CARD[0] - BG_DARK[0]) * t * 0.4)
        g = int(BG_DARK[1] + (BG_CARD[1] - BG_DARK[1]) * t * 0.4)
        b = int(BG_DARK[2] + (BG_CARD[2] - BG_DARK[2]) * t * 0.6)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

def draw_accent_bar(draw, x, y, w, h, color=PURPLE):
    draw.rectangle([x, y, x+w, y+h], fill=color)

def draw_rounded_rect(draw, x0, y0, x1, y1, radius=20, fill=None, outline=None, width=2):
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill, outline=outline, width=width)

def draw_bullet_point(draw, x, y, color=CYAN, size=10):
    draw.ellipse([x, y, x+size, y+size], fill=color)

def multiline_text_block(draw, text, font, color, x, y, max_width, line_spacing=1.3):
    """Wrap and draw text, return final y."""
    # Estimate character width
    try:
        char_w = font.getbbox("A")[2]
    except Exception:
        char_w = font.size // 2 if hasattr(font, 'size') else 10
    chars_per_line = max(1, int(max_width / char_w))
    lines = []
    for raw_line in text.split("\n"):
        if raw_line.strip() == "":
            lines.append("")
        else:
            wrapped = textwrap.wrap(raw_line, width=chars_per_line)
            lines.extend(wrapped if wrapped else [""])
    try:
        line_h = font.getbbox("A")[3] * line_spacing
    except Exception:
        line_h = 30
    cur_y = y
    for line in lines:
        draw.text((x, cur_y), line, font=font, fill=color)
        cur_y += line_h
    return cur_y

# ─── Slide builders ─────────────────────────────────────────────────────────────

def make_title_slide():
    img = Image.new("RGB", (W, H), BG_DARK)
    draw_gradient_bg(img)
    draw = ImageDraw.Draw(img)

    # Decorative circles
    for cx, cy, r, alpha in [(200, 150, 200, 30), (1750, 900, 250, 20), (1600, 100, 150, 15)]:
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        od.ellipse([cx-r, cy-r, cx+r, cy+r], outline=(*PURPLE, alpha), width=3)
        img.paste(Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB"))

    # Top accent bar
    draw_accent_bar(draw, 0, 0, W, 8, PURPLE)
    draw_accent_bar(draw, 0, 8, W, 3, CYAN)

    # Logo / badge
    draw_rounded_rect(draw, W//2-80, 160, W//2+80, 230, radius=30, fill=PURPLE)
    badge_font = get_font(28, bold=True)
    draw.text((W//2, 195), "MEDIPROOF", font=badge_font, fill=WHITE, anchor="mm")

    # Title
    title_font = get_font(96, bold=True)
    draw.text((W//2, 340), "MediProof", font=title_font, fill=WHITE, anchor="mm")

    # Cyan underline
    draw.rectangle([W//2 - 260, 405, W//2 + 260, 409], fill=CYAN)

    # Subtitle lines
    sub1_font = get_font(42, bold=False)
    draw.text((W//2, 460), "HIPAA-Compliant Healthcare AI", font=sub1_font, fill=CYAN, anchor="mm")
    draw.text((W//2, 515), "Dataset Provenance on Midnight Network", font=sub1_font, fill=GREY, anchor="mm")

    # Tagline
    tag_font = get_font(30, bold=False)
    draw.text((W//2, 620),
              "Prove compliance. Protect patients. Accelerate AI.",
              font=tag_font, fill=GREY, anchor="mm")

    # Bottom pills
    pill_data = ["Zero-Knowledge Proofs", "Midnight Network", "HIPAA Compliant", "Healthcare AI"]
    pill_x = W//2 - 620
    pill_y = 750
    for label in pill_data:
        pw = 280
        draw_rounded_rect(draw, pill_x, pill_y, pill_x+pw, pill_y+50, radius=25,
                          fill=BG_CARD, outline=PURPLE, width=2)
        pf = get_font(22)
        draw.text((pill_x + pw//2, pill_y+25), label, font=pf, fill=CYAN, anchor="mm")
        pill_x += pw + 30

    # Bottom bar
    draw_accent_bar(draw, 0, H-8, W, 8, PURPLE)
    path = TMP / "slide_00.png"
    img.save(path)
    return path


def make_problem_slide():
    img = Image.new("RGB", (W, H), BG_DARK)
    draw_gradient_bg(img)
    draw = ImageDraw.Draw(img)
    draw_accent_bar(draw, 0, 0, W, 6, PURPLE)

    # Section label
    label_font = get_font(24, bold=True)
    draw.rounded_rectangle([60, 40, 260, 80], radius=20, fill=PURPLE)
    draw.text((160, 60), "THE PROBLEM", font=label_font, fill=WHITE, anchor="mm")

    # Heading
    h_font = get_font(72, bold=True)
    draw.text((W//2, 155), "Healthcare AI Is Stuck", font=h_font, fill=WHITE, anchor="mm")
    draw.rectangle([W//2-300, 195, W//2+300, 200], fill=CYAN)

    # Sub
    s_font = get_font(32)
    draw.text((W//2, 245),
              "Hospitals hold life-saving data, but HIPAA blocks sharing it.",
              font=s_font, fill=GREY, anchor="mm")

    # Problem cards
    problems = [
        ("3–5 Years", "Drug trial delays due to\ninaccessible training data"),
        ("$50M", "Legal costs per cross-institution\nAI collaboration"),
        ("Biased AI", "Models trained on a single\nnon-diverse hospital dataset"),
        ("No Proof", "No cryptographic guarantee\ndata was ever compliant"),
    ]
    card_w, card_h = 380, 240
    start_x = 100
    for i, (stat, desc) in enumerate(problems):
        cx = start_x + i * (card_w + 40)
        cy = 320
        draw_rounded_rect(draw, cx, cy, cx+card_w, cy+card_h, radius=16,
                          fill=BG_CARD, outline=PURPLE, width=2)
        stat_font = get_font(52, bold=True)
        draw.text((cx + card_w//2, cy+65), stat, font=stat_font, fill=CYAN, anchor="mm")
        desc_font = get_font(26)
        for j, line in enumerate(desc.split("\n")):
            draw.text((cx + card_w//2, cy+115+j*35), line,
                      font=desc_font, fill=GREY, anchor="mm")

    # Bottom statement
    draw_rounded_rect(draw, 100, 620, W-100, 720, radius=16, fill=(*PURPLE[:3], 40))
    draw_rounded_rect(draw, 100, 620, W-100, 720, radius=16, outline=PURPLE, width=2)
    b_font = get_font(34, bold=True)
    draw.text((W//2, 670),
              "MediProof solves this with Zero-Knowledge Proofs on Midnight Network.",
              font=b_font, fill=WHITE, anchor="mm")

    # Bullet pain points
    bullet_font = get_font(28)
    bullets = [
        "HIPAA prohibits sharing patient records — even anonymised datasets carry breach liability",
        "Compliance audits rely on paper trails that can be forged or lost",
    ]
    by = 760
    for b in bullets:
        draw_bullet_point(draw, 90, by+8, CYAN)
        draw.text((120, by), b, font=bullet_font, fill=GREY)
        by += 50

    draw_accent_bar(draw, 0, H-6, W, 6, PURPLE)
    path = TMP / "slide_01.png"
    img.save(path)
    return path


def make_solution_slide():
    img = Image.new("RGB", (W, H), BG_DARK)
    draw_gradient_bg(img)
    draw = ImageDraw.Draw(img)
    draw_accent_bar(draw, 0, 0, W, 6, CYAN)

    label_font = get_font(24, bold=True)
    draw.rounded_rectangle([60, 40, 290, 80], radius=20, fill=CYAN)
    draw.text((175, 60), "THE SOLUTION", font=label_font, fill=BG_DARK, anchor="mm")

    h_font = get_font(72, bold=True)
    draw.text((W//2, 155), "What MediProof Does", font=h_font, fill=WHITE, anchor="mm")
    draw.rectangle([W//2-280, 195, W//2+280, 200], fill=PURPLE)

    # Hero statement card
    draw_rounded_rect(draw, 80, 230, W-80, 380, radius=20, fill=BG_CARD, outline=CYAN, width=3)
    hero_font = get_font(36, bold=True)
    draw.text((W//2, 285),
              "A hospital can PROVE their dataset is HIPAA-compliant and that an AI",
              font=hero_font, fill=WHITE, anchor="mm")
    draw.text((W//2, 335),
              "model was trained on it — without revealing a single patient record.",
              font=hero_font, fill=CYAN, anchor="mm")

    # Three column outcomes
    cols = [
        (PURPLE, "🏥", "Hospital", "Commits a ZK proof of\ndataset compliance.\nNo data leaves."),
        (CYAN,   "🔬", "Researcher", "Trains AI on verified\ndatasets. Gets cryptographic\nproof of training."),
        (GREEN,  "🔍", "Auditor", "Verifies everything\non-chain in seconds.\nNo subpoenas needed."),
    ]
    col_w = 520
    cx_start = 120
    for i, (color, icon, title, desc) in enumerate(cols):
        cx = cx_start + i * (col_w + 40)
        draw_rounded_rect(draw, cx, 420, cx+col_w, 730, radius=20,
                          fill=BG_CARD, outline=color, width=3)
        # Colour top strip
        draw.rounded_rectangle([cx, 420, cx+col_w, 468], radius=20, fill=color)
        draw.rectangle([cx, 448, cx+col_w, 468], fill=color)
        # Icon circle
        draw.ellipse([cx+col_w//2-42, 395, cx+col_w//2+42, 480], fill=BG_DARK, outline=color, width=3)
        icon_font = get_font(40)
        draw.text((cx+col_w//2, 437), icon, font=icon_font, anchor="mm")
        title_font = get_font(36, bold=True)
        draw.text((cx+col_w//2, 530), title, font=title_font, fill=WHITE, anchor="mm")
        desc_font = get_font(26)
        for j, line in enumerate(desc.split("\n")):
            draw.text((cx+col_w//2, 595+j*38), line, font=desc_font, fill=GREY, anchor="mm")

    # Bottom stats row
    stats = [("Zero", "Patient Records Exposed"), ("100%", "Cryptographically Verifiable"),
             ("Minutes", "vs. Months for Compliance")]
    sx = 130
    for stat, label in stats:
        sf = get_font(44, bold=True)
        lf = get_font(24)
        draw.text((sx+200, 790), stat, font=sf, fill=CYAN, anchor="mm")
        draw.text((sx+200, 840), label, font=lf, fill=GREY, anchor="mm")
        sx += 560

    draw_accent_bar(draw, 0, H-6, W, 6, CYAN)
    path = TMP / "slide_02.png"
    img.save(path)
    return path


def make_zk_slide():
    img = Image.new("RGB", (W, H), BG_DARK)
    draw_gradient_bg(img)
    draw = ImageDraw.Draw(img)
    draw_accent_bar(draw, 0, 0, W, 6, PURPLE)

    label_font = get_font(24, bold=True)
    draw.rounded_rectangle([60, 40, 320, 80], radius=20, fill=PURPLE)
    draw.text((190, 60), "CORE TECHNOLOGY", font=label_font, fill=WHITE, anchor="mm")

    h_font = get_font(72, bold=True)
    draw.text((W//2, 155), "Zero-Knowledge Proofs", font=h_font, fill=WHITE, anchor="mm")
    draw.rectangle([W//2-300, 195, W//2+300, 200], fill=CYAN)

    # Analogy card (left)
    draw_rounded_rect(draw, 60, 230, 860, 600, radius=20, fill=BG_CARD, outline=PURPLE, width=2)
    af = get_font(30, bold=True)
    draw.text((460, 265), "The Classic Analogy", font=af, fill=CYAN, anchor="mm")
    adf = get_font(26)
    analogy = (
        "You want to prove you know\n"
        "a secret password, without\n"
        "saying the password out loud.\n\n"
        "ZK proofs make this possible\n"
        "— mathematically guaranteed."
    )
    ay = 310
    for line in analogy.split("\n"):
        draw.text((460, ay), line, font=adf, fill=GREY, anchor="mm")
        ay += 40

    # In MediProof (right)
    draw_rounded_rect(draw, 920, 230, W-60, 600, radius=20, fill=BG_CARD, outline=CYAN, width=2)
    mf = get_font(30, bold=True)
    draw.text((W//2 + 440, 265), "In MediProof", font=mf, fill=PURPLE, anchor="mm")
    proofs = [
        ("Hospital proves:", '"I have 1,200 compliant records"', "without sharing records"),
        ("Researcher proves:", '"I trained on that dataset"', "without showing model weights"),
        ("Auditor verifies:", "Both proofs simultaneously", "without seeing anything private"),
    ]
    py = 310
    for actor, claim, result in proofs:
        af2 = get_font(24, bold=True)
        cf = get_font(24)
        draw.text((960, py), actor, font=af2, fill=CYAN)
        draw.text((960, py+30), claim, font=cf, fill=WHITE)
        draw.text((960, py+60), f"→ {result}", font=cf, fill=GREY)
        py += 100

    # ZK circuits table (bottom)
    draw_rounded_rect(draw, 60, 630, W-60, 860, radius=16, fill=BG_CARD, outline=PURPLE, width=2)
    tf = get_font(28, bold=True)
    draw.text((W//2, 665), "ZK Circuits in MediProof", font=tf, fill=WHITE, anchor="mm")
    circuits = [
        ("commit_dataset", "Dataset is HIPAA-compliant, ≥500 records", "dataset_hash, record_count, hospital_id", "commitment_hash on-chain"),
        ("prove_training", "AI model trained on committed dataset", "model_weights_hash, dataset_commitment", "training_proof on-chain"),
    ]
    headers = ["Circuit", "Proves", "Private Inputs", "Public Output"]
    col_xs = [80, 430, 880, 1360]
    col_widths = [340, 440, 470, 500]
    draw.rectangle([80, 690, W-80, 725], fill=PURPLE)
    hf = get_font(22, bold=True)
    for j, h in enumerate(headers):
        draw.text((col_xs[j]+10, 707), h, font=hf, fill=WHITE)
    rf = get_font(20)
    for i, row in enumerate(circuits):
        ry = 740 + i * 50
        if i % 2 == 1:
            draw.rectangle([80, ry-5, W-80, ry+45], fill=(*PURPLE, 20))
        for j, cell in enumerate(row):
            draw.text((col_xs[j]+10, ry+5), cell, font=rf, fill=GREY if j > 0 else WHITE)

    draw_accent_bar(draw, 0, H-6, W, 6, PURPLE)
    path = TMP / "slide_03.png"
    img.save(path)
    return path


def make_flow_slide():
    img = Image.new("RGB", (W, H), BG_DARK)
    draw_gradient_bg(img)
    draw = ImageDraw.Draw(img)
    draw_accent_bar(draw, 0, 0, W, 6, CYAN)

    label_font = get_font(24, bold=True)
    draw.rounded_rectangle([60, 40, 250, 80], radius=20, fill=CYAN)
    draw.text((155, 60), "DEMO FLOW", font=label_font, fill=BG_DARK, anchor="mm")

    h_font = get_font(68, bold=True)
    draw.text((W//2, 148), "How It Works — Step by Step", font=h_font, fill=WHITE, anchor="mm")
    draw.rectangle([W//2-320, 183, W//2+320, 188], fill=PURPLE)

    steps = [
        (PURPLE, "Step 1", "Hospital", "Commits Dataset",
         ["Enters: hospital name, disease category,", "record count, schema fields",
          "commit_dataset ZK circuit runs locally",
          "Only hashes hit the Midnight blockchain",
          "Gets: dataset_id + compliance_proof_hash"]),
        (CYAN, "Step 2", "Researcher", "Requests Training",
         ["Browses compliant dataset cards", "Selects dataset (sees: category, schema, ZK mode)",
          "5-step ZK pipeline runs automatically",
          "prove_training proof submitted to Midnight",
          "Gets: model_output_hash + training_proof_hash"]),
        (GREEN, "Step 3", "Auditor", "Verifies On-Chain",
         ["Pastes dataset_id → clicks Verify", "Both proofs verified simultaneously",
          "Full immutable audit log loads automatically",
          "No patient records. No trust required.",
          "Cryptographically enforced — forever."]),
    ]

    step_w = 540
    sx = 80
    for i, (color, step_label, role, action, bullets) in enumerate(steps):
        ex = sx + i*(step_w+30)
        # Card
        draw_rounded_rect(draw, ex, 215, ex+step_w, 850, radius=20, fill=BG_CARD, outline=color, width=3)
        # Top header
        draw.rounded_rectangle([ex, 215, ex+step_w, 268], radius=20, fill=color)
        draw.rectangle([ex, 248, ex+step_w, 268], fill=color)
        sf = get_font(24, bold=True)
        draw.text((ex+step_w//2, 240), step_label, font=sf, fill=BG_DARK if color==CYAN else WHITE, anchor="mm")
        # Step number circle
        draw.ellipse([ex+step_w//2-38, 255, ex+step_w//2+38, 330],
                     fill=BG_DARK, outline=color, width=3)
        nf = get_font(36, bold=True)
        draw.text((ex+step_w//2, 292), str(i+1), font=nf, fill=color, anchor="mm")
        # Role + action
        rf2 = get_font(32, bold=True)
        draw.text((ex+step_w//2, 375), role, font=rf2, fill=WHITE, anchor="mm")
        af = get_font(26)
        draw.text((ex+step_w//2, 415), action, font=af, fill=color, anchor="mm")
        # Divider
        draw.line([ex+30, 440, ex+step_w-30, 440], fill=color, width=1)
        # Bullet points
        bf = get_font(23)
        by2 = 460
        for b in bullets:
            draw_bullet_point(draw, ex+30, by2+6, color, size=8)
            draw.text((ex+52, by2), b, font=bf, fill=GREY)
            by2 += 50

    # Connecting arrows between cards
    arrow_y = 560
    for ax in [80+step_w+5, 80+(step_w+30)*2-25]:
        draw.polygon([(ax, arrow_y-20), (ax+28, arrow_y+2), (ax, arrow_y+22)], fill=PURPLE)

    draw_accent_bar(draw, 0, H-6, W, 6, CYAN)
    path = TMP / "slide_04.png"
    img.save(path)
    return path


def make_architecture_slide():
    img = Image.new("RGB", (W, H), BG_DARK)
    draw_gradient_bg(img)
    draw = ImageDraw.Draw(img)
    draw_accent_bar(draw, 0, 0, W, 6, PURPLE)

    label_font = get_font(24, bold=True)
    draw.rounded_rectangle([60, 40, 280, 80], radius=20, fill=PURPLE)
    draw.text((170, 60), "ARCHITECTURE", font=label_font, fill=WHITE, anchor="mm")

    h_font = get_font(68, bold=True)
    draw.text((W//2, 148), "System Architecture", font=h_font, fill=WHITE, anchor="mm")
    draw.rectangle([W//2-260, 183, W//2+260, 188], fill=CYAN)

    # Architecture diagram — boxes + arrows
    services = [
        (120,  270, 380, 400, PURPLE,  "Frontend",        "React + Vite\n:3000"),
        (550,  270, 810, 400, CYAN,    "Backend",         "FastAPI Python\n:8000"),
        (980,  270, 1240, 400, (255,165,0), "Midnight\nService",  "Node.js Express\n:6300"),
        (1410, 270, 1780, 400, (34,197,94), "Proof Server",    "Docker groth16\n:6301"),
        (550,  520, 810, 650, (100,180,255), "Database",    "Azure PostgreSQL\nHashes only"),
        (980,  520, 1240, 650, (200,100,255), "Midnight\nNetwork",  "Blockchain\nOn-chain proofs"),
    ]

    def draw_service_box(x0, y0, x1, y1, color, name, sub):
        draw_rounded_rect(draw, x0, y0, x1, y1, radius=16, fill=BG_CARD, outline=color, width=3)
        draw.rounded_rectangle([x0, y0, x1, y0+50], radius=16, fill=color)
        draw.rectangle([x0, y0+30, x1, y0+50], fill=color)
        nf = get_font(24, bold=True)
        sf2 = get_font(20)
        mid_x = (x0+x1)//2
        draw.text((mid_x, y0+25), name, font=nf, fill=BG_DARK, anchor="mm")
        for j, line in enumerate(sub.split("\n")):
            draw.text((mid_x, y0+75+j*30), line, font=sf2, fill=GREY, anchor="mm")

    for args in services:
        draw_service_box(*args)

    # Arrows
    arrow_specs = [
        (380, 335, 550, 335, WHITE, "API calls"),
        (810, 335, 980, 335, WHITE, "ZK client"),
        (1240, 335, 1410, 335, WHITE, "groth16"),
        (680, 400, 680, 520, WHITE, "asyncpg"),
        (1110, 400, 1110, 520, WHITE, "SDK WASM"),
    ]

    def arrow(x1, y1, x2, y2, color, label):
        draw.line([(x1, y1), (x2, y2)], fill=color, width=2)
        # Arrow head
        if x2 > x1:  # horizontal right
            draw.polygon([(x2, y2-8), (x2+14, y2), (x2, y2+8)], fill=color)
            lx, ly = (x1+x2)//2, y1-16
        elif y2 > y1:  # vertical down
            draw.polygon([(x2-8, y2), (x2, y2+14), (x2+8, y2)], fill=color)
            lx, ly = x1+8, (y1+y2)//2
        else:
            lx, ly = (x1+x2)//2, y1-16
        lf = get_font(18)
        draw.text((lx, ly), label, font=lf, fill=GREY)

    for args in arrow_specs:
        arrow(*args)

    # Tech stack table (bottom)
    draw_rounded_rect(draw, 60, 710, W-60, 960, radius=16, fill=BG_CARD, outline=PURPLE, width=1)
    tf = get_font(26, bold=True)
    draw.text((W//2, 745), "Full-Stack Technology", font=tf, fill=CYAN, anchor="mm")

    tech = [
        ("ZK Contract", "Compact (Midnight DSL)", "Blockchain", "Midnight Network Preprod"),
        ("Backend", "FastAPI + Python 3.14", "Database", "Azure PostgreSQL 17"),
        ("Frontend", "React 18 + Vite 6 + Tailwind", "ZK Engine", "Docker groth16"),
    ]
    row_y = 775
    cell_font = get_font(22)
    label_col_font = get_font(22, bold=True)
    col_xs2 = [90, 310, 870, 1100]
    for row in tech:
        for j, cell in enumerate(row):
            cf2 = label_col_font if j % 2 == 0 else cell_font
            fc = CYAN if j % 2 == 0 else GREY
            draw.text((col_xs2[j], row_y), cell, font=cf2, fill=fc)
        row_y += 50

    draw_accent_bar(draw, 0, H-6, W, 6, PURPLE)
    path = TMP / "slide_05.png"
    img.save(path)
    return path


def make_impact_slide():
    img = Image.new("RGB", (W, H), BG_DARK)
    draw_gradient_bg(img)
    draw = ImageDraw.Draw(img)
    draw_accent_bar(draw, 0, 0, W, 6, GREEN)

    label_font = get_font(24, bold=True)
    draw.rounded_rectangle([60, 40, 240, 80], radius=20, fill=GREEN)
    draw.text((150, 60), "IMPACT", font=label_font, fill=BG_DARK, anchor="mm")

    h_font = get_font(68, bold=True)
    draw.text((W//2, 148), "Real-World Impact", font=h_font, fill=WHITE, anchor="mm")
    draw.rectangle([W//2-220, 183, W//2+220, 188], fill=GREEN)

    scenarios = [
        (PURPLE, "💊 Pharma",
         "Drug Response AI",
         "Pfizer needs data from 50 hospitals across 10 countries. "
         "With MediProof: each commits a proof in minutes, training proofs generated per-hospital, "
         "FDA verifies 50 hashes on-chain. Weeks, not years."),
        (CYAN, "🏥 Hospital",
         "Ethical Monetisation",
         "Stanford has 20 years of rare disease data. Biotech companies pay for training rights — "
         "without Stanford transferring a single record. Revenue without HIPAA liability."),
        (GREEN, "🚀 AI Startup",
         "FDA Clearance",
         "Early Alzheimer's detection AI needs FDA clearance. "
         "Point the FDA to on-chain proof hashes — one per hospital dataset. "
         "Approval: 18 months → weeks."),
        (YELLOW, "🔬 Academic",
         "Rare Disease Research",
         "30 hospitals each commit small datasets for a disease affecting 1 in 50,000. "
         "Federated learning + MediProof proofs = 1,200 cases. Statistically significant. "
         "Previously impossible."),
    ]

    card_w = 420
    card_h = 320
    sy = 220
    for i, (color, icon, title, body) in enumerate(scenarios):
        row, col = i // 2, i % 2
        cx = 80 + col * (card_w + 30)
        cy = sy + row * (card_h + 25)
        draw_rounded_rect(draw, cx, cy, cx+card_w, cy+card_h, radius=18,
                          fill=BG_CARD, outline=color, width=2)
        # Header strip
        draw.rounded_rectangle([cx, cy, cx+card_w, cy+55], radius=18, fill=color)
        draw.rectangle([cx, cy+35, cx+card_w, cy+55], fill=color)
        hf = get_font(24, bold=True)
        draw.text((cx+card_w//2, cy+28), f"{icon}  {title}", font=hf,
                  fill=BG_DARK if color in (CYAN, GREEN, YELLOW) else WHITE, anchor="mm")
        bf = get_font(21)
        # Wrap body text
        by2 = cy + 70
        wrapped = textwrap.wrap(body, width=46)
        for line in wrapped[:5]:
            draw.text((cx+18, by2), line, font=bf, fill=GREY)
            by2 += 34

    # Stats on the right
    right_x = 980
    draw_rounded_rect(draw, right_x, 220, W-60, 890, radius=20, fill=BG_CARD, outline=GREEN, width=2)
    rtf = get_font(30, bold=True)
    draw.text((right_x + 400, 265), "Market Opportunity", font=rtf, fill=GREEN, anchor="mm")
    draw.line([right_x+40, 290, W-80, 290], fill=GREEN, width=1)

    market_stats = [
        ("$45B", "Healthcare AI market by 2026"),
        ("$2.7B", "Annual US compliance spend"),
        ("$4.5B", "Clinical trial data market"),
        ("$10B+", "ZK proof market by 2030"),
        ("$1.5M", "Average HIPAA breach fine"),
    ]
    sy2 = 320
    for stat, label in market_stats:
        draw_rounded_rect(draw, right_x+40, sy2, W-80, sy2+85, radius=12, fill=BG_DARK, outline=color, width=1)
        sf2 = get_font(42, bold=True)
        draw.text((right_x+160, sy2+42), stat, font=sf2, fill=CYAN, anchor="mm")
        lf2 = get_font(22)
        draw.text((right_x+340, sy2+42), label, font=lf2, fill=GREY, anchor="mm")
        sy2 += 105

    draw_accent_bar(draw, 0, H-6, W, 6, GREEN)
    path = TMP / "slide_06.png"
    img.save(path)
    return path


def make_cta_slide():
    img = Image.new("RGB", (W, H), BG_DARK)
    draw_gradient_bg(img)
    draw = ImageDraw.Draw(img)

    # Full accent bars
    draw_accent_bar(draw, 0, 0, W, 8, PURPLE)
    draw_accent_bar(draw, 0, 8, W, 3, CYAN)
    draw_accent_bar(draw, 0, H-8, W, 8, PURPLE)
    draw_accent_bar(draw, 0, H-11, W, 3, CYAN)

    # Decorative background circles
    draw.ellipse([W//2-400, H//2-400, W//2+400, H//2+400],
                 outline=(*PURPLE, 20), width=1)
    draw.ellipse([W//2-500, H//2-500, W//2+500, H//2+500],
                 outline=(*CYAN, 10), width=1)

    # Main message
    m_font = get_font(80, bold=True)
    draw.text((W//2, 280), "MediProof", font=m_font, fill=WHITE, anchor="mm")
    draw.rectangle([W//2-320, 325, W//2+320, 332], fill=CYAN)

    sub_font = get_font(38)
    draw.text((W//2, 390), "Prove compliance. Protect patients. Accelerate AI.", 
              font=sub_font, fill=CYAN, anchor="mm")

    # Three final pillars
    pillars = [
        (PURPLE, "Zero-Knowledge\nProofs", "Mathematically guaranteed\nprivacy — no trust required."),
        (CYAN,   "Midnight Network",       "Privacy-first blockchain\nbuilt for healthcare."),
        (GREEN,  "Instant Audits",         "FDA verification in seconds.\nNot months."),
    ]
    p_w, p_h = 480, 250
    px_start = (W - (p_w*3 + 60)) // 2
    for i, (color, title, desc) in enumerate(pillars):
        px = px_start + i*(p_w+30)
        py = 450
        draw_rounded_rect(draw, px, py, px+p_w, py+p_h, radius=20,
                          fill=BG_CARD, outline=color, width=3)
        tf2 = get_font(32, bold=True)
        df2 = get_font(24)
        for j, line in enumerate(title.split("\n")):
            draw.text((px+p_w//2, py+60+j*40), line, font=tf2, fill=color, anchor="mm")
        for j, line in enumerate(desc.split("\n")):
            draw.text((px+p_w//2, py+165+j*34), line, font=df2, fill=GREY, anchor="mm")

    # CTA button
    btn_x, btn_y, btn_w, btn_h = W//2-200, 760, 400, 70
    draw_rounded_rect(draw, btn_x, btn_y, btn_x+btn_w, btn_y+btn_h, radius=35, fill=PURPLE)
    bf2 = get_font(30, bold=True)
    draw.text((W//2, btn_y+35), "github.com/monty0007", font=bf2, fill=WHITE, anchor="mm")

    # Built on Midnight
    mi_font = get_font(26)
    draw.text((W//2, 880),
              "Built on Midnight Network  ·  Zero-Knowledge Proofs  ·  Healthcare AI  ·  April 2026",
              font=mi_font, fill=GREY, anchor="mm")

    path = TMP / "slide_07.png"
    img.save(path)
    return path


# ─── Voiceover scripts ──────────────────────────────────────────────────────────
SCRIPTS = [
    # Slide 0 — Title
    ("Welcome to MediProof — a privacy-first platform for HIPAA-compliant healthcare AI dataset "
     "provenance, built on the Midnight Network using Zero-Knowledge proofs. "
     "Hospitals prove their datasets are compliant. Researchers train AI on verified data. "
     "Auditors verify everything on-chain — all without a single patient record ever being exposed."),

    # Slide 1 — Problem
    ("Healthcare AI is stuck. Hospitals hold millions of patient records that could train "
     "life-saving AI models for cancer diagnosis, drug response prediction, and rare disease "
     "detection. But HIPAA prohibits sharing this data. "
     "The result: drug trials take three to five years due to inaccessible training data. "
     "AI models are biased because they're trained on a single hospital's non-diverse dataset. "
     "Cross-institution collaborations cost up to fifty million dollars in legal fees alone. "
     "And there's no cryptographic proof the data was ever compliant. "
     "MediProof solves all of this with Zero-Knowledge proofs on the Midnight Network."),

    # Slide 2 — Solution
    ("MediProof lets a hospital cryptographically prove their dataset is HIPAA-compliant, "
     "and that an AI model was trained on it — without revealing a single patient record. "
     "For hospitals: they commit a Zero-Knowledge proof of their dataset. No data leaves. "
     "For researchers: they train AI on verified datasets and get a cryptographic proof of training. "
     "For auditors like the FDA: they verify everything on-chain in seconds. No subpoenas needed. "
     "Zero patient records exposed. One hundred percent cryptographically verifiable. "
     "Compliance in minutes, not months."),

    # Slide 3 — ZK Proofs
    ("The core technology is Zero-Knowledge proofs. The classic analogy: "
     "you want to prove you know a secret password, without saying the password out loud. "
     "ZK proofs make this possible — mathematically guaranteed. "
     "In MediProof, the hospital proves they have twelve hundred compliant records — without sharing them. "
     "The researcher proves they trained on that dataset — without showing model weights. "
     "The auditor verifies both proofs — without seeing anything private. "
     "Two ZK circuits power this: commit-dataset proves HIPAA compliance with the record count as a "
     "private input — it never gets stored. "
     "prove-training proves the AI model was trained on the committed dataset. "
     "Only proof hashes hit the blockchain. Everything else stays private."),

    # Slide 4 — Flow
    ("Here's how a full MediProof demo works, step by step. "
     "Step one: the hospital commits their dataset. They enter the hospital name, disease category, "
     "record count, and schema fields. The commit-dataset ZK circuit runs locally. "
     "Only hashes reach the Midnight blockchain. They receive a dataset ID and a compliance proof hash. "
     "Step two: the researcher requests training. They browse dataset cards — "
     "seeing only the disease category, schema hash, and ZK mode. "
     "They select a dataset and submit a training request. "
     "A five-step ZK pipeline runs automatically, generating a prove-training proof "
     "submitted to the Midnight ledger. "
     "Step three: the auditor verifies on-chain. They paste the dataset ID, click verify, "
     "and both proofs — compliance and training — are confirmed simultaneously. "
     "The full audit log loads automatically. Immutable. Timestamped. Cryptographically enforced."),

    # Slide 5 — Architecture
    ("MediProof is a four-service system. "
     "The React Vite frontend on port three thousand provides three-role interfaces: "
     "Hospital, Researcher, and Auditor portals. "
     "The FastAPI Python backend on port eight thousand handles REST APIs, hashing, "
     "database operations, and ZK orchestration. "
     "The Midnight Service on port sixty-three hundred is a Node.js Express bridge to the "
     "Midnight SDK — because WASM cannot run natively in Python. "
     "The Docker proof server on port sixty-three-oh-one executes the actual groth16 ZK circuits. "
     "All patient-sensitive data is hashed before any processing. "
     "The Azure PostgreSQL database stores only hashes — dataset IDs, schema hashes, "
     "compliance proof hashes, and audit event logs. "
     "Zero patient records. Zero hospital names. Zero record counts. Ever."),

    # Slide 6 — Impact
    ("Let's look at real-world impact. "
     "For Pfizer: they want a chemotherapy response model across fifty hospitals in ten countries. "
     "Without MediProof, that's three to five years of legal agreements and tens of millions in "
     "compliance costs. With MediProof: each hospital commits a proof in minutes, "
     "training proofs are generated per hospital, and the FDA verifies all fifty proof hashes on-chain. "
     "For Stanford Medical: twenty years of rare disease data, monetised ethically without "
     "transferring a single record. Revenue without liability. "
     "For an AI startup: FDA clearance for an Alzheimer's diagnostic AI drops from eighteen months "
     "to weeks by pointing the FDA to on-chain proof hashes. "
     "The market opportunity is massive: the global healthcare AI market hits forty-five billion "
     "dollars by twenty-twenty-six. US compliance spend alone is two-point-seven billion annually. "
     "MediProof sits at the intersection of all of it."),

    # Slide 7 — CTA
    ("MediProof: Prove compliance. Protect patients. Accelerate AI. "
     "Built on the Midnight Network — the only blockchain designed from the ground up "
     "for privacy-first use cases like healthcare. "
     "Using Zero-Knowledge proofs, MediProof creates a world where hospitals share insights "
     "without sharing data, researchers train better AI without breaching privacy, "
     "and regulators verify compliance in seconds instead of months. "
     "Find the project on GitHub at github dot com slash monty zero zero zero seven. "
     "Thank you."),
]

# ─── Audio generation ───────────────────────────────────────────────────────────

def generate_audio(script, slide_num):
    path = TMP / f"audio_{slide_num:02d}.mp3"
    if path.exists():
        return path
    print(f"  🎙  Generating audio for slide {slide_num}…")
    tts = gTTS(text=script, lang="en", slow=False)
    tts.save(str(path))
    return path

# ─── Video assembly ─────────────────────────────────────────────────────────────

def build_video():
    print("🎬 MediProof Video Generator")
    print("=" * 40)

    slide_builders = [
        make_title_slide,
        make_problem_slide,
        make_solution_slide,
        make_zk_slide,
        make_flow_slide,
        make_architecture_slide,
        make_impact_slide,
        make_cta_slide,
    ]

    clips = []
    for i, (builder, script) in enumerate(zip(slide_builders, SCRIPTS)):
        print(f"\n📐 Rendering slide {i+1}/{len(slide_builders)}…")
        img_path = builder()

        print(f"  🔊 Generating voiceover…")
        audio_path = generate_audio(script, i)

        audio_clip = AudioFileClip(str(audio_path))
        duration = audio_clip.duration + 0.5  # small buffer

        img_clip = (
            ImageClip(str(img_path))
            .with_duration(duration)
            .with_audio(audio_clip)
        )
        clips.append(img_clip)
        print(f"  ✅ Slide {i+1} done ({duration:.1f}s)")

    print("\n🎞  Concatenating clips…")
    final = concatenate_videoclips(clips, method="compose")

    output = "MediProof_Explainer.mp4"
    print(f"💾 Exporting to {output}…")
    final.write_videofile(
        output,
        fps=24,
        codec="libx264",
        audio_codec="aac",
        preset="fast",
        ffmpeg_params=["-crf", "23"],
        logger="bar",
    )
    print(f"\n✅ Video saved: {output}")
    print(f"   Duration: {final.duration:.1f}s")

    # Cleanup temp files
    import shutil
    shutil.rmtree(TMP, ignore_errors=True)
    print("🧹 Temp files cleaned up.")

if __name__ == "__main__":
    build_video()
