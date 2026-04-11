"""
MediProof — Project Overview PDF Generator
Run: python generate_pdf.py
Output: MediProof_Overview.pdf
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus.flowables import HRFlowable

# ─── Colour palette ────────────────────────────────────────────────────────────
MIDNIGHT_DARK  = colors.HexColor("#0D0D1A")
MIDNIGHT_BLUE  = colors.HexColor("#1A1A3E")
ACCENT_PURPLE  = colors.HexColor("#6C63FF")
ACCENT_CYAN    = colors.HexColor("#00C8FF")
LIGHT_BG       = colors.HexColor("#F4F4FF")
TEXT_DARK      = colors.HexColor("#1C1C2E")
TEXT_BODY      = colors.HexColor("#3A3A5C")
WHITE          = colors.white
LIGHT_PURPLE   = colors.HexColor("#EEF0FF")
TABLE_HEADER   = colors.HexColor("#6C63FF")
TABLE_ROW_ALT  = colors.HexColor("#F0EEFF")
GREEN_OK       = colors.HexColor("#22C55E")
RED_NO         = colors.HexColor("#EF4444")

W, H = A4
MARGIN = 2 * cm

# ─── Styles ────────────────────────────────────────────────────────────────────
base = getSampleStyleSheet()

def S(name, **kw):
    """Quick ParagraphStyle factory."""
    return ParagraphStyle(name, **kw)

COVER_TITLE = S("CoverTitle",
    fontSize=34, leading=42, textColor=WHITE, alignment=TA_CENTER,
    fontName="Helvetica-Bold", spaceAfter=8)
COVER_SUB = S("CoverSub",
    fontSize=15, leading=22, textColor=ACCENT_CYAN, alignment=TA_CENTER,
    fontName="Helvetica", spaceAfter=6)
COVER_TAG = S("CoverTag",
    fontSize=11, leading=16, textColor=colors.HexColor("#AAAACC"),
    alignment=TA_CENTER, fontName="Helvetica-Oblique")

SECTION_TITLE = S("SectionTitle",
    fontSize=18, leading=24, textColor=ACCENT_PURPLE, fontName="Helvetica-Bold",
    spaceBefore=16, spaceAfter=6)
SUB_TITLE = S("SubTitle",
    fontSize=13, leading=18, textColor=TEXT_DARK, fontName="Helvetica-Bold",
    spaceBefore=10, spaceAfter=4)
BODY = S("Body",
    fontSize=10, leading=16, textColor=TEXT_BODY, fontName="Helvetica",
    alignment=TA_JUSTIFY, spaceAfter=6)
BODY_BOLD = S("BodyBold",
    fontSize=10, leading=16, textColor=TEXT_DARK, fontName="Helvetica-Bold",
    spaceAfter=4)
BULLET = S("Bullet",
    fontSize=10, leading=15, textColor=TEXT_BODY, fontName="Helvetica",
    leftIndent=16, bulletIndent=4, spaceAfter=3)
CODE_STYLE = S("Code",
    fontSize=8.5, leading=13, fontName="Courier",
    textColor=colors.HexColor("#2D2D6E"), backColor=LIGHT_PURPLE,
    leftIndent=10, spaceAfter=6, spaceBefore=4)
CAPTION = S("Caption",
    fontSize=8, leading=11, textColor=colors.HexColor("#888AAA"),
    alignment=TA_CENTER, fontName="Helvetica-Oblique")

# ─── Helpers ───────────────────────────────────────────────────────────────────

def hr(color=ACCENT_PURPLE, width=1):
    return HRFlowable(width="100%", thickness=width, color=color, spaceAfter=6, spaceBefore=6)

def section(title, items):
    """Returns a section header + body items wrapped in KeepTogether when short."""
    return [Spacer(1, 0.3*cm), Paragraph(title, SECTION_TITLE), hr()] + items

def bullet(text):
    return Paragraph(f"• {text}", BULLET)

def table(data, col_widths, header=True):
    style = [
        ("BACKGROUND",  (0, 0), (-1, 0 if header else -1), TABLE_HEADER if header else LIGHT_PURPLE),
        ("TEXTCOLOR",   (0, 0), (-1, 0), WHITE if header else TEXT_DARK),
        ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, -1), 9),
        ("LEADING",     (0, 0), (-1, -1), 13),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, TABLE_ROW_ALT]),
        ("GRID",        (0, 0), (-1, -1), 0.4, colors.HexColor("#CCCCDD")),
        ("TOPPADDING",  (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("ALIGN",       (0, 0), (-1, -1), "LEFT"),
        ("VALIGN",      (0, 0), (-1, -1), "MIDDLE"),
    ]
    para_data = []
    for r, row in enumerate(data):
        para_row = []
        for c, cell in enumerate(row):
            style_name = "Helvetica-Bold" if (r == 0 and header) else "Helvetica"
            tc = WHITE if (r == 0 and header) else TEXT_BODY
            para_row.append(Paragraph(str(cell), S(f"TC{r}{c}", fontSize=9, leading=13,
                                                   fontName=style_name, textColor=tc)))
        para_data.append(para_row)
    t = Table(para_data, colWidths=col_widths, repeatRows=1 if header else 0)
    t.setStyle(TableStyle(style))
    return t

# ─── Cover page ────────────────────────────────────────────────────────────────

def cover_page():
    # We'll draw the cover with a coloured background table spanning full page
    bg_data = [[""]]
    bg = Table(bg_data, colWidths=[W - 2*MARGIN], rowHeights=[10*cm])
    bg.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), MIDNIGHT_BLUE),
        ("BOX",        (0,0), (-1,-1), 0, MIDNIGHT_BLUE),
        ("TOPPADDING", (0,0), (-1,-1), 30),
        ("BOTTOMPADDING", (0,0), (-1,-1), 30),
    ]))

    elements = [
        Spacer(1, 1.5*cm),
        bg,
        Spacer(1, 0.5*cm),
        Paragraph("MediProof", COVER_TITLE),
        Spacer(1, 0.2*cm),
        Paragraph("HIPAA-Compliant Healthcare AI Dataset Provenance", COVER_SUB),
        Paragraph("on the Midnight Network using Zero-Knowledge Proofs", COVER_SUB),
        Spacer(1, 0.5*cm),
        hr(ACCENT_CYAN, 2),
        Spacer(1, 0.4*cm),
        Paragraph(
            "Hospitals prove their datasets meet HIPAA requirements — mathematically — "
            "without ever exposing a single patient record. Researchers train AI models "
            "on cryptographically verified, compliant data. Auditors verify everything "
            "on-chain.",
            S("CoverBodyCenter", fontSize=11, leading=18, textColor=TEXT_BODY,
              alignment=TA_CENTER, fontName="Helvetica")),
        Spacer(1, 1.5*cm),
        Paragraph("April 2026", COVER_TAG),
        Spacer(1, 0.2*cm),
        Paragraph("Healthcare AI × Midnight Network × Zero-Knowledge Proofs", COVER_TAG),
        PageBreak(),
    ]
    return elements

# ─── Table of contents ─────────────────────────────────────────────────────────

def toc():
    toc_items = [
        ("1", "The Problem We're Solving"),
        ("2", "What MediProof Does"),
        ("3", "Core Technology: Zero-Knowledge Proofs"),
        ("4", "Roles & Users"),
        ("5", "How It Works — Step by Step"),
        ("6", "Architecture"),
        ("7", "ZK Smart Contract"),
        ("8", "The Three Portals"),
        ("9", "Real-World Scenarios"),
        ("10", "Why Midnight Network?"),
        ("11", "Tech Stack"),
        ("12", "Market Opportunity"),
    ]
    rows = [["#", "Section"]] + toc_items
    col_w = [1.2*cm, W - 2*MARGIN - 1.2*cm]
    return section("Table of Contents", [table(rows, col_w), Spacer(1, 0.3*cm), PageBreak()])

# ─── Section 1: Problem ────────────────────────────────────────────────────────

def problem_section():
    pain_data = [
        ["Pain Point", "Current Reality", "Cost"],
        ["Data sharing blocked", "HIPAA prohibits record sharing", "Projects never start"],
        ["Drug trial delays", "Insufficient training data", "3–5 year timelines"],
        ["AI model bias", "Trained on one hospital's data", "Misdiagnosis risk"],
        ["Compliance overhead", "Legal + de-ID pipelines per partner", "$500K–$50M per collaboration"],
        ["No cryptographic proof", "Paper audit trails, easy to fake", "Regulatory liability"],
    ]
    col_w = [(W - 2*MARGIN) * f for f in [0.3, 0.4, 0.3]]
    items = [
        Paragraph(
            "Healthcare AI is stuck. Hospitals have millions of patient records that could "
            "train life-saving AI models — for cancer diagnosis, drug response prediction, "
            "rare disease detection. But they <b>can't share that data</b>. HIPAA prohibits it.",
            BODY),
        Spacer(1, 0.2*cm),
        table(pain_data, col_w),
        Spacer(1, 0.3*cm),
        Paragraph("The result:", BODY_BOLD),
        bullet("Drug trials take <b>3–5 years</b> partly because researchers can't access enough data"),
        bullet("AI diagnostic models are <b>biased</b> — trained on a single hospital's non-diverse dataset"),
        bullet("Compliance costs <b>$500K–$50M</b> per cross-institution collaboration"),
        bullet("Even after all that, there's <b>no cryptographic proof</b> the data was actually compliant"),
    ]
    return section("1. The Problem We're Solving", items)

# ─── Section 2: What MediProof does ───────────────────────────────────────────

def what_section():
    items = [
        Paragraph(
            "<b>MediProof lets a hospital prove their dataset is HIPAA-compliant and that an "
            "AI model was trained on it — without revealing a single patient record.</b>",
            S("QuoteStyle", fontSize=12, leading=18, textColor=ACCENT_PURPLE,
              fontName="Helvetica-Bold", alignment=TA_CENTER,
              backColor=LIGHT_PURPLE, leftIndent=20, rightIndent=20,
              spaceBefore=8, spaceAfter=8)),
        Spacer(1, 0.3*cm),
        Paragraph(
            "MediProof does this by combining <b>Zero-Knowledge proofs</b> with the "
            "<b>Midnight Network</b> — a privacy-first blockchain — to create an immutable, "
            "cryptographically verifiable audit trail of healthcare data compliance, "
            "without any patient data ever leaving the hospital.",
            BODY),
        Spacer(1, 0.3*cm),
        Paragraph("Key outcomes:", BODY_BOLD),
        bullet("Hospitals <b>monetise their data</b> ethically with zero liability"),
        bullet("Researchers <b>access diverse, multi-hospital datasets</b> for better AI models"),
        bullet("Auditors <b>verify compliance instantly</b> on-chain — no subpoenas, no paper trails"),
        bullet("FDA approvals go from <b>18 months → weeks</b>"),
        bullet("Zero patient records ever transferred — <b>mathematically guaranteed</b>"),
    ]
    return section("2. What MediProof Does", items)

# ─── Section 3: ZK Proofs ─────────────────────────────────────────────────────

def zk_section():
    items = [
        Paragraph(
            "A Zero-Knowledge proof lets you prove a statement is <b>true</b> without "
            "revealing the underlying data.",
            BODY),
        Paragraph(
            "<b>Classic analogy:</b> You want to prove you know a secret password, "
            "without saying the password out loud. ZK proofs make that possible — mathematically.",
            BODY),
        Spacer(1, 0.2*cm),
        Paragraph("In MediProof:", BODY_BOLD),
        bullet("The hospital proves <i>\"I have 1,200 oncology records that are de-identified\"</i>"
               " → without sharing the records"),
        bullet("The researcher proves <i>\"I trained this model on that dataset\"</i>"
               " → without showing model weights or data"),
        bullet("The auditor verifies both proofs → without seeing anything private"),
        Spacer(1, 0.3*cm),
        Paragraph(
            "MediProof uses <b>groth16</b> proofs compiled from <b>Compact</b> "
            "(Midnight's ZK DSL). Two circuits handle the core logic:",
            BODY),
        Spacer(1, 0.1*cm),
        table(
            [["Circuit", "What It Proves", "Private Inputs", "Public Output"],
             ["commit_dataset",
              "Dataset is HIPAA de-identified, ≥500 records, linked to hospital",
              "dataset_hash, record_count, hospital_id",
              "commitment_hash on-chain"],
             ["prove_training",
              "AI model was trained on the committed dataset",
              "model_weights_hash, dataset_commitment, training_rows",
              "training_proof on-chain"]],
            [(W-2*MARGIN)*f for f in [0.2, 0.32, 0.28, 0.2]]
        ),
        Spacer(1, 0.2*cm),
        Paragraph(
            "<b>What goes on-chain:</b> only the proof hashes and a timestamp.<br/>"
            "<b>What never leaves the hospital:</b> patient records, raw counts, hospital identity.",
            BODY),
    ]
    return section("3. Core Technology: Zero-Knowledge Proofs", items)

# ─── Section 4: Roles ─────────────────────────────────────────────────────────

def roles_section():
    items = [
        table(
            [["Role", "Who They Are", "What They Do in MediProof"],
             ["🏥  Hospital",
              "MGH, Mayo Clinic, any clinic with patient data",
              "Commits a ZK proof that their dataset exists and is HIPAA-compliant"],
             ["🔬  Researcher",
              "MIT lab, Pfizer data science team, PhD student",
              "Browses compliant datasets, requests AI training permission"],
             ["🔍  Auditor",
              "FDA, CMS, hospital compliance officer, IRB",
              "Verifies dataset compliance and training proofs on-chain"]],
            [(W-2*MARGIN)*f for f in [0.18, 0.32, 0.5]]
        ),
    ]
    return section("4. Roles & Users", items)

# ─── Section 5: Step-by-step flow ─────────────────────────────────────────────

def flow_section():
    step_style = S("Step", fontSize=10, leading=15, textColor=ACCENT_PURPLE,
                   fontName="Helvetica-Bold")
    items = [
        Paragraph("Step 1 — Hospital commits a dataset", step_style),
        bullet("Enters: hospital name, disease category, record count, schema fields"),
        bullet("App generates cryptographic commitment via the <b>commit_dataset</b> ZK circuit"),
        bullet("Only hashes reach the Midnight blockchain — real name and count stay private"),
        bullet("Receives: <b>dataset_id</b> and <b>compliance_proof_hash</b>"),
        Spacer(1, 0.2*cm),
        Paragraph("Step 2 — Researcher finds and trains on it", step_style),
        bullet("Browses published datasets (sees only: category, schema hash, ZK mode)"),
        bullet("Selects a dataset card and clicks 'Submit Training Request'"),
        bullet("5-step ZK pipeline runs: fetch shard → privacy budget → training circuit → "
               "prove_training proof → submit to Midnight ledger"),
        bullet("Receives: <b>model_output_hash</b> and <b>training_proof_hash</b>"),
        Spacer(1, 0.2*cm),
        Paragraph("Step 3 — Auditor verifies everything", step_style),
        bullet("Pastes a <b>dataset_id</b> and clicks 'Verify'"),
        bullet("Both proofs (compliance + training) are verified on-chain simultaneously"),
        bullet("Full audit log shows every event — timestamped, immutable"),
        bullet("No patient records, no trust required — cryptographically enforced"),
        Spacer(1, 0.2*cm),
        Paragraph(
            "The entire audit trail is verifiable without a single patient record ever being shared.",
            S("EmphBody", fontSize=10, leading=15, textColor=ACCENT_PURPLE,
              fontName="Helvetica-BoldOblique", alignment=TA_CENTER)),
    ]
    return section("5. How It Works — Step by Step", items)

# ─── Section 6: Architecture ──────────────────────────────────────────────────

def arch_section():
    items = [
        Paragraph(
            "MediProof is a four-service system that separates concerns cleanly across "
            "frontend, backend, ZK bridge, and blockchain:",
            BODY),
        Spacer(1, 0.2*cm),
        table(
            [["Service", "Port", "Language", "Responsibility"],
             ["Frontend",        "3000", "React + Vite",       "Three-role UI: Hospital, Researcher, Auditor"],
             ["Backend",         "8000", "Python / FastAPI",   "REST API, hashing, DB, ZK orchestration"],
             ["Midnight Service","6300", "Node.js / Express",  "Midnight SDK bridge (WASM cannot run in Python)"],
             ["Proof Server",    "6301", "Docker",             "Actual ZK circuit execution (groth16)"],
             ["Database",        "Azure","PostgreSQL 17",      "Stores dataset/training/audit records (hashes only)"]],
            [(W-2*MARGIN)*f for f in [0.22, 0.1, 0.2, 0.48]]
        ),
        Spacer(1, 0.3*cm),
        Paragraph("Data flow:", BODY_BOLD),
        Paragraph(
            "Browser → FastAPI (Python, :8000) → asyncpg → Azure PostgreSQL (hashes only)<br/>"
            "Browser → FastAPI → zk_client.py → Midnight Service (:6300) → "
            "Midnight SDK (WASM) → Docker Proof Server (:6301)<br/>"
            "Browser wallet.js → Lace extension → Midnight DApp Connector API",
            CODE_STYLE),
    ]
    return section("6. Architecture", items)

# ─── Section 7: ZK Contract ───────────────────────────────────────────────────

def contract_section():
    items = [
        Paragraph(
            "The ZK contract is written in <b>Compact</b> — Midnight Network's domain-specific "
            "language for privacy-preserving smart contracts. The compiled output (groth16 keys "
            "and ZKIR) lives in <code>contract/dist/</code>.",
            BODY),
        Spacer(1, 0.2*cm),
        Paragraph("Database schema (hashes only — zero patient data):", BODY_BOLD),
        Paragraph(
            "datasets          — dataset_id, schema_hash, disease_category, compliance_proof_hash\n"
            "                    (hospital_name is hashed; record_count is never stored)\n\n"
            "training_requests — request_id, dataset_id, model_output_hash, training_proof_hash\n\n"
            "audit_log         — dataset_id, event_type, actor_hash, proof_hash, timestamp",
            CODE_STYLE),
        Spacer(1, 0.2*cm),
        Paragraph("ZK Modes:", BODY_BOLD),
        table(
            [["Mode",   "Condition",                              "Behaviour"],
             ["real",   "Contract compiled + proof server running","Actual ZK circuits via Docker proof server"],
             ["mock",   "Proof server down or not compiled",       "SHA-256 hash used as proof fallback"]],
            [(W-2*MARGIN)*f for f in [0.15, 0.42, 0.43]]
        ),
    ]
    return section("7. ZK Smart Contract", items)

# ─── Section 8: The Three Portals ─────────────────────────────────────────────

def portals_section():
    items = [
        Paragraph("<b>Hospital Portal — Commit a Dataset</b>", SUB_TITLE),
        Paragraph(
            "The hospital declares their dataset and the app generates a cryptographic commitment "
            "— a proof that the dataset exists with specific properties, without revealing the "
            "dataset itself. Hospital name is SHA-256 hashed immediately; record count is used "
            "as a private ZK witness and never stored.",
            BODY),
        Spacer(1, 0.2*cm),
        Paragraph("<b>Researcher Portal — Request Training</b>", SUB_TITLE),
        Paragraph(
            "Researchers browse all published datasets as cards (seeing only: category, schema "
            "hash, ZK mode). They select a dataset and submit a training request. A 5-step "
            "animated pipeline generates the prove_training ZK proof and submits to the "
            "Midnight ledger. The researcher never sees patient records, the hospital's name, "
            "or the record count.",
            BODY),
        Spacer(1, 0.2*cm),
        Paragraph("<b>Auditor Portal — Verify Compliance</b>", SUB_TITLE),
        Paragraph(
            "An auditor (FDA inspector, hospital compliance officer, IRB reviewer) pastes a "
            "dataset_id and verifies both the compliance proof (from the hospital) and the "
            "training proof (from the researcher) simultaneously on-chain. The auto-loading "
            "audit log shows every event across all datasets — immutable and timestamped. "
            "This replaces paper audit trails, legal certifications, and data exports.",
            BODY),
    ]
    return section("8. The Three Portals", items)

# ─── Section 9: Scenarios ─────────────────────────────────────────────────────

def scenarios_section():
    scenarios = [
        ("Pharma — Drug Response Model",
         "Pfizer wants to train a chemotherapy response model across 50 hospitals in 10 countries. "
         "Without MediProof: 3–5 years of legal agreements, $10M+ de-identification pipeline, "
         "catastrophic breach liability. With MediProof: each hospital commits a proof in minutes, "
         "Pfizer's training system generates prove_training proofs, FDA verifies all 50 hashes "
         "on-chain. Total time: weeks, not years. Zero patient records transferred."),
        ("Hospital — Ethical Data Monetisation",
         "Stanford Medical has 20 years of rare disease records. Biotech companies would pay "
         "millions for access, but HIPAA creates unacceptable risk. With MediProof, Stanford "
         "publishes a ZK commitment. Companies verify dataset properties and pay for training "
         "rights — without Stanford ever transferring data. Revenue without liability."),
        ("AI Startup — FDA Clearance",
         "A startup has built a diagnostic AI for early Alzheimer's detection. FDA clearance "
         "requires proof the training data was HIPAA-compliant and sufficiently diverse. "
         "Currently: months of documentation and IRB approvals. With MediProof: point the FDA "
         "to on-chain proof hashes — one per hospital dataset. Approval timeline: 18 months → weeks."),
        ("Academic — Rare Disease Research",
         "A Johns Hopkins researcher needs multi-hospital data on a disease affecting 1 in 50,000 "
         "people. 30 hospitals each commit their small datasets. Federated learning aggregates "
         "training, and MediProof generates a proof per hospital contribution. Combined model: "
         "1,200 cases — statistically significant. Impossible without MediProof."),
    ]
    items = []
    for title, body in scenarios:
        items.append(Paragraph(f"<b>{title}</b>", SUB_TITLE))
        items.append(Paragraph(body, BODY))
        items.append(Spacer(1, 0.1*cm))
    return section("9. Real-World Scenarios", items)

# ─── Section 10: Why Midnight ─────────────────────────────────────────────────

def midnight_section():
    items = [
        Paragraph(
            "Midnight is a privacy-first blockchain built specifically for use cases where "
            "<b>data must stay private but provenance must be public</b>. Most blockchains "
            "(Ethereum, Solana) are fully transparent — a disaster for healthcare.",
            BODY),
        Spacer(1, 0.2*cm),
        table(
            [["Feature",              "Public Chains (Ethereum/Solana)", "Midnight"],
             ["Transaction data",     "Fully public",                    "Selectively private"],
             ["ZK proofs",           "Add-on / complex",                "Native first-class"],
             ["HIPAA suitability",   "❌ Not suitable",                  "✅ Designed for it"],
             ["Selective disclosure","Not supported",                    "Built-in"],
             ["Smart contracts",     "Solidity / Rust",                  "Compact (ZK DSL)"]],
            [(W-2*MARGIN)*f for f in [0.28, 0.38, 0.34]]
        ),
    ]
    return section("10. Why Midnight Network?", items)

# ─── Section 11: Tech stack ────────────────────────────────────────────────────

def stack_section():
    items = [
        table(
            [["Layer",           "Technology"],
             ["ZK Contract",     "Compact (Midnight Network DSL)"],
             ["Blockchain",      "Midnight Network (Preprod testnet)"],
             ["Backend",         "FastAPI + Python 3.14"],
             ["Database",        "Azure PostgreSQL 17, asyncpg"],
             ["Frontend",        "React 18 + Vite 6 + Tailwind CSS"],
             ["Midnight Bridge", "Node.js + Express + Midnight SDK (WASM)"],
             ["ZK Proof Engine", "Docker — midnightntwrk/proof-server (groth16)"],
             ["Wallet",          "Lace browser extension (Midnight DApp Connector API)"]],
            [(W-2*MARGIN)*0.35, (W-2*MARGIN)*0.65]
        ),
    ]
    return section("11. Tech Stack", items)

# ─── Section 12: Market ────────────────────────────────────────────────────────

def market_section():
    items = [
        table(
            [["Metric",                        "Value"],
             ["Global healthcare AI market",   "$45B by 2026"],
             ["Compliance spend (US health)",  "$2.7B / year"],
             ["Clinical trial data market",    "$4.5B / year"],
             ["ZK proof market (projected)",   "$10B+ by 2030"],
             ["HIPAA breach fines (avg)",      "$1.5M per incident"]],
            [(W-2*MARGIN)*0.55, (W-2*MARGIN)*0.45]
        ),
        Spacer(1, 0.3*cm),
        Paragraph(
            "MediProof is positioned at the intersection of healthcare compliance, AI data "
            "infrastructure, and privacy-preserving cryptography — three of the fastest-growing "
            "sectors in enterprise technology.",
            BODY),
        Spacer(1, 0.5*cm),
        hr(ACCENT_CYAN, 1.5),
        Spacer(1, 0.3*cm),
        Paragraph(
            "MediProof — Prove compliance. Protect patients. Accelerate AI.",
            S("Final", fontSize=13, leading=18, textColor=ACCENT_PURPLE,
              fontName="Helvetica-Bold", alignment=TA_CENTER)),
        Spacer(1, 0.2*cm),
        Paragraph(
            "Built on the Midnight Network · Zero-Knowledge Proofs · April 2026",
            CAPTION),
    ]
    return section("12. Market Opportunity", items)

# ─── Build PDF ─────────────────────────────────────────────────────────────────

def build():
    output = "MediProof_Overview.pdf"
    doc = SimpleDocTemplate(
        output,
        pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=MARGIN, bottomMargin=MARGIN,
        title="MediProof — Project Overview",
        author="MediProof Team",
        subject="Healthcare AI Dataset Provenance on Midnight Network",
    )

    def on_page(canvas, doc):
        canvas.saveState()
        # Header bar
        canvas.setFillColor(MIDNIGHT_BLUE)
        canvas.rect(0, H - 1*cm, W, 1*cm, fill=1, stroke=0)
        canvas.setFillColor(ACCENT_CYAN)
        canvas.setFont("Helvetica-Bold", 8)
        canvas.drawString(MARGIN, H - 0.65*cm, "MediProof")
        canvas.setFillColor(colors.HexColor("#AAAACC"))
        canvas.setFont("Helvetica", 8)
        canvas.drawRightString(W - MARGIN, H - 0.65*cm,
                               "HIPAA-Compliant Healthcare AI · Midnight Network")
        # Footer
        canvas.setFillColor(colors.HexColor("#CCCCDD"))
        canvas.rect(0, 0, W, 0.7*cm, fill=1, stroke=0)
        canvas.setFillColor(TEXT_BODY)
        canvas.setFont("Helvetica", 7.5)
        canvas.drawString(MARGIN, 0.22*cm, "Confidential · MediProof · April 2026")
        canvas.drawRightString(W - MARGIN, 0.22*cm, f"Page {doc.page}")
        canvas.restoreState()

    story = []
    story += cover_page()
    story += toc()
    story += problem_section()
    story += what_section()
    story += zk_section()
    story += roles_section()
    story += flow_section()
    story += arch_section()
    story += contract_section()
    story += portals_section()
    story += scenarios_section()
    story += midnight_section()
    story += stack_section()
    story += market_section()

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    print(f"✅  PDF generated: {output}")

if __name__ == "__main__":
    build()
