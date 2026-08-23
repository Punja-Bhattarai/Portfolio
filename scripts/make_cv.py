#!/usr/bin/env python3
"""Generates Punja Bhattarai's one-page CV → public/cv/CV.pdf (A4)."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table,
    TableStyle, HRFlowable,
)

INK = HexColor("#1c1c22")
MUTE = HexColor("#5a5a66")
GOLD = HexColor("#a97f3f")
LINE = HexColor("#e3ddd2")
FAINT = HexColor("#8a8577")

W, H = A4
M = 13 * mm
COLGUT = 9 * mm

NAME = "Punja Bhattarai"
TAGLINE = "Developer · Designer · Creator"
CONTACT = [
    "Butwal, Rupandehi, Nepal",
    "bhattaraipunja@gmail.com",
    "+977 9863656463 / +977 9766798922",
    "github.com/Punja-Bhattarai",
    "linkedin.com/in/punja-bhattarai-396a5b3a0",
    "punjabhattarai.vercel.app",
]

S = {
    "name": ParagraphStyle("name", fontName="Helvetica-Bold", fontSize=23, leading=26, textColor=INK),
    "tag": ParagraphStyle("tag", fontName="Helvetica", fontSize=10.5, leading=14, textColor=GOLD),
    "contact": ParagraphStyle("contact", fontName="Helvetica", fontSize=8.6, leading=11.8, textColor=MUTE, alignment=TA_LEFT),
    "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=11.5, leading=14, textColor=INK, spaceBefore=0, spaceAfter=0),
    "body": ParagraphStyle("body", fontName="Helvetica", fontSize=9.0, leading=12.4, textColor=MUTE),
    "item": ParagraphStyle("item", fontName="Helvetica", fontSize=9.0, leading=12.6, textColor=INK),
    "sub": ParagraphStyle("sub", fontName="Helvetica-Oblique", fontSize=8.7, leading=11.8, textColor=MUTE),
    "meta": ParagraphStyle("meta", fontName="Helvetica", fontSize=8.5, leading=11.8, textColor=FAINT),
}


def section(title):
    return [
        Paragraph(title.upper(), S["h2"]),
        HRFlowable(width="100%", thickness=1.1, color=GOLD, spaceBefore=2, spaceAfter=4.5),
    ]


def entry(left_title, right_meta, sub=None, body=None):
    rows = [[Paragraph(f"<b>{left_title}</b>", S["item"]),
             Paragraph(right_meta, S["meta"])]]
    if sub:
        rows.append([Paragraph(sub, S["sub"]), ""])
    if body:
        rows.append([Paragraph(body, S["body"]), ""])
    t = Table(rows, colWidths=[(W - 2 * M - COLGUT) * 0.72, (W - 2 * M - COLGUT) * 0.28])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5),
    ]))
    return t


def bullet(text):
    return Paragraph(
        f'<font color="#a97f3f">▪</font>&nbsp;&nbsp;{text}', S["body"]
    )


story = []

# ── Header ────────────────────────────────────────────────────────────
header_left = [Paragraph(NAME, S["name"]), Spacer(1, 2), Paragraph(TAGLINE, S["tag"])]
contact_html = "<br/>".join(CONTACT)
header_tbl = Table(
    [[header_left, Paragraph(contact_html, S["contact"])]],
    colWidths=[(W - 2 * M) * 0.55, (W - 2 * M) * 0.45],
)
header_tbl.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
]))
story.append(header_tbl)
story.append(HRFlowable(width="100%", thickness=0.9, color=LINE, spaceBefore=8, spaceAfter=8))

# ── Profile ───────────────────────────────────────────────────────────
story += section("Profile")
story.append(Paragraph(
    "Second-year BSc (Hons) Computer Science student who enjoys turning ideas into working software — "
    "from clean user interfaces to the APIs and databases behind them. Focused on full-stack web "
    "development and interactive 3D experiences with Unity.",
    S["body"],
))
story.append(Spacer(1, 6))

# ── Education ────────────────────────────────────────────────────────
story += section("Education")
edu = [
    (
        "BSc (Hons) Computer Science",
        "2024 – Present",
        "Herald College Kathmandu · University of Wolverhampton (UK)",
        "Second year. Modules: programming, data structures, databases, networking, software engineering.",
    ),
    (
        "NEB Grade 12 (+2)",
        "2024",
        "Horizon English Boarding Secondary College",
        "National Examination Board (NEB) · GPA 3.35 / 4.00",
    ),
    (
        "Secondary Education Examination (SEE) — Class 10",
        "2023",
        "Horizon English Boarding Secondary School",
        "GPA 3.55 / 4.00",
    ),
    (
        "Basic Level Examination (BLE) — Grade 8",
        "2021",
        "Butwal Public School",
        "GPA 3.65 / 4.00",
    ),
]
for i, (title, meta, sub, body) in enumerate(edu):
    story.append(entry(title, meta, sub=sub, body=body))
    if i < len(edu) - 1:
        story.append(Spacer(1, 4))
story.append(Spacer(1, 6))

# ── Projects ─────────────────────────────────────────────────────────
story += section("Selected Projects")
projects = [
    (
        "Personal Portfolio &amp; Private Gallery Website",
        "Live · punjabhattarai.vercel.app",
        "<b>Next.js, TypeScript, React, Tailwind CSS, Supabase, PostgreSQL.</b> Full-stack site with a server-authenticated private gallery (guest passwords &amp; share links), admin dashboard, JWT auth and role-based access control.",
    ),
    (
        "Satyawati Trading &amp; Paints Suppliers — Business Website",
        "",
        "<b>HTML, CSS, JavaScript, PHP.</b> Online presence for a local paint supplier: product catalogue and customer enquiry handling.",
    ),
    (
        "Weather Application",
        "",
        "<b>JavaScript, REST API.</b> Weather app consuming a third-party API for live conditions and forecasts, with search and error states.",
    ),
    (
        "Jungle Safari — Unity 3D Experience",
        "",
        "<b>Unity, C#.</b> Interactive 3D environment with explorable terrain, character controllers and wildlife behaviours.",
    ),
]
for i, (title, meta, body) in enumerate(projects):
    story.append(entry(title, meta, body=body))
    if i < len(projects) - 1:
        story.append(Spacer(1, 4))
story.append(Spacer(1, 6))

# ── Skills ───────────────────────────────────────────────────────────
story += section("Technical Skills")
skills_rows = [
    ["Frontend", "HTML · CSS · JavaScript"],
    ["Programming", "Java · Python · C"],
    ["Backend &amp; APIs", "PHP · REST APIs · server-side fundamentals"],
    ["Databases", "PostgreSQL · Supabase"],
    ["Game Dev &amp; 3D", "Unity · C# · 3D modelling basics"],
    ["Tools &amp; Practices", "Git/GitHub · Vercel · responsive design · UI/UX fundamentals"],
]
sk = Table([[Paragraph(f"<b>{a}</b>", S["item"]), Paragraph(b, S["body"])] for a, b in skills_rows],
           colWidths=[(W - 2 * M - COLGUT) * 0.24, (W - 2 * M - COLGUT) * 0.76])
sk.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ("TOPPADDING", (0, 0), (-1, -1), 0),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
]))
story.append(sk)
story.append(Spacer(1, 6))

# ── Languages & Interests (two columns) ──────────────────────────────
col_w = (W - 2 * M - COLGUT) / 2
langs = section("Languages") + [
    bullet("<b>Nepali</b> — native"),
    bullet("<b>English</b> — fluent (medium of instruction since primary school)"),
]
ints = section("Interests") + [
    bullet("Photography &amp; visual storytelling"),
    bullet("Game development &amp; 3D design"),
    bullet("Open source &amp; UI/UX experimentation"),
]
two_col = Table([[langs, ints]], colWidths=[col_w + 4 * mm, col_w - 4 * mm])
two_col.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (0, 0), 0),
    ("LEFTPADDING", (1, 0), (1, 0), COLGUT),
    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
]))
story.append(two_col)


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.7)
    canvas.line(M, 13 * mm, W - M, 13 * mm)
    canvas.setFont("Helvetica", 7.6)
    canvas.setFillColor(FAINT)
    canvas.drawString(M, 9 * mm, "References available on request")
    canvas.drawRightString(W - M, 9 * mm, f"generated from punjabhattarai.vercel.app")
    canvas.restoreState()


doc = BaseDocTemplate(
    "public/cv/CV.pdf", pagesize=A4,
    leftMargin=M, rightMargin=M, topMargin=M, bottomMargin=16 * mm,
    title="Punja Bhattarai — CV", author="Punja Bhattarai",
)
frame = Frame(M, 16 * mm, W - 2 * M, H - M - 16 * mm, id="main",
              leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
doc.addPageTemplates([PageTemplate(id="page", frames=[frame], onPage=footer)])
doc.build(story)
print("✅ public/cv/CV.pdf generated")
