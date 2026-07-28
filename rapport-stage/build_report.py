from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Sequence

from PIL import Image
from docx import Document
from docx.enum.section import WD_ORIENT, WD_SECTION
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.table import WD_ALIGN_VERTICAL, WD_CELL_VERTICAL_ALIGNMENT, WD_ROW_HEIGHT_RULE, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Inches, Pt, RGBColor


ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "assets"
OUTPUT = ROOT / "rapport-stage-khelifl-mohamed-anas-version-finale-illustree.docx"

# Academic report A4 override, derived from the narrative_proposal preset.
# Page: A4 portrait; margins: 2.4 cm left/right, 2.2 cm top/bottom.
# Body: Calibri 10.5 pt, justified, 1.25 line spacing, 6 pt after.
# H1/H2/H3: 17/13.5/11.5 pt. Palette: navy #173A52, gold #C49A3A,
# charcoal #263238, muted #5C6770, light blue-gray #EAF0F4.
NAVY = "173A52"
GOLD = "C49A3A"
CHARCOAL = "263238"
MUTED = "5C6770"
LIGHT = "EAF0F4"
PALE_GOLD = "F7F1E2"
WHITE = "FFFFFF"
RED = "B73232"


def rgb(hex_value: str) -> RGBColor:
    return RGBColor.from_string(hex_value)


def set_repeat_table_header(row) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def prevent_row_split(row) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    cant_split = OxmlElement("w:cantSplit")
    tr_pr.append(cant_split)


def set_cell_shading(cell, fill: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_margins(cell, top=90, start=110, bottom=90, end=110) -> None:
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for margin_name, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{margin_name}"))
        if node is None:
            node = OxmlElement(f"w:{margin_name}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_cell_border(cell, **kwargs) -> None:
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_borders = tc_pr.first_child_found_in("w:tcBorders")
    if tc_borders is None:
        tc_borders = OxmlElement("w:tcBorders")
        tc_pr.append(tc_borders)
    for edge in ("top", "start", "bottom", "end", "insideH", "insideV"):
        if edge not in kwargs:
            continue
        tag = f"w:{edge}"
        edge_node = tc_borders.find(qn(tag))
        if edge_node is None:
            edge_node = OxmlElement(tag)
            tc_borders.append(edge_node)
        for key, value in kwargs[edge].items():
            edge_node.set(qn(f"w:{key}"), str(value))


def clear_table_borders(table) -> None:
    for row in table.rows:
        for cell in row.cells:
            set_cell_border(
                cell,
                top={"val": "nil"},
                start={"val": "nil"},
                bottom={"val": "nil"},
                end={"val": "nil"},
                insideH={"val": "nil"},
                insideV={"val": "nil"},
            )


def set_cell_width(cell, width_cm: float) -> None:
    cell.width = Cm(width_cm)
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_w = tc_pr.find(qn("w:tcW"))
    if tc_w is None:
        tc_w = OxmlElement("w:tcW")
        tc_pr.append(tc_w)
    # tcW expects twentieths of a point (dxa), not EMU.
    tc_w.set(qn("w:w"), str(int(round(width_cm * 1440 / 2.54))))
    tc_w.set(qn("w:type"), "dxa")


def set_run_language(run, lang: str = "fr-FR") -> None:
    r_pr = run._r.get_or_add_rPr()
    lang_el = r_pr.find(qn("w:lang"))
    if lang_el is None:
        lang_el = OxmlElement("w:lang")
        r_pr.append(lang_el)
    lang_el.set(qn("w:val"), lang)
    lang_el.set(qn("w:eastAsia"), lang)


def set_picture_alt_text(inline_shape, title: str, description: str) -> None:
    """Add meaningful accessibility metadata to an inline picture."""
    doc_pr = inline_shape._inline.docPr
    doc_pr.set("title", title)
    doc_pr.set("descr", description)


def configure_styles(doc: Document) -> None:
    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = rgb(CHARCOAL)
    normal.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    normal.paragraph_format.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    normal.paragraph_format.line_spacing = 1.25
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.widow_control = True

    h1 = styles["Heading 1"]
    h1.font.name = "Calibri"
    h1.font.size = Pt(17)
    h1.font.bold = True
    h1.font.color.rgb = rgb(NAVY)
    h1.paragraph_format.page_break_before = True
    h1.paragraph_format.keep_with_next = True
    h1.paragraph_format.space_before = Pt(0)
    h1.paragraph_format.space_after = Pt(10)

    h2 = styles["Heading 2"]
    h2.font.name = "Calibri"
    h2.font.size = Pt(13.5)
    h2.font.bold = True
    h2.font.color.rgb = rgb(NAVY)
    h2.paragraph_format.keep_with_next = True
    h2.paragraph_format.space_before = Pt(12)
    h2.paragraph_format.space_after = Pt(6)

    h3 = styles["Heading 3"]
    h3.font.name = "Calibri"
    h3.font.size = Pt(11.5)
    h3.font.bold = True
    h3.font.color.rgb = rgb(NAVY)
    h3.paragraph_format.keep_with_next = True
    h3.paragraph_format.space_before = Pt(9)
    h3.paragraph_format.space_after = Pt(4)

    if "Légende figure" not in styles:
        caption = styles.add_style("Légende figure", WD_STYLE_TYPE.PARAGRAPH)
    else:
        caption = styles["Légende figure"]
    caption.font.name = "Calibri"
    caption.font.size = Pt(8.5)
    caption.font.italic = True
    caption.font.color.rgb = rgb(MUTED)
    caption.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    caption.paragraph_format.space_before = Pt(3)
    caption.paragraph_format.space_after = Pt(7)
    caption.paragraph_format.keep_together = True

    if "Encadré" not in styles:
        callout = styles.add_style("Encadré", WD_STYLE_TYPE.PARAGRAPH)
    else:
        callout = styles["Encadré"]
    callout.font.name = "Calibri"
    callout.font.size = Pt(10)
    callout.font.color.rgb = rgb(CHARCOAL)
    callout.paragraph_format.space_after = Pt(0)
    callout.paragraph_format.line_spacing = 1.12
    callout.paragraph_format.keep_together = True

    if "Code technique" not in styles:
        code = styles.add_style("Code technique", WD_STYLE_TYPE.PARAGRAPH)
    else:
        code = styles["Code technique"]
    code.font.name = "Consolas"
    code.font.size = Pt(8.5)
    code.font.color.rgb = rgb(CHARCOAL)
    code.paragraph_format.left_indent = Cm(0.5)
    code.paragraph_format.right_indent = Cm(0.5)
    code.paragraph_format.space_after = Pt(3)


def configure_section(section, *, landscape: bool = False, page_size: str = "A4") -> None:
    section.different_first_page_header_footer = False
    if page_size == "A3":
        width, height = Cm(29.7), Cm(42.0)
    else:
        width, height = Cm(21.0), Cm(29.7)
    if landscape:
        section.orientation = WD_ORIENT.LANDSCAPE
        section.page_width = height
        section.page_height = width
    else:
        section.orientation = WD_ORIENT.PORTRAIT
        section.page_width = width
        section.page_height = height
    section.left_margin = Cm(2.4)
    section.right_margin = Cm(2.4)
    section.top_margin = Cm(2.2)
    section.bottom_margin = Cm(2.0)
    section.header_distance = Cm(1.0)
    section.footer_distance = Cm(0.9)


def set_page_number_format(section, fmt: str | None = None, start: int | None = None) -> None:
    sect_pr = section._sectPr
    pg_num = sect_pr.find(qn("w:pgNumType"))
    if pg_num is None:
        pg_num = OxmlElement("w:pgNumType")
        sect_pr.append(pg_num)
    if fmt:
        pg_num.set(qn("w:fmt"), fmt)
    if start is not None:
        pg_num.set(qn("w:start"), str(start))


def add_field(paragraph, field_code: str, placeholder: str = ""):
    run = paragraph.add_run()
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = field_code
    separate = OxmlElement("w:fldChar")
    separate.set(qn("w:fldCharType"), "separate")
    text_node = OxmlElement("w:t")
    text_node.text = placeholder
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    run._r.extend([begin, instr, separate, text_node, end])
    return run


def configure_header_footer(section, *, show_header: bool = True) -> None:
    section.header.is_linked_to_previous = False
    section.footer.is_linked_to_previous = False
    header = section.header
    footer = section.footer
    for p in list(header.paragraphs)[1:]:
        p._element.getparent().remove(p._element)
    hp = header.paragraphs[0]
    hp.clear()
    if show_header:
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r = hp.add_run("RAPPORT DE STAGE D’ÉTÉ  •  SSE — CNI")
        r.font.name = "Calibri"
        r.font.size = Pt(8)
        r.font.bold = True
        r.font.color.rgb = rgb(NAVY)
        p_pr = hp._p.get_or_add_pPr()
        p_bdr = OxmlElement("w:pBdr")
        bottom = OxmlElement("w:bottom")
        bottom.set(qn("w:val"), "single")
        bottom.set(qn("w:sz"), "8")
        bottom.set(qn("w:space"), "4")
        bottom.set(qn("w:color"), GOLD)
        p_bdr.append(bottom)
        p_pr.append(p_bdr)

    for p in list(footer.paragraphs)[1:]:
        p._element.getparent().remove(p._element)
    fp = footer.paragraphs[0]
    fp.clear()
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    rr = fp.add_run("Khelifl Mohamed Anas  •  2025–2026  •  ")
    rr.font.name = "Calibri"
    rr.font.size = Pt(8)
    rr.font.color.rgb = rgb(MUTED)
    pg = add_field(fp, "PAGE", "1")
    pg.font.name = "Calibri"
    pg.font.size = Pt(8)
    pg.font.color.rgb = rgb(MUTED)


def add_title(doc: Document, text: str, *, level: int = 1) -> None:
    p = doc.add_paragraph(style=f"Heading {level}")
    p.add_run(text)


def add_body(doc: Document, text: str, *, bold_lead: str | None = None) -> None:
    p = doc.add_paragraph()
    if bold_lead and text.startswith(bold_lead):
        p.add_run(bold_lead).bold = True
        p.add_run(text[len(bold_lead):])
    else:
        p.add_run(text)
    for run in p.runs:
        set_run_language(run)


def add_bullets(doc: Document, items: Iterable[str], *, numbered: bool = False) -> None:
    for index, item in enumerate(items, start=1):
        p = doc.add_paragraph(style="Normal" if numbered else "List Bullet")
        p.paragraph_format.space_after = Pt(2.5)
        p.paragraph_format.left_indent = Cm(0.75)
        p.paragraph_format.first_line_indent = Cm(-0.35)
        p.paragraph_format.keep_together = True
        p.add_run(f"{index}. {item}" if numbered else item)
        for run in p.runs:
            set_run_language(run)


def add_table(doc: Document, headers: Sequence[str], rows: Sequence[Sequence[str]], widths: Sequence[float] | None = None, font_size: float = 8.7):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table.style = "Table Grid"
    header = table.rows[0]
    set_repeat_table_header(header)
    prevent_row_split(header)
    for i, value in enumerate(headers):
        cell = header.cells[i]
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        set_cell_shading(cell, NAVY)
        set_cell_margins(cell)
        if widths:
            set_cell_width(cell, widths[i])
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(0)
        run = p.add_run(value)
        run.bold = True
        run.font.color.rgb = rgb(WHITE)
        run.font.size = Pt(font_size)
    for r_idx, values in enumerate(rows):
        row = table.add_row()
        prevent_row_split(row)
        for i, value in enumerate(values):
            cell = row.cells[i]
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            set_cell_margins(cell)
            if widths:
                set_cell_width(cell, widths[i])
            if r_idx % 2 == 1:
                set_cell_shading(cell, "F6F8FA")
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.05
            for line_idx, line in enumerate(str(value).split("\n")):
                if line_idx:
                    p.add_run().add_break()
                run = p.add_run(line)
                run.font.size = Pt(font_size)
                set_run_language(run)
    doc.add_paragraph().paragraph_format.space_after = Pt(0)
    return table


def add_callout(doc: Document, title: str, text: str, *, fill: str = LIGHT, accent: str = NAVY) -> None:
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    cell = table.cell(0, 0)
    set_cell_width(cell, 15.6)
    set_cell_shading(cell, fill)
    set_cell_margins(cell, top=150, start=170, bottom=150, end=170)
    set_cell_border(
        cell,
        start={"val": "single", "sz": "22", "color": accent},
        top={"val": "single", "sz": "4", "color": fill},
        bottom={"val": "single", "sz": "4", "color": fill},
        end={"val": "single", "sz": "4", "color": fill},
    )
    p = cell.paragraphs[0]
    p.style = doc.styles["Encadré"]
    r = p.add_run(title.upper() + "  ")
    r.bold = True
    r.font.color.rgb = rgb(accent)
    p.add_run(text)
    prevent_row_split(table.rows[0])
    doc.add_paragraph().paragraph_format.space_after = Pt(0)


def add_figure(doc: Document, filename: str, caption: str, *, width_cm: float | None = None, height_cm: float | None = None) -> None:
    path = ASSETS / filename
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.keep_with_next = True
    run = p.add_run()
    if height_cm is not None:
        picture = run.add_picture(str(path), height=Cm(height_cm))
    else:
        picture = run.add_picture(str(path), width=Cm(width_cm or 15.6))
    figure_title = caption.split("—", 1)[0].strip()
    set_picture_alt_text(picture, figure_title, caption)
    cp = doc.add_paragraph(style="Légende figure")
    cp.add_run(caption)


def add_technology_grid(doc: Document) -> None:
    technologies = [
        ("technologies/react.jpg", "React", "Interface web"),
        ("technologies/typescript.jpg", "TypeScript", "Typage du front-end"),
        ("technologies/vite.jpg", "Vite", "Construction et développement"),
        ("technologies/tailwindcss.jpg", "Tailwind CSS", "Design responsive"),
        ("technologies/springboot.jpg", "Spring Boot", "API et règles métier"),
        ("technologies/postgresql.jpg", "PostgreSQL", "Persistance des données"),
        ("technologies/docker.jpg", "Docker", "Conteneurisation"),
        ("technologies/nginx.jpg", "Nginx", "Serveur web et proxy"),
        ("technologies/git.jpg", "Git", "Versionnement du code"),
    ]
    table = doc.add_table(rows=3, cols=3)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    for index, (filename, name, role) in enumerate(technologies):
        row = table.rows[index // 3]
        prevent_row_split(row)
        cell = row.cells[index % 3]
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        set_cell_width(cell, 5.2)
        set_cell_shading(cell, "F8FAFC")
        set_cell_margins(cell, top=105, start=95, bottom=105, end=95)
        set_cell_border(
            cell,
            top={"val": "single", "sz": "5", "color": "D9E2E8"},
            bottom={"val": "single", "sz": "5", "color": "D9E2E8"},
            start={"val": "single", "sz": "5", "color": "D9E2E8"},
            end={"val": "single", "sz": "5", "color": "D9E2E8"},
        )
        picture_paragraph = cell.paragraphs[0]
        picture_paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        picture_paragraph.paragraph_format.space_after = Pt(2)
        picture = picture_paragraph.add_run().add_picture(str(ASSETS / filename), height=Cm(1.2))
        set_picture_alt_text(
            picture,
            f"Logo {name}",
            f"Logo de {name}, technologie utilisée dans la plateforme SSE pour : {role.lower()}.",
        )
        name_paragraph = cell.add_paragraph()
        name_paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        name_paragraph.paragraph_format.space_after = Pt(0)
        name_run = name_paragraph.add_run(name)
        name_run.font.name = "Calibri"
        name_run.font.size = Pt(9)
        name_run.font.bold = True
        name_run.font.color.rgb = rgb(NAVY)
        role_paragraph = cell.add_paragraph()
        role_paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        role_paragraph.paragraph_format.space_after = Pt(0)
        role_run = role_paragraph.add_run(role)
        role_run.font.name = "Calibri"
        role_run.font.size = Pt(7.5)
        role_run.font.color.rgb = rgb(MUTED)
    caption = doc.add_paragraph(style="Légende figure")
    caption.add_run("Figure 13 — Écosystème technologique principal de la plateforme SSE. Icônes : Icons8 [16].")


def add_page_break(doc: Document) -> None:
    doc.add_page_break()


def add_toc(doc: Document) -> None:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    add_field(p, 'TOC \\o "1-2" \\h \\z \\u', "Mettre à jour la table des matières dans Word si nécessaire.")
    settings = doc.settings._element
    update = settings.find(qn("w:updateFields"))
    if update is None:
        update = OxmlElement("w:updateFields")
        settings.append(update)
    update.set(qn("w:val"), "true")


def add_section_break(doc: Document, *, landscape: bool = False, page_size: str = "A4", page_number_format: str | None = None, start: int | None = None):
    section = doc.add_section(WD_SECTION.NEW_PAGE)
    configure_section(section, landscape=landscape, page_size=page_size)
    configure_header_footer(section)
    if page_number_format or start is not None:
        set_page_number_format(section, page_number_format, start)
    else:
        # python-docx clones the previous section properties, including a page
        # number start value. Remove the clone so numbering continues naturally.
        pg_num = section._sectPr.find(qn("w:pgNumType"))
        if pg_num is not None:
            section._sectPr.remove(pg_num)
    return section


def add_cover(doc: Document) -> None:
    section = doc.sections[0]
    configure_section(section)
    section.different_first_page_header_footer = True
    section.header.is_linked_to_previous = False
    section.footer.is_linked_to_previous = False

    logos = doc.add_table(rows=1, cols=2)
    logos.alignment = WD_TABLE_ALIGNMENT.CENTER
    logos.autofit = False
    clear_table_borders(logos)
    left, right = logos.rows[0].cells
    set_cell_width(left, 7.8)
    set_cell_width(right, 7.8)
    left.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    right.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    left.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
    right.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
    set_cell_margins(left, top=60, start=80, bottom=60, end=80)
    set_cell_margins(right, top=60, start=80, bottom=60, end=80)
    esprit_logo = left.paragraphs[0].add_run().add_picture(
        str(Path(r"C:\Users\BiGGGi\AppData\Local\Temp\codex-clipboard-0f9bdf9e-c65b-42ea-a76d-b60f4655fe45.png")),
        width=Cm(7.1),
    )
    set_picture_alt_text(
        esprit_logo,
        "Logo ESPRIT",
        "Logo de l’École supérieure privée d’ingénierie et de technologies (ESPRIT).",
    )
    cni_logo = right.paragraphs[0].add_run().add_picture(
        str(Path(r"C:\Users\BiGGGi\Desktop\images.jpg")),
        width=Cm(3.15),
    )
    set_picture_alt_text(
        cni_logo,
        "Logo du CNI",
        "Logo du Centre National de l’Informatique (CNI), organisme d’accueil du stage.",
    )

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(22)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("RAPPORT DE STAGE D’ÉTÉ")
    r.font.name = "Calibri"
    r.font.size = Pt(16)
    r.font.bold = True
    r.font.color.rgb = rgb(GOLD)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(7)
    p.paragraph_format.space_after = Pt(8)
    r = p.add_run("Conception, réalisation et déploiement d’une\nplateforme de suivi et d’évaluation\nde la bonne gouvernance")
    r.font.name = "Calibri"
    r.font.size = Pt(25)
    r.font.bold = True
    r.font.color.rgb = rgb(NAVY)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_pr = p._p.get_or_add_pPr()
    p_bdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "20")
    bottom.set(qn("w:color"), GOLD)
    p_bdr.append(bottom)
    p_pr.append(p_bdr)

    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    subtitle.paragraph_format.space_before = Pt(10)
    rr = subtitle.add_run("Projet SSE — Système de Suivi et d’Évaluation")
    rr.font.size = Pt(13)
    rr.font.bold = True
    rr.font.color.rgb = rgb(CHARCOAL)

    info = doc.add_table(rows=5, cols=2)
    info.alignment = WD_TABLE_ALIGNMENT.CENTER
    info.autofit = False
    clear_table_borders(info)
    labels = [
        ("Réalisé par", "Khelifl Mohamed Anas"),
        ("Formation", "1ère année du cycle ingénieur"),
        ("Organisme d’accueil", "CNI — Centre National de l’Informatique"),
        ("Encadrant entreprise", "M. Imed Zaier"),
        ("Période", "Du 12 juin 2026 au 30 juillet 2026"),
    ]
    for row, (label, value) in zip(info.rows, labels):
        prevent_row_split(row)
        set_cell_width(row.cells[0], 5.1)
        set_cell_width(row.cells[1], 10.5)
        for cell in row.cells:
            set_cell_margins(cell, top=80, start=100, bottom=80, end=100)
        p0 = row.cells[0].paragraphs[0]
        p0.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r0 = p0.add_run(label.upper())
        r0.font.size = Pt(8)
        r0.font.bold = True
        r0.font.color.rgb = rgb(MUTED)
        p1 = row.cells[1].paragraphs[0]
        r1 = p1.add_run(value)
        r1.font.size = Pt(10.5)
        r1.font.bold = True
        r1.font.color.rgb = rgb(CHARCOAL)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(18)
    r = p.add_run("Année universitaire 2025–2026")
    r.font.size = Pt(12)
    r.font.bold = True
    r.font.color.rgb = rgb(NAVY)


def add_front_matter(doc: Document) -> None:
    add_section_break(doc, page_number_format="lowerRoman", start=1)

    p = doc.add_paragraph()
    p.style = doc.styles["Title"]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    heading_run = p.add_run("Remerciements")
    heading_run.font.name = "Garamond"
    heading_run.font.size = Pt(24)
    heading_run.font.bold = True
    for text in [
        "Je tiens à exprimer ma profonde gratitude à l’ensemble des personnes qui ont contribué au bon déroulement de ce stage d’été et à la réalisation du projet présenté dans ce rapport.",
        "Je remercie tout particulièrement M. Imed Zaier, mon encadrant au Centre National de l’Informatique, pour son accueil, sa disponibilité et ses orientations. Ses retours m’ont permis de mieux comprendre les exigences d’une application institutionnelle et d’adopter une démarche de travail structurée, attentive à la sécurité, à la traçabilité et à l’expérience des utilisateurs.",
        "Mes remerciements s’adressent également aux équipes du CNI pour le cadre professionnel offert, ainsi qu’aux enseignants d’ESPRIT pour les connaissances méthodologiques et techniques mobilisées pendant cette expérience. Enfin, je remercie ma famille et mes proches pour leur soutien constant.",
    ]:
        thanks = doc.add_paragraph()
        thanks.alignment = WD_ALIGN_PARAGRAPH.CENTER
        thanks.paragraph_format.line_spacing = 1.3
        thanks.paragraph_format.space_after = Pt(10)
        thanks.paragraph_format.left_indent = Cm(1.1)
        thanks.paragraph_format.right_indent = Cm(1.1)
        run = thanks.add_run(text)
        run.font.name = "Garamond"
        run.font.size = Pt(11.5)
        set_run_language(run)

    add_page_break(doc)
    p = doc.add_paragraph()
    p.style = doc.styles["Title"]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run("Résumé")
    add_body(doc, "Ce rapport présente la conception, la réalisation et le déploiement d’une plateforme web de suivi et d’évaluation de la bonne gouvernance, développée dans le cadre d’un stage d’été effectué au Centre National de l’Informatique. La solution, appelée SSE, structure un processus complet allant de la création des comptes et des organismes jusqu’à la validation des évaluations, au calcul des scores et à la consultation d’indicateurs gouvernementaux.")
    add_body(doc, "La plateforme repose sur une architecture en couches. Le front-end est développé avec React et TypeScript, tandis que le back-end utilise Spring Boot et expose une API REST sécurisée par des jetons JWT. PostgreSQL assure la persistance des données. L’ensemble est conteneurisé avec Docker Compose et déployé sur une instance Ubuntu dans Amazon EC2.")
    add_body(doc, "Le travail a porté sur la modélisation fonctionnelle et UML, la consolidation du workflow d’évaluation, l’amélioration de l’interface et de l’expérience utilisateur, la gestion multilingue propre à chaque compte, l’ajout de justificatifs, les notifications, les exports, les contrôles d’accès et la traçabilité. Une attention particulière a été accordée aux parcours des quatre profils : administrateur, utilisateur, évaluateur et gouvernement.")
    add_callout(doc, "Mots-clés", "bonne gouvernance, évaluation, Spring Boot, React, PostgreSQL, JWT, Docker, AWS EC2, expérience utilisateur, UML", fill=PALE_GOLD, accent=GOLD)

    add_page_break(doc)
    p = doc.add_paragraph()
    p.style = doc.styles["Title"]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run("Fiche signalétique du stage")
    add_table(
        doc,
        ["Rubrique", "Information"],
        [
            ("Stagiaire", "Khelifl Mohamed Anas"),
            ("Établissement", "ESPRIT — École Supérieure Privée d’Ingénierie et de Technologies"),
            ("Niveau", "1ère année du cycle ingénieur"),
            ("Année universitaire", "2025–2026"),
            ("Nature du stage", "Stage d’été"),
            ("Organisme d’accueil", "CNI — Centre National de l’Informatique"),
            ("Encadrant entreprise", "M. Imed Zaier"),
            ("Encadrant académique", "À compléter par l’établissement"),
            ("Période", "12 juin 2026 – 30 juillet 2026"),
            ("Sujet", "Conception, réalisation et déploiement d’une plateforme de suivi et d’évaluation de la bonne gouvernance"),
        ],
        widths=[4.6, 11.0],
        font_size=9,
    )

    add_page_break(doc)
    p = doc.add_paragraph()
    p.style = doc.styles["Title"]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run("Liste des abréviations")
    add_table(
        doc,
        ["Abréviation", "Signification"],
        [
            ("API", "Application Programming Interface"),
            ("AWS", "Amazon Web Services"),
            ("CNI", "Centre National de l’Informatique"),
            ("CORS", "Cross-Origin Resource Sharing"),
            ("DTO", "Data Transfer Object"),
            ("EC2", "Elastic Compute Cloud"),
            ("HTTP", "Hypertext Transfer Protocol"),
            ("JPA", "Java Persistence API"),
            ("JWT", "JSON Web Token"),
            ("REST", "Representational State Transfer"),
            ("SSE", "Système de Suivi et d’Évaluation"),
            ("UML", "Unified Modeling Language"),
            ("UX / UI", "User Experience / User Interface"),
        ],
        widths=[3.5, 12.1],
    )

    add_page_break(doc)
    p = doc.add_paragraph()
    p.style = doc.styles["Title"]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run("Table des matières")
    add_toc(doc)

    add_page_break(doc)
    p = doc.add_paragraph()
    p.style = doc.styles["Title"]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run("Liste des figures")
    figures = [
        "Figure 1 — Campus d’ESPRIT",
        "Figure 2 — Siège du Centre National de l’Informatique",
        "Figures 3 à 6 — Cas d’utilisation par rôle",
        "Figure 7 — Architecture applicative en couches",
        "Figure 8 — Diagramme de classes du domaine SSE",
        "Figures 9 à 12 — Séquences de remplissage, soumission, validation et correction",
        "Figure 13 — Écosystème technologique principal",
        "Figure 14 — Tableau de bord administrateur",
        "Figure 15 — Interface de revue des critères",
        "Figure 16 — Tableau de bord utilisateur",
        "Figure 17 — File de validation de l’évaluateur",
        "Figure 18 — Tableau de bord gouvernemental",
        "Figure 19 — Architecture de déploiement",
    ]
    add_bullets(doc, figures)


def add_main_report(doc: Document) -> None:
    add_section_break(doc, page_number_format="decimal", start=1)
    add_title(doc, "Introduction générale", level=1)
    add_body(doc, "La transformation numérique des administrations et des organismes publics ne se limite plus à la dématérialisation de formulaires. Elle implique la mise en place de systèmes capables de structurer l’information, de sécuriser les échanges, d’assurer la traçabilité des décisions et de produire des indicateurs fiables. Dans ce contexte, l’évaluation de la bonne gouvernance constitue un exercice particulièrement exigeant : elle combine un référentiel détaillé, des preuves documentaires, une appréciation par critère, des échanges de correction et une décision finale." )
    add_body(doc, "Le projet SSE répond à ce besoin par une plateforme web multi-profils. Un organisme peut renseigner son auto-évaluation et joindre les justificatifs nécessaires. Un évaluateur examine chaque réponse, valide, rejette ou demande une correction. L’administrateur supervise les comptes, le référentiel, les évaluations et les opérations système. Le profil gouvernement dispose, quant à lui, d’une vue consolidée orientée vers les indicateurs et le classement, sans intervenir dans le remplissage des évaluations.")
    add_body(doc, "Le stage réalisé au Centre National de l’Informatique a consisté à analyser ce domaine, à consolider une base applicative existante, à corriger plusieurs défauts fonctionnels et visuels, à améliorer les parcours utilisateurs et à préparer une version déployable. La démarche adoptée a combiné étude du code, modélisation UML, développement itératif, tests ciblés, vérification sur l’environnement déployé et documentation.")

    add_title(doc, "Problématique", level=2)
    add_callout(doc, "Question directrice", "Comment concevoir une plateforme institutionnelle qui rende l’évaluation de la bonne gouvernance à la fois rigoureuse, traçable, sécurisée et simple à utiliser pour des profils aux responsabilités très différentes ?")
    add_body(doc, "Cette problématique se décline en plusieurs enjeux. Le référentiel doit être maintenable et multilingue. Le workflow doit empêcher une validation incomplète ou concurrente. Les preuves doivent être rattachées au bon critère. Les données d’un organisme doivent rester isolées de celles des autres. Enfin, l’interface doit rester lisible malgré un volume important de principes, de bonnes pratiques et de critères.")

    add_title(doc, "Objectifs du stage", level=2)
    add_bullets(doc, [
        "formaliser le métier, ses acteurs, ses règles et ses états ;",
        "stabiliser l’architecture full-stack et sécuriser l’accès aux ressources ;",
        "fluidifier le cycle remplir – soumettre – examiner – corriger – valider ;",
        "réaliser une refonte UI/UX cohérente, responsive et multilingue ;",
        "tester les parcours critiques, vérifier le déploiement et documenter la solution.",
    ])

    add_body(doc, "Le rapport suit le cheminement du projet — contexte et besoins, conception, réalisation, tests et déploiement — avant de présenter mon bilan et les évolutions encore possibles.", bold_lead="Le rapport")


def add_chapter_1(doc: Document) -> None:
    add_title(doc, "Chapitre 1 — Cadre du stage et étude de l’existant", level=1)
    add_body(doc, "Ce chapitre situe le stage dans son environnement académique et professionnel. Il présente l’établissement de formation, l’organisme d’accueil, le contexte du projet SSE et la démarche suivie pour transformer une base applicative en une solution cohérente, testable et déployable.")

    add_title(doc, "1.1 Présentation d’ESPRIT", level=2)
    add_body(doc, "ESPRIT est un établissement d’enseignement supérieur spécialisé dans les domaines de l’ingénierie et des technologies. L’école met en avant une pédagogie active fondée sur les projets et les problèmes, qui place l’étudiant dans des situations proches du travail en entreprise. Cette approche encourage l’autonomie, la collaboration, l’analyse des besoins et la production de livrables vérifiables [3].")
    add_body(doc, "La première année du cycle ingénieur consolide les bases scientifiques et techniques tout en développant la capacité à structurer un projet. Le stage d’été complète cette formation par une immersion professionnelle. Il permet de confronter les acquis académiques à des contraintes réelles : continuité d’un code existant, sécurité, qualité de données, expérience utilisateur, déploiement et communication avec un encadrant.")
    add_figure(doc, "photo-campus-esprit.jpg", "Figure 1 — Campus d’ESPRIT à l’Ariana. Source : ESPRIT, visite virtuelle [11].", width_cm=13.8)

    add_title(doc, "1.2 Présentation du Centre National de l’Informatique", level=2)
    add_body(doc, "Le Centre National de l’Informatique est un établissement public tunisien créé le 30 décembre 1975. Doté de la personnalité civile et de l’autonomie financière, il est placé sous la tutelle du ministère chargé des technologies de la communication. Sa mission générale consiste à accompagner l’administration et les organismes publics dans l’utilisation des technologies de l’information [1].")
    add_body(doc, "Le CNI intervient dans des domaines qui exigent fiabilité, continuité de service et gouvernance des données. Son site institutionnel présente notamment des activités d’accompagnement, de formation et d’accueil de stagiaires. Le centre indique recevoir environ deux cents stagiaires par an, ce qui témoigne d’un rôle actif dans l’insertion et le développement des compétences des étudiants [2].")
    add_callout(doc, "Repère institutionnel", "Le CNI annonce une démarche qualité certifiée ISO 9001:2015. Cette culture de processus et de traçabilité est cohérente avec la nature du projet SSE, qui formalise les étapes d’évaluation et conserve l’historique des actions [1].", fill=PALE_GOLD, accent=GOLD)
    add_figure(doc, "photo-siege-cni.jpg", "Figure 2 — Siège du Centre National de l’Informatique à Tunis. Source : Leaders [12].", width_cm=13.8)

    add_title(doc, "1.3 Cadre et sujet du stage", level=2)
    add_body(doc, "Le stage s’est déroulé du 12 juin au 30 juillet 2026 sous l’encadrement de M. Imed Zaier. Le sujet retenu porte sur une plateforme de suivi et d’évaluation de la bonne gouvernance. L’application doit soutenir plusieurs usages : administrer les organismes et les comptes, guider l’auto-évaluation, centraliser les preuves, organiser la revue par un évaluateur, calculer des scores et présenter une vue de pilotage.")
    add_body(doc, "Le projet existait sous la forme d’un dépôt full-stack comprenant un back-end Spring Boot, un front-end React et une configuration Docker. L’étude initiale a montré que les composants essentiels étaient présents, mais que plusieurs points devaient être consolidés : cohérence des rôles, sécurité des ressources, transitions de statut, concurrence entre évaluateurs, traduction, formulaires incomplets, défauts d’affichage et déploiement reproductible.")

    add_title(doc, "1.4 Analyse de l’existant", level=2)
    add_table(
        doc,
        ["Domaine", "État observé", "Besoin de consolidation"],
        [
            ("Architecture", "Application React, API Spring Boot et PostgreSQL déjà structurées.", "Clarifier les responsabilités des couches et fiabiliser la configuration par environnement."),
            ("Authentification", "Connexion JWT et rôles disponibles.", "Renforcer les contrôles d’accès sur les ressources appartenant aux organismes."),
            ("Évaluation", "Principes, bonnes pratiques, critères et réponses modélisés.", "Sécuriser les transitions, la complétude, le verrou de validation et les corrections ciblées."),
            ("Interface", "Écrans fonctionnels mais hétérogènes.", "Améliorer navigation, responsive design, modales, formulaires, contrastes et feedbacks."),
            ("Internationalisation", "Français, arabe et anglais présents.", "Rendre la langue persistante par compte et gérer correctement la direction RTL."),
            ("Exploitation", "Docker Compose disponible.", "Valider la chaîne de construction et le déploiement sur Ubuntu/EC2."),
        ],
        widths=[3.0, 6.0, 6.6],
        font_size=8.4,
    )

    add_title(doc, "1.5 Démarche de travail", level=2)
    add_body(doc, "La démarche adoptée est incrémentale. Chaque évolution commence par l’observation du comportement ou la lecture du code concerné, puis par l’identification de la règle métier. La modification est ensuite réalisée sur une branche dédiée, vérifiée localement et, pour les parcours visuels, contrôlée sur l’application déployée. Les versions importantes sont sauvegardées dans Git afin de conserver un point de retour.")
    add_table(
        doc,
        ["Période", "Phase", "Livrables principaux"],
        [
            ("12–19 juin", "Prise en main", "Inventaire du dépôt, étude des rôles, du modèle et des parcours."),
            ("20–30 juin", "Spécification et conception", "Besoins, règles métier, diagrammes UML et architecture cible."),
            ("1–10 juillet", "Consolidation back-end", "Sécurité, workflow, scoring, notifications, audit et tests."),
            ("11–22 juillet", "Refonte front-end", "Navigation, interfaces par rôle, responsive design, i18n et formulaires."),
            ("23–27 juillet", "Intégration et déploiement", "Docker Compose, vérifications sur Ubuntu/EC2 et corrections finales."),
            ("28–30 juillet", "Documentation et transfert", "Rapport, synthèse technique et recommandations d’exploitation."),
        ],
        widths=[2.7, 4.0, 8.9],
        font_size=8.5,
    )

    add_title(doc, "1.6 Résultats attendus", level=2)
    add_bullets(doc, [
        "une application cohérente pour les quatre rôles définis ;",
        "un cycle d’évaluation contrôlé, avec justificatifs et corrections ciblées ;",
        "des indicateurs et exports exploitables après validation ;",
        "une interface moderne, lisible sur différentes tailles d’écran et disponible en plusieurs langues ;",
        "une version conteneurisée, sauvegardée dans Git et déployable sur un serveur Ubuntu.",
    ])
    add_body(doc, "Le chapitre suivant traduit ces résultats attendus en spécifications fonctionnelles et non fonctionnelles.")


def add_chapter_2(doc: Document) -> None:
    add_title(doc, "Chapitre 2 — Spécification des besoins", level=1)
    add_body(doc, "La spécification vise à établir un langage commun entre le métier et la réalisation technique. Elle délimite les responsabilités de chaque acteur, les cas d’utilisation, les règles de gestion et les qualités attendues de la solution.")

    add_title(doc, "2.1 Identification des acteurs", level=2)
    add_table(
        doc,
        ["Acteur", "Responsabilités", "Limites principales"],
        [
            ("Administrateur", "Gère les utilisateurs, organismes, demandes de compte, référentiel, évaluations, notifications, réclamations, audit et courriels.", "N’agit pas à la place d’un organisme pour produire ses preuves, sauf opération exceptionnelle contrôlée."),
            ("Utilisateur", "Représente un organisme, crée ou ouvre une évaluation, renseigne les niveaux, commentaires et justificatifs, puis soumet ou corrige.", "N’accède qu’aux données de son organisme et ne valide pas les résultats."),
            ("Évaluateur", "Consulte la file de travail, prend une évaluation en charge, examine les réponses, valide, rejette ou demande une correction.", "Ne modifie pas l’identité des organismes ni le référentiel administratif."),
            ("Gouvernement", "Consulte les indicateurs consolidés et le classement des organismes évalués.", "Ne remplit pas et ne valide pas les évaluations."),
        ],
        widths=[2.8, 7.2, 5.6],
        font_size=8.4,
    )
    add_callout(doc, "Règle commune", "Les quatre acteurs peuvent se connecter à l’application. La navigation et les données visibles sont ensuite adaptées au rôle et aux autorisations du compte.")

    add_title(doc, "2.2 Besoins fonctionnels", level=2)
    add_title(doc, "2.2.1 Gestion des comptes et organismes", level=3)
    add_bullets(doc, [
        "permettre à un organisme de déposer une demande de compte complète, incluant coordonnées, secteur, fonction, télécopie et logo ;",
        "permettre à l’administrateur d’examiner, d’approuver ou de rejeter une demande ;",
        "créer l’organisme et son utilisateur principal après approbation, puis envoyer un parcours d’activation ;",
        "gérer l’état actif, le statut, le rôle et la version de jeton d’un utilisateur ;",
        "agrandir le logo d’un organisme depuis les listes ou les fiches détaillées afin d’en faciliter la vérification.",
    ])

    add_title(doc, "2.2.2 Gestion du référentiel", level=3)
    add_body(doc, "Le référentiel est organisé en principes, bonnes pratiques et critères. Chaque élément peut disposer de libellés dans plusieurs langues. Les critères contiennent les indications de preuves attendues et les références utiles. L’administrateur doit pouvoir maintenir ce référentiel sans modifier le code de l’application.")

    add_title(doc, "2.2.3 Cycle d’évaluation", level=3)
    add_bullets(doc, [
        "créer au maximum une évaluation pertinente par organisme et par année selon les règles métier ;",
        "sauvegarder progressivement le niveau N0 à N3, le commentaire, les liens et les fichiers justificatifs de chaque critère ;",
        "vérifier la complétude avant soumission et signaler précisément les éléments manquants ;",
        "autoriser un évaluateur à prendre en charge une validation et empêcher deux personnes de modifier simultanément le même dossier ;",
        "enregistrer une décision par réponse : validée, rejetée ou à corriger ;",
        "rouvrir uniquement les critères ciblés, conserver le motif et contrôler leur traitement avant resoumission ;",
        "calculer les scores et la maturité uniquement lorsque toutes les décisions nécessaires sont prises.",
    ])

    add_title(doc, "2.2.4 Pilotage et fonctions transverses", level=3)
    add_bullets(doc, [
        "afficher des tableaux de bord adaptés à chaque rôle ;",
        "notifier les acteurs lors des soumissions, corrections et validations ;",
        "proposer une diffusion en temps réel des notifications par flux SSE ;",
        "exporter les résultats en PDF et certaines données en Excel ;",
        "journaliser les opérations sensibles et suivre la file de courriels ;",
        "gérer les réclamations et les réponses administratives ;",
        "mémoriser la langue par compte, indépendamment du compte précédemment ouvert dans le même navigateur.",
    ])

    add_title(doc, "2.3 Diagramme de cas d’utilisation", level=2)
    add_body(doc, "Pour améliorer la lisibilité, le diagramme global est décomposé en quatre vues, une par rôle. Chaque vue conserve uniquement les interactions utiles à l’acteur concerné. Les relations « include » représentent un comportement obligatoire réutilisé, par exemple le contrôle de complétude lors d’une soumission. Les relations « extend » représentent un scénario conditionnel, comme l’ajout d’un justificatif ou la création d’un organisme après approbation.")

    for filename, title, caption, height, interpretation in [
        (
            "usecase-administrateur.png",
            "CAS D’UTILISATION — ADMINISTRATEUR",
            "Figure 3 — Cas d’utilisation de l’administrateur.",
            14.5,
            "L’administrateur centralise la gestion des comptes, du référentiel et du suivi. La création d’un organisme n’intervient qu’après l’approbation d’une demande.",
        ),
        (
            "usecase-utilisateur.png",
            "CAS D’UTILISATION — UTILISATEUR",
            "Figure 4 — Cas d’utilisation de l’utilisateur responsable d’un organisme.",
            20.5,
            "L’utilisateur conduit l’auto-évaluation de son organisme, depuis l’accès au compte jusqu’à l’export. La complétude et les corrections sont obligatoirement vérifiées avant chaque soumission.",
        ),
        (
            "usecase-evaluateur.png",
            "CAS D’UTILISATION — ÉVALUATEUR",
            "Figure 5 — Cas d’utilisation de l’évaluateur.",
            12.7,
            "L’évaluateur prend en charge un dossier, examine les preuves et décide chaque réponse. La décision finale exige que tous les critères soient traités avant le calcul du score.",
        ),
        (
            "usecase-gouvernement.png",
            "CAS D’UTILISATION — GOUVERNEMENT",
            "Figure 6 — Cas d’utilisation du profil gouvernement.",
            14.5,
            "Le profil Gouvernement consulte les indicateurs globaux et le classement. Il n’intervient ni dans le remplissage ni dans la validation des évaluations.",
        ),
    ]:
        add_section_break(doc)
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(title)
        r.font.size = Pt(14)
        r.font.bold = True
        r.font.color.rgb = rgb(NAVY)
        add_figure(doc, filename, caption, height_cm=height)
        explanation = doc.add_paragraph()
        explanation.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        explanation.paragraph_format.left_indent = Cm(0.9)
        explanation.paragraph_format.right_indent = Cm(0.9)
        explanation.paragraph_format.space_before = Pt(4)
        explanation.paragraph_format.space_after = Pt(0)
        lead = explanation.add_run("Lecture du diagramme. ")
        lead.font.bold = True
        lead.font.color.rgb = rgb(NAVY)
        explanation.add_run(interpretation)
        for run in explanation.runs:
            run.font.size = Pt(9.2)
            set_run_language(run)
    add_section_break(doc)

    add_title(doc, "2.4 Règles de gestion", level=2)
    add_table(
        doc,
        ["Code", "Règle"],
        [
            ("RG-01", "Toute ressource protégée nécessite un compte authentifié et actif."),
            ("RG-02", "Un utilisateur ne consulte et ne modifie que l’organisme auquel son compte est rattaché."),
            ("RG-03", "Une évaluation ne peut être soumise que depuis l’état EN_COURS et lorsque les critères requis sont renseignés."),
            ("RG-04", "Une évaluation soumise peut être prise en charge par un seul validateur à la fois."),
            ("RG-05", "La validation finale est refusée tant qu’une réponse n’a pas reçu de décision ou qu’une correction reste demandée."),
            ("RG-06", "Une demande de correction remet l’évaluation à EN_COURS et rouvre les critères ciblés."),
            ("RG-07", "Le score global est calculé à partir des scores par principe et de leur pondération effective."),
            ("RG-08", "Le profil gouvernement dispose de fonctions de lecture et de pilotage, sans accès au remplissage."),
            ("RG-09", "Les opérations sensibles sont tracées dans le journal d’audit."),
            ("RG-10", "Les fichiers envoyés doivent respecter la taille maximale et être rattachés à une réponse autorisée."),
        ],
        widths=[2.1, 13.5],
        font_size=8.5,
    )

    add_title(doc, "2.5 Besoins non fonctionnels", level=2)
    add_table(
        doc,
        ["Qualité", "Exigence retenue"],
        [
            ("Sécurité", "JWT à durée limitée, mot de passe chiffré, autorisations par rôle et par propriétaire, CORS configuré, secrets externalisés."),
            ("Ergonomie", "Navigation claire, retours explicites, boutons cohérents, modales sans défaut de voile, formulaires fermables et parcours réversibles."),
            ("Responsive design", "Adaptation aux écrans courants, notamment pour la liste des principes, des bonnes pratiques et des critères."),
            ("Internationalisation", "Français, arabe et anglais, prise en charge RTL et préférence propre à chaque compte."),
            ("Performance", "Pagination des listes, requêtes ciblées, chargements différés et images dimensionnées."),
            ("Fiabilité", "Transitions de statut contrôlées, transactions, verrou de validation, volumes persistants et healthchecks."),
            ("Maintenabilité", "Séparation front-end/back-end, services métier, DTO, composants réutilisables, configuration par variables d’environnement."),
            ("Traçabilité", "Journal d’audit, dates métier, identifiant du validateur et historique de notification."),
        ],
        widths=[3.2, 12.4],
        font_size=8.5,
    )

    add_page_break(doc)
    add_title(doc, "2.6 Priorisation", level=2)
    add_body(doc, "La priorité a été donnée aux éléments qui conditionnent l’intégrité du processus. La sécurité des ressources, le workflow et la correction ciblée ont été traités avant les améliorations visuelles. La refonte UI/UX a ensuite été menée sur les parcours les plus utilisés, puis étendue aux écrans secondaires.")
    add_table(
        doc,
        ["Priorité", "Éléments"],
        [
            ("Must", "Authentification, contrôle d’accès, remplissage, preuves, soumission, validation, correction, scoring, persistance."),
            ("Should", "Notifications, exports, audit, formulaires complets, langue par compte, responsive design."),
            ("Could", "Assistant contextuel, enrichissement des paramètres, indicateurs supplémentaires, automatisation CI/CD."),
            ("Hors périmètre immédiat", "Application mobile native et connexion à des systèmes externes non spécifiés."),
        ],
        widths=[3.7, 11.9],
        font_size=8.6,
    )
    add_body(doc, "Cette priorisation a orienté mes choix tout au long du stage. Lorsqu’un défaut d’affichage révélait aussi un risque métier — par exemple une validation possible malgré des décisions incomplètes — j’ai traité d’abord la règle côté serveur, puis le retour visuel côté interface.")
    add_body(doc, "À l’inverse, les améliorations de confort sans incidence sur les données ont été regroupées dans la refonte UI/UX. Cette manière de travailler a évité de confondre urgence visuelle et criticité fonctionnelle.")


def add_chapter_3(doc: Document) -> None:
    add_title(doc, "Chapitre 3 — Conception de la solution", level=1)
    add_body(doc, "La conception vise à transformer les besoins en une structure logicielle explicite. Elle traite l’architecture en couches, le modèle du domaine, les mécanismes de sécurité, le calcul des scores et les interactions principales entre l’interface, l’API et la base de données.")

    add_title(doc, "3.1 Architecture applicative", level=2)
    add_body(doc, "La plateforme adopte une architecture client–serveur. Le navigateur exécute l’application React et communique avec une API REST Spring Boot. Le back-end concentre les règles métier, l’autorisation, les transactions et la génération de documents. PostgreSQL conserve les données structurées, tandis qu’un espace de fichiers persistant reçoit les justificatifs.")
    add_body(doc, "Au début du travail, j’ai choisi de ne pas mélanger les corrections d’interface avec les règles métier. Cette séparation m’a permis de vérifier une couche à la fois et de comprendre plus facilement l’origine d’une erreur : affichage côté React, contrat HTTP, règle de service ou persistance.")
    add_table(
        doc,
        ["Principe directeur", "Application dans SSE"],
        [
            ("Séparation des responsabilités", "Composants React, contrôleurs REST, services métier et dépôts JPA distincts."),
            ("API sans état", "Chaque requête authentifiée porte son jeton ; le serveur ne dépend pas d’une session HTTP."),
            ("Configuration externalisée", "Base, CORS, JWT, SMTP et limites de fichiers pilotés par l’environnement."),
            ("Persistance explicite", "Données relationnelles dans PostgreSQL et justificatifs dans un volume dédié."),
            ("Observabilité minimale", "Healthchecks, audit, notifications et file de courriels consultables."),
        ],
        widths=[4.7, 10.9],
        font_size=8.5,
    )

    add_section_break(doc, landscape=True)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("ARCHITECTURE APPLICATIVE")
    r.font.size = Pt(14)
    r.font.bold = True
    r.font.color.rgb = rgb(NAVY)
    add_figure(doc, "architecture-applicative.png", "Figure 7 — Architecture applicative en couches de la plateforme SSE.", height_cm=14.5)
    add_section_break(doc)

    add_title(doc, "3.1.1 Couche de présentation", level=3)
    add_body(doc, "Le front-end est une application monopage construite avec React 18 et TypeScript. React Router organise les routes, Zustand conserve les états partagés utiles, React Hook Form et Zod structurent les formulaires, i18next gère les traductions et Recharts affiche les indicateurs. Axios centralise les appels à l’API et l’intercepteur d’authentification joint les jetons nécessaires.")

    add_title(doc, "3.1.2 Couche d’accès et métier", level=3)
    add_body(doc, "Le back-end, basé sur Spring Boot 3.2.5 et Java 17, expose des contrôleurs REST. Les contrôleurs valident la forme des requêtes et délèguent aux services. Les services appliquent les règles de gestion : création d’une évaluation, soumission, prise en charge, correction, validation, scoring, notifications, activation des comptes et audit. Des DTO limitent les informations échangées et évitent d’exposer directement le modèle de persistance.")

    add_title(doc, "3.1.3 Couche de persistance", level=3)
    add_body(doc, "Spring Data JPA assure l’accès à PostgreSQL. Les dépôts encapsulent les requêtes, notamment celles qui contrôlent l’appartenance d’une évaluation à un organisme ou récupèrent les réponses d’un principe. Les opérations sensibles sont transactionnelles afin d’éviter qu’une modification partielle laisse le dossier dans un état incohérent.")

    add_title(doc, "3.2 Conception de la sécurité", level=2)
    add_body(doc, "L’authentification est sans état. Après une connexion réussie, l’API renvoie un jeton d’accès JWT d’une durée courte et un mécanisme de renouvellement. Chaque requête protégée traverse un filtre qui extrait le jeton, vérifie sa signature et charge l’utilisateur. Spring Security applique ensuite les autorisations au niveau des routes et des méthodes.")
    add_table(
        doc,
        ["Contrôle", "Mécanisme"],
        [
            ("Authentification", "Jetons JWT signés ; accès court de 15 minutes et renouvellement configuré jusqu’à 7 jours."),
            ("Autorisation par rôle", "ADMIN, USER, EVALUATEUR et GOUVERNEMENT, avec hiérarchie contrôlée pour certaines actions."),
            ("Autorisation par ressource", "Vérification de l’organisme propriétaire avant lecture, écriture ou téléversement d’un justificatif."),
            ("Mots de passe", "Hachage via le composant PasswordEncoder ; aucun mot de passe en clair dans la base."),
            ("Révocation", "Version de jeton et état du compte permettant d’invalider une session."),
            ("Configuration", "Origines CORS, secrets JWT, base de données et SMTP externalisés dans l’environnement."),
            ("Traçabilité", "Journalisation des soumissions, validations, rejets et opérations d’administration."),
        ],
        widths=[3.6, 12.0],
        font_size=8.5,
    )
    add_callout(doc, "Principe du moindre privilège", "Le rôle donne une autorisation générale, mais l’accès à une évaluation ou à une réponse est aussi conditionné par la relation avec l’organisme. Cette double vérification limite les accès horizontaux entre organismes.")

    add_title(doc, "3.3 Modèle du domaine", level=2)
    add_body(doc, "Le cœur métier est formé par Organisme, Évaluation, Principe, Bonne pratique, Critère et Réponse. Une évaluation appartient à un organisme et contient des réponses associées aux critères du référentiel. Les scores par principe et le score global sont produits après la revue. Des entités de support gèrent les demandes de compte, notifications, réclamations, jetons d’activation, tâches de courriel et journaux d’audit.")
    add_body(doc, "Le diagramme de classes utilise des noms métier en français. Les types techniques des attributs — String, Integer, Boolean, UUID, LocalDateTime, List<String> — restent en anglais conformément aux conventions des langages de programmation et à la demande de cohérence avec le code source.")
    add_table(
        doc,
        ["Agrégat", "Responsabilité", "Relations essentielles"],
        [
            ("Organisme", "Porte l’identité et les coordonnées de la structure évaluée.", "Utilisateurs, évaluations, scores et réclamations."),
            ("Référentiel", "Décrit les principes, bonnes pratiques, critères, preuves attendues et traductions.", "Principe → Bonne pratique → Critère."),
            ("Évaluation", "Conserve l’année, le statut, les dates, le verrou, le score et la maturité.", "Organisme, réponses et scores par principe."),
            ("Réponse", "Associe à un critère un niveau, un commentaire, des justificatifs et une décision.", "Évaluation, critère et validateur."),
            ("Support", "Gère activation, notifications, courriels, réclamations et audit.", "Utilisateur et entités métier concernées."),
        ],
        widths=[3.2, 6.5, 5.9],
        font_size=8.3,
    )

    add_section_break(doc, landscape=True, page_size="A3")
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("DIAGRAMME DE CLASSES")
    r.font.size = Pt(15)
    r.font.bold = True
    r.font.color.rgb = rgb(NAVY)
    add_figure(doc, "diagramme-classes-final.png", "Figure 8 — Diagramme de classes officiel : entités, attributs, généralisations et cardinalités.", height_cm=21.2)
    add_section_break(doc)

    add_title(doc, "3.4 Cycle de vie des évaluations", level=2)
    add_table(
        doc,
        ["État", "Signification", "Transitions principales"],
        [
            ("EN_COURS", "L’organisme renseigne ou corrige son dossier.", "SOUMISE après contrôle de complétude."),
            ("SOUMISE", "Le dossier est disponible pour examen.", "EN_VALIDATION lors de la prise en charge ; EN_COURS si correction."),
            ("EN_VALIDATION", "Un évaluateur possède le verrou de travail.", "VALIDEE, REJETEE ou EN_COURS selon la décision."),
            ("VALIDEE", "Les décisions sont complètes et les scores enregistrés.", "État terminal pour l’année concernée."),
            ("REJETEE", "Le dossier est refusé avec un motif.", "État terminal ou reprise selon une future règle métier."),
        ],
        widths=[3.0, 6.2, 6.4],
        font_size=8.5,
    )
    add_body(doc, "Les réponses possèdent un cycle plus fin : BROUILLON, SOUMISE, VALIDEE, REJETEE ou A_CORRIGER. Le statut A_CORRIGER conserve le commentaire de l’évaluateur et un indicateur signale si l’utilisateur a traité la correction. La validation finale reste bloquée tant qu’une correction n’est pas retournée au responsable ou qu’une décision manque.")

    add_title(doc, "3.5 Calcul des scores et de la maturité", level=2)
    add_body(doc, "Chaque niveau de réponse est converti en points : N0 = 0, N1 = 1, N2 = 2 et N3 = 3. Pour un principe contenant n réponses, le score en pourcentage est calculé par la formule suivante :")
    add_callout(doc, "Formule", "Score du principe = (Σ points obtenus ÷ (nombre de critères × 3)) × 100", fill=PALE_GOLD, accent=GOLD)
    add_body(doc, "Le dénominateur est dynamique : il dépend du nombre réel de critères rattachés au principe. Une réponse sans niveau vaut zéro point mais reste comprise dans le dénominateur, ce qui évite de surévaluer une section incomplète. Les principes sans réponse ne modifient pas le score global. Chaque score de principe est ensuite multiplié par sa pondération effective, puis la moyenne pondérée produit le score global.")
    add_table(
        doc,
        ["Intervalle", "Niveau de maturité"],
        [
            ("0 ≤ score < 25", "INITIAL"),
            ("25 ≤ score < 50", "EN_PROGRESSION"),
            ("50 ≤ score < 75", "AVANCE"),
            ("75 ≤ score ≤ 100", "EXCELLENT"),
        ],
        widths=[7.0, 8.6],
        font_size=9,
    )

    add_title(doc, "3.6 Diagrammes de séquence", level=2)
    add_body(doc, "Les séquences suivantes sont volontairement décomposées : un scénario par page, avec le rôle initiateur indiqué dans le titre. Cette séparation évite de superposer des échanges appartenant à des objectifs différents et facilite la lecture de l’interface web, des contrôleurs, des services métier, du stockage et de la base de données.")

    for filename, title, caption in [
        ("sequence-01-remplir-evaluation.png", "SÉQUENCE UTILISATEUR 1 — REMPLIR UNE ÉVALUATION", "Figure 9 — Utilisateur : chargement, sauvegarde progressive et ajout d’un fichier justificatif."),
        ("sequence-02-soumettre-evaluation.png", "SÉQUENCE UTILISATEUR 2 — SOUMETTRE UNE ÉVALUATION", "Figure 10 — Utilisateur : contrôle de complétude, audit et notification de la soumission."),
        ("sequence-03-valider-evaluation.png", "SÉQUENCE ÉVALUATEUR — VALIDER UNE ÉVALUATION", "Figure 11 — Évaluateur : prise en charge, décisions par critère, scoring et notification."),
        ("sequence-04-corriger-resoumettre.png", "SÉQUENCE PARTAGÉE — CORRIGER ET RESOUMETTRE", "Figure 12 — Évaluateur et utilisateur : correction ciblée, réouverture et nouvelle soumission."),
    ]:
        add_section_break(doc, landscape=True)
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(title)
        r.font.size = Pt(13)
        r.font.bold = True
        r.font.color.rgb = rgb(NAVY)
        add_figure(doc, filename, caption, height_cm=14.7)
    add_section_break(doc)

    add_title(doc, "3.7 Choix de conception complémentaires", level=2)
    add_bullets(doc, [
        "un verrou de validation évite deux décisions concurrentes sur le même dossier ;",
        "les notifications sont persistées et peuvent aussi être diffusées en temps réel ;",
        "les tâches de courriel mémorisent les tentatives et la dernière erreur afin de faciliter la reprise ;",
        "les fichiers sont séparés des données relationnelles et référencés par la réponse concernée ;",
        "les libellés multilingues sont portés par le référentiel, tandis que la préférence de langue appartient au compte ;",
        "les exports sont générés côté serveur pour garantir une source de données et un rendu homogènes.",
    ])
    add_table(
        doc,
        ["Choix", "Pourquoi ce choix est important"],
        [
            ("Verrou applicatif", "Évite des décisions contradictoires et rend visible la personne qui traite le dossier."),
            ("Correction par critère", "Préserve le travail déjà validé et donne à l’organisme une consigne précise."),
            ("Scoring côté serveur", "Garantit le même résultat quel que soit le navigateur ou l’écran utilisé."),
            ("Audit et notifications", "Explique les changements d’état et informe le bon acteur au bon moment."),
            ("Volumes persistants", "Protège les données et les justificatifs lors du remplacement d’un conteneur."),
        ],
        widths=[4.2, 11.4],
        font_size=8.4,
    )
    add_body(doc, "Ces décisions ne sont pas seulement techniques. Elles rendent le processus compréhensible pour les utilisateurs et facilitent le diagnostic lorsqu’un dossier reste bloqué ou qu’une action est contestée.")


def add_chapter_4(doc: Document) -> None:
    add_title(doc, "Chapitre 4 — Réalisation et améliorations apportées", level=1)
    add_body(doc, "Ce chapitre présente les technologies effectivement utilisées et les contributions réalisées pendant le stage. L’objectif n’a pas été de modifier seulement l’apparence : les évolutions associent règles métier, sécurité, qualité des données et expérience utilisateur.")

    add_title(doc, "4.1 Environnement technique", level=2)
    add_table(
        doc,
        ["Composant", "Technologies", "Rôle"],
        [
            ("Front-end", "React 18, TypeScript 5, Vite 5, Tailwind CSS", "Interface, routage, responsive design et construction des ressources."),
            ("État et formulaires", "Zustand, React Hook Form, Zod", "État partagé, saisie, validation et messages d’erreur."),
            ("Visualisation et i18n", "Recharts, i18next, Lucide", "Graphiques, traductions FR/AR/EN et iconographie."),
            ("Back-end", "Java 17, Spring Boot 3.2.5", "API REST, services métier, transactions et configuration."),
            ("Sécurité", "Spring Security, JJWT", "Authentification JWT et autorisations."),
            ("Persistance", "Spring Data JPA, PostgreSQL 15", "Modèle relationnel, dépôts et requêtes."),
            ("Documents", "OpenPDF, Apache POI", "Génération de rapports PDF et exports Excel."),
            ("Déploiement", "Docker Compose, Nginx, Ubuntu, AWS EC2", "Conteneurisation, exposition web et hébergement."),
        ],
        widths=[3.2, 5.2, 7.2],
        font_size=8.2,
    )
    add_body(doc, "La figure suivante regroupe les technologies les plus visibles dans la chaîne de réalisation. Leur rôle est complémentaire : le front-end construit l’expérience utilisateur, le back-end applique les règles métier, la base conserve l’information et les outils d’exploitation rendent la livraison reproductible.")
    add_technology_grid(doc)
    add_body(doc, "Les logos sont utilisés uniquement pour identifier les technologies étudiées et mises en œuvre ; les marques restent la propriété de leurs titulaires respectifs.")

    add_title(doc, "4.2 Réalisation du back-end", level=2)
    add_title(doc, "4.2.1 API et services métier", level=3)
    add_body(doc, "Les contrôleurs sont répartis par domaine : authentification, utilisateurs, organismes, évaluations, réponses, principes, fichiers, notifications, tableaux de bord, rapports, réclamations, demandes de compte, audit et tâches de courriel. Cette organisation permet de limiter les responsabilités de chaque point d’entrée.")
    add_body(doc, "La logique complexe réside dans les services. Le service d’évaluation vérifie les statuts, prend ou libère le verrou de validation, calcule les scores, met à jour le classement et déclenche les notifications. Le service de réponses contrôle les modifications autorisées, les décisions de l’évaluateur et le traitement des corrections. Les opérations sont transactionnelles afin que la mise à jour des statuts, scores et historiques reste atomique.")

    add_title(doc, "4.2.2 Sécurisation des ressources", level=3)
    add_body(doc, "Un composant de contrôle d’accès complète les annotations de rôle. Il vérifie, par exemple, que l’utilisateur connecté appartient bien à l’organisme de l’évaluation avant d’autoriser la lecture ou l’écriture. Le même principe est appliqué au téléversement d’une preuve. Les évaluateurs et administrateurs disposent des actions de validation, tandis que le gouvernement accède aux vues de pilotage.")

    add_title(doc, "4.2.3 Notifications, audit et documents", level=3)
    add_body(doc, "Les événements majeurs produisent des notifications : nouvelle soumission, correction demandée, validation ou rejet. Les notifications sont sauvegardées, affichées dans l’interface et diffusables via Server-Sent Events. Le journal d’audit conserve l’action, l’entité, les valeurs avant/après, l’utilisateur et l’adresse IP lorsque l’information est disponible. Les rapports PDF et fichiers Excel sont générés au back-end pour faciliter l’archivage et le partage.")

    add_title(doc, "4.3 Refonte de l’interface et de l’expérience utilisateur", level=2)
    add_body(doc, "La refonte a établi un langage visuel commun : navigation latérale structurée par rôle, en-têtes cohérents, cartes d’indicateurs, contrastes renforcés, thème clair/sombre, espacements réguliers, icônes compréhensibles et composants réutilisables. Les pages mettent en avant la prochaine action utile plutôt qu’une simple accumulation de données.")
    add_figure(doc, "capture-tableau-admin.png", "Figure 14 — Tableau de bord administrateur : indicateurs, synthèse et navigation institutionnelle.", width_cm=15.6)
    add_body(doc, "Le tableau de bord administrateur regroupe les indicateurs essentiels et donne accès aux domaines d’administration. Le mode sombre illustré ci-dessus conserve un contraste lisible et distingue clairement les cartes, graphiques et actions.")

    add_title(doc, "4.3.1 Navigation et fermeture des interfaces", level=3)
    add_bullets(doc, [
        "ajout d’une flèche de retour dans les interfaces détaillées et les formulaires afin de revenir à la page précédente ;",
        "ajout d’une icône « X » pour quitter explicitement les formulaires ou modales ;",
        "correction du voile de fond des fenêtres : la petite bande blanche supérieure a été supprimée et l’arrière-plan est désormais uniformément assombri ;",
        "agrandissement du logo d’un organisme au clic depuis le tableau des utilisateurs ou la fiche détaillée ;",
        "uniformisation des titres de page, du fil d’action et des états vides.",
    ])

    add_title(doc, "4.3.2 Interface de remplissage et de validation", level=3)
    add_body(doc, "L’interface d’évaluation devait afficher simultanément les principes, les bonnes pratiques, les critères, la réponse, les preuves et les actions de validation. La mise en page a été rendue adaptable : la zone principale grandit ou se réduit selon la longueur du critère, au lieu de réserver un espace vide fixe au-dessus des boutons. L’espacement entre la flèche de retour et les listes de navigation a également été augmenté.")
    add_body(doc, "Dans l’espace évaluateur, la navigation par principe et par critère affiche une progression et des filtres par décision. Les actions Valider, Demander correction et Rejeter restent rattachées au critère visible. La validation globale est désactivée tant que les décisions ne sont pas complètes, ce qui relie le feedback visuel à la règle métier.")
    add_figure(doc, "capture-validation-evaluation.png", "Figure 15 — Interface de revue : progression, principes, critères, preuves et décision de l’évaluateur.", width_cm=15.6)

    add_title(doc, "4.3.3 Formulaires administratifs complets", level=3)
    add_body(doc, "Le formulaire de création d’un utilisateur a été aligné sur la demande publique de compte. Les champs manquants — notamment télécopie, logo, adresse, secteur, rôle de l’organisme et fonction — ont été ajoutés. Les validations et libellés suivent la même terminologie, ce qui réduit les corrections manuelles après création.")

    add_title(doc, "4.3.4 Interface adaptée aux rôles", level=3)
    add_body(doc, "Le menu et le tableau de bord ne présentent que les fonctions utiles. La section d’évaluation a été retirée du profil gouvernement, puisque ce rôle ne doit ni remplir ni examiner les dossiers. Il conserve uniquement les indicateurs et le classement. Le profil utilisateur se concentre sur ses évaluations et le référentiel. L’évaluateur dispose d’une file de validation. L’administrateur conserve la vue globale.")
    add_figure(doc, "capture-tableau-user.png", "Figure 16 — Tableau de bord utilisateur : progression et actions liées à son organisme.", width_cm=15.0)
    add_figure(doc, "capture-tableau-evaluateur.png", "Figure 17 — Tableau de bord évaluateur : file de travail, progression et prise en charge.", width_cm=15.0)
    add_figure(doc, "capture-tableau-gouvernement.png", "Figure 18 — Tableau de bord gouvernemental : indicateurs consolidés sans section de saisie.", width_cm=15.0)

    add_title(doc, "4.4 Internationalisation propre à chaque compte", level=2)
    add_body(doc, "Une préférence globale enregistrée uniquement dans le navigateur provoquait un défaut : après avoir choisi l’arabe avec un compte évaluateur, le compte administrateur ouvert ensuite héritait de la même langue. La préférence est désormais associée à l’identité du compte. Lors de la connexion, l’application charge la langue enregistrée pour cet utilisateur ; lors d’un changement, elle met à jour uniquement cette préférence.")
    add_body(doc, "Le français, l’anglais et l’arabe sont disponibles. L’arabe active la direction droite-à-gauche, ce qui concerne l’alignement, la navigation et l’ordre visuel de plusieurs composants. Le changement de langue reste accessible depuis l’en-tête, sans mélanger les choix de deux sessions successives.")
    add_body(doc, "La traduction de l’application repose sur deux mécanismes complémentaires. Les textes fixes de l’interface sont servis localement par i18next : les 789 clés présentes sont alignées dans les trois catalogues, ce qui rend le changement de langue immédiat, cohérent et indépendant d’un service externe [13]. Les contenus du référentiel saisis en français par l’administrateur sont, eux, automatiquement proposés en anglais et en arabe par le service MyMemory, avec découpage des textes longs et mise en cache côté serveur [14].")
    add_body(doc, "Cette architecture a été conservée car elle répond déjà au besoin sans retraduire chaque page à la volée. Une traduction automatique de toute l’interface à chaque affichage augmenterait la latence, rendrait les libellés moins stables et créerait une dépendance réseau. Pour un futur déploiement exigeant une traduction entièrement hébergée au CNI, LibreTranslate et son moteur Argos Translate constituent une alternative libre et auto-hébergeable [15].")
    add_callout(doc, "Choix retenu", "i18next pour les libellés de l’interface, MyMemory pour les contenus métier dynamiques, et une préférence FR/EN/AR isolée par compte. Cette combinaison reste gratuite, réactive et adaptée à l’état actuel du projet.")

    add_title(doc, "4.5 Paramètres utiles", level=2)
    add_body(doc, "L’interface Paramètres a été conservée mais recentrée sur des options réellement utiles : thème visuel, langue, préférences de notification et informations du profil lorsque l’autorisation le permet. Cette approche évite une page vide tout en regroupant les réglages personnels hors des écrans métier.")

    add_page_break(doc)
    add_title(doc, "4.6 Qualité d’usage", level=2)
    add_table(
        doc,
        ["Problème initial", "Amélioration", "Effet utilisateur"],
        [
            ("Grand espace vide dans la validation", "Hauteur de contenu adaptative.", "Les actions restent proches du critère quelle que soit sa longueur."),
            ("Langue partagée entre comptes", "Clé de préférence liée au compte.", "Chaque utilisateur retrouve son dernier choix."),
            ("Bande blanche au-dessus des modales", "Overlay fixé sur toute la fenêtre.", "Concentration et cohérence visuelle."),
            ("Retour incertain", "Flèche de retour et bouton de fermeture.", "Parcours plus réversible et moins d’erreurs."),
            ("Logos trop petits", "Aperçu agrandi au clic.", "Vérification visuelle facilitée."),
            ("Fonctions non pertinentes pour le gouvernement", "Navigation filtrée par rôle.", "Interface plus simple et conforme aux droits."),
            ("Formulaire utilisateur incomplet", "Ajout des champs de l’organisme.", "Création sans étape corrective supplémentaire."),
        ],
        widths=[4.8, 5.0, 5.8],
        font_size=8.2,
    )
    add_body(doc, "Ces corrections ont été vérifiées sur les écrans réellement déployés. J’ai particulièrement contrôlé les passages d’un rôle à l’autre, car plusieurs défauts n’apparaissaient qu’après une déconnexion ou après l’ouverture successive de comptes différents dans le même navigateur.")
    add_callout(doc, "Résultat", "L’interface conserve une identité commune, mais chaque profil voit un parcours plus court, centré sur ses responsabilités et sur la prochaine action utile.")


def add_chapter_5(doc: Document) -> None:
    add_title(doc, "Chapitre 5 — Tests, déploiement et exploitation", level=1)
    add_body(doc, "Une fonctionnalité n’est réellement terminée que si son comportement peut être vérifié dans un environnement proche de l’usage réel. Les contrôles ont donc porté sur les règles métier, les API, la construction du front-end, le rendu des interfaces et le déploiement conteneurisé.")

    add_title(doc, "5.1 Stratégie de test", level=2)
    add_body(doc, "La stratégie combine plusieurs niveaux. Les tests unitaires isolent une règle, comme le calcul dynamique des scores. Les tests de services utilisent des dépendances simulées pour vérifier l’authentification ou les indicateurs. Les tests de contrôleur valident le contrat HTTP des rapports. Enfin, les parcours fonctionnels sont contrôlés dans le navigateur avec les comptes de démonstration des quatre rôles.")
    add_table(
        doc,
        ["Type", "Éléments contrôlés", "Exemples"],
        [
            ("Unitaire", "Calcul pur et cas limites.", "Dénominateur selon le nombre de critères, réponse vide, score maximal."),
            ("Service", "Règles métier avec dépôts simulés.", "Connexion, tableau de bord, transitions et autorisations."),
            ("Contrôleur", "Statut HTTP, contenu et en-têtes.", "Téléchargement d’un rapport PDF."),
            ("Construction", "Compilation et dépendances.", "Maven pour le back-end, TypeScript/Vite pour le front-end."),
            ("Fonctionnel", "Parcours de bout en bout.", "Connexion par rôle, navigation, revue, langue, modales et classement."),
            ("Visuel", "Responsive design et cohérence.", "Espace adaptatif, retour, voile de modale, thème clair/sombre."),
        ],
        widths=[3.0, 6.0, 6.6],
        font_size=8.4,
    )

    add_title(doc, "5.2 Cas de test critiques", level=2)
    add_table(
        doc,
        ["ID", "Scénario", "Résultat attendu"],
        [
            ("T-01", "Connexion avec chacun des quatre rôles.", "Redirection vers le tableau de bord autorisé et menu adapté."),
            ("T-02", "Un utilisateur tente d’accéder à l’évaluation d’un autre organisme.", "Accès refusé par le contrôle de propriété."),
            ("T-03", "Soumission avec un critère requis incomplet.", "Soumission refusée et message ciblé."),
            ("T-04", "Deux évaluateurs ouvrent le même dossier.", "Un seul verrou actif ; le second voit le dossier pris."),
            ("T-05", "Validation globale avec une décision manquante.", "Bouton désactivé ou erreur métier ; aucun score final enregistré."),
            ("T-06", "Critère renvoyé pour correction.", "Seul le critère concerné est rouvert avec son motif."),
            ("T-07", "Changement de langue puis connexion avec un autre compte.", "Chaque compte retrouve sa propre préférence."),
            ("T-08", "Ouverture d’une modale sur une page longue.", "Voile couvrant toute la fenêtre, sans bande blanche."),
            ("T-09", "Clic sur un logo depuis une liste ou une fiche.", "Aperçu agrandi et refermable."),
            ("T-10", "Accès gouvernemental.", "Indicateurs et classement disponibles ; aucune interface de saisie."),
        ],
        widths=[1.6, 7.1, 6.9],
        font_size=8.3,
    )

    add_title(doc, "5.3 Conteneurisation", level=2)
    add_body(doc, "Docker Compose regroupe trois services principaux. PostgreSQL 15 utilise un volume persistant pour les données. Le back-end Spring Boot communique avec la base par le réseau Docker et expose l’API. Le front-end est compilé puis servi par Nginx, qui distribue les ressources et transmet les requêtes API. Un second volume conserve les justificatifs envoyés.")
    add_bullets(doc, [
        "des healthchecks vérifient la disponibilité de la base et du back-end ;",
        "les dépendances entre services évitent de démarrer l’application avant PostgreSQL ;",
        "les paramètres sensibles sont injectés par variables d’environnement ;",
        "les volumes séparent les données durables du cycle de vie des conteneurs ;",
        "la même composition peut être utilisée localement et adaptée en production.",
    ])

    add_title(doc, "5.4 Déploiement sur Ubuntu dans AWS EC2", level=2)
    add_body(doc, "La version finale a été construite et déployée sur une machine Ubuntu hébergée dans Amazon EC2. EC2 fournit une machine virtuelle configurable dans le cloud AWS [7]. L’accès d’administration se fait par SSH à l’aide d’une clé privée conservée hors du dépôt. Pour des raisons de sécurité, l’adresse publique et le chemin local de cette clé ne sont pas reproduits dans ce rapport.")
    add_table(
        doc,
        ["Élément", "Configuration retenue"],
        [
            ("Système hôte", "Ubuntu sur une instance Amazon EC2."),
            ("Orchestration", "Docker Compose pour le front-end, le back-end et PostgreSQL."),
            ("Exposition", "Nginx sert l’application React et transmet les requêtes vers l’API."),
            ("Persistance", "Volume PostgreSQL et volume séparé pour les justificatifs."),
            ("Configuration", "Variables d’environnement pour la base, JWT, CORS, SMTP et options de production."),
            ("Vérification", "Healthchecks, journaux des conteneurs et tests des quatre rôles."),
        ],
        widths=[4.0, 11.6],
        font_size=8.4,
    )
    add_body(doc, "Pendant la mise en ligne, j’ai volontairement séparé les informations nécessaires au rapport des éléments secrets d’exploitation. Le rapport décrit donc l’architecture et la procédure, mais n’expose ni clé privée ni adresse sensible de connexion.")

    add_section_break(doc, landscape=True)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("ARCHITECTURE DE DÉPLOIEMENT")
    r.font.size = Pt(14)
    r.font.bold = True
    r.font.color.rgb = rgb(NAVY)
    add_figure(doc, "architecture-deploiement.png", "Figure 19 — Déploiement Docker Compose sur une instance Ubuntu dans AWS EC2.", height_cm=14.4)
    add_section_break(doc)

    add_title(doc, "5.4.1 Procédure de mise en production", level=3)
    add_bullets(doc, [
        "sauvegarder l’état validé du dépôt dans Git et identifier le commit de référence ;",
        "transférer ou récupérer le code sur l’instance Ubuntu ;",
        "renseigner les variables d’environnement de production sans committer les secrets ;",
        "construire les images et démarrer les services avec Docker Compose ;",
        "vérifier les healthchecks, les journaux et la connexion à PostgreSQL ;",
        "tester la connexion, les rôles, la navigation et un téléchargement ;",
        "conserver un plan de retour vers l’image ou le commit précédent.",
    ], numbered=True)

    add_title(doc, "5.4.2 Sauvegarde et retour arrière", level=3)
    add_body(doc, "Avant la refonte UI/UX majeure, l’état courant a été conservé dans l’historique Git afin de pouvoir revenir à une version connue. Le rollback applicatif consiste à redéployer le commit ou l’image précédente. Le rollback de données doit rester distinct : il nécessite une sauvegarde PostgreSQL et une copie des volumes de justificatifs avant toute migration susceptible de modifier le schéma.")
    add_callout(doc, "Règle d’exploitation", "Une sauvegarde du code ne remplace jamais une sauvegarde des données. Le dépôt Git protège les sources ; les volumes et les exports PostgreSQL protègent l’information métier.")

    add_title(doc, "5.5 Sécurité d’exploitation", level=2)
    add_bullets(doc, [
        "restreindre le groupe de sécurité EC2 aux ports réellement nécessaires ;",
        "protéger la clé SSH, ne jamais l’envoyer dans Git et limiter ses permissions ;",
        "placer l’application derrière HTTPS avec un nom de domaine et un certificat TLS ;",
        "renouveler les secrets JWT et les mots de passe de démonstration avant un usage réel ;",
        "désactiver ou supprimer les jeux de données de test dans l’environnement de production ;",
        "planifier les sauvegardes de PostgreSQL et du volume des justificatifs ;",
        "surveiller l’espace disque, les healthchecks, les erreurs d’API et la file de courriels.",
    ])

    add_title(doc, "5.6 Résultats de vérification", level=2)
    add_body(doc, "Les interfaces déployées ont été parcourues avec les quatre comptes de démonstration. Les tableaux de bord correspondent aux responsabilités attendues : administration complète, espace d’évaluation de l’organisme, file de travail de l’évaluateur et indicateurs gouvernementaux. Les captures intégrées au chapitre précédent proviennent de cette vérification et non de maquettes statiques.")
    add_body(doc, "Les tests automatisés du dépôt couvrent le calcul des scores, l’authentification, le service de tableau de bord et le contrôleur de rapports. Lors de la finalisation du rapport, la construction de production du front-end a été exécutée avec succès. La construction complète et la suite Maven doivent rester des contrôles obligatoires avant chaque livraison.")


def add_chapter_6(doc: Document) -> None:
    add_title(doc, "Chapitre 6 — Bilan et perspectives", level=1)
    add_body(doc, "Le stage a permis de travailler sur une application institutionnelle complète, depuis la compréhension du métier jusqu’au déploiement. Il a également montré que la qualité d’un produit ne dépend pas d’un seul écran ou d’une seule technologie, mais de la cohérence entre données, règles, sécurité, interface et exploitation.")

    add_title(doc, "6.1 Difficultés rencontrées et solutions", level=2)
    add_table(
        doc,
        ["Difficulté", "Analyse", "Solution retenue"],
        [
            ("Workflow multi-états", "Une action sur une réponse influence l’état global de l’évaluation.", "Centralisation des transitions dans les services et contrôles avant validation."),
            ("Validation concurrente", "Deux évaluateurs pouvaient agir sur le même dossier.", "Prise en charge avec propriétaire du verrou et libération contrôlée."),
            ("Corrections ciblées", "Rouvrir tout le dossier faisait perdre le contexte.", "Statut A_CORRIGER, motif par critère et indicateur correction traitée."),
            ("Interface dense", "Les listes et actions occupent beaucoup d’espace.", "Mise en page responsive, hauteur adaptative, progression et filtres."),
            ("Préférence de langue", "Le stockage navigateur était partagé entre comptes.", "Clé de préférence liée à l’identité et restauration à la connexion."),
            ("Déploiement", "Différences entre poste local et serveur Ubuntu.", "Docker Compose, variables d’environnement et contrôles de santé."),
        ],
        widths=[3.8, 5.6, 6.2],
        font_size=8.3,
    )

    add_title(doc, "6.2 Compétences acquises", level=2)
    add_body(doc, "L’un des principaux enseignements du stage a été d’accepter qu’un problème visible n’a pas toujours une cause visible. Une simple préférence de langue pouvait venir du stockage de session ; un bouton désactivé pouvait dépendre d’une règle de complétude ; un écran dense pouvait révéler une mauvaise hiérarchie de l’information. Cette recherche de la cause avant la correction est la compétence que je retiens le plus.")
    add_bullets(doc, [
        "analyser un dépôt existant sans perdre les changements déjà réalisés ;",
        "traduire une règle métier en états, autorisations et transactions ;",
        "modéliser une solution avec des diagrammes de cas d’utilisation, de classes et de séquence ;",
        "développer et structurer une API REST avec Spring Boot ;",
        "construire une interface React responsive, accessible et multilingue ;",
        "écrire des tests ciblés et diagnostiquer un comportement dans l’environnement déployé ;",
        "utiliser Git comme mécanisme de traçabilité et de sauvegarde du code ;",
        "conteneuriser et déployer une application full-stack sur Ubuntu dans AWS EC2 ;",
        "documenter des choix techniques et présenter un résultat à des publics différents.",
    ])

    add_title(doc, "6.3 Apports personnels au projet", level=2)
    add_body(doc, "Mes contributions couvrent l’ensemble du produit. Sur le plan fonctionnel, j’ai clarifié les rôles et consolidé les parcours de soumission, prise en charge, correction et validation. Sur le plan technique, j’ai renforcé les contrôles d’accès, la logique de scoring, les notifications, les exports et l’exploitation. Sur le plan visuel, j’ai mené une refonte globale et corrigé des problèmes précis signalés pendant les essais. Chaque fois que cela était possible, j’ai vérifié le résultat directement dans l’application déployée plutôt que de m’arrêter au code compilé.")
    add_bullets(doc, [
        "navigation arrière généralisée et fermeture explicite des formulaires ;",
        "interface de revue adaptative et actions rapprochées du critère ;",
        "préférence de langue isolée par compte ;",
        "correction complète du voile des modales ;",
        "agrandissement des logos au clic ;",
        "suppression de la saisie d’évaluation pour le rôle gouvernement ;",
        "complétion du formulaire de création d’utilisateur avec les données de l’organisme ;",
        "tableaux de bord et navigation adaptés aux quatre rôles ;",
        "construction, sauvegarde Git et déploiement de la version améliorée.",
    ])

    add_title(doc, "6.4 Limites actuelles", level=2)
    add_body(doc, "La version réalisée constitue une base solide, mais plusieurs éléments doivent être renforcés avant un usage institutionnel à grande échelle. Le déploiement de démonstration contient encore des comptes et données de test. La couverture automatisée reste partielle. La supervision, les sauvegardes planifiées et la gestion fine du cycle de vie des fichiers doivent être industrialisées.")

    add_title(doc, "6.5 Perspectives d’évolution", level=2)
    add_table(
        doc,
        ["Priorité", "Évolution proposée", "Bénéfice"],
        [
            ("Court terme", "Activer HTTPS, remplacer les secrets et retirer toutes les données de démonstration.", "Sécuriser la mise en service réelle."),
            ("Court terme", "Ajouter des tests end-to-end sur les parcours des quatre rôles.", "Détecter les régressions de workflow et d’interface."),
            ("Court terme", "Automatiser sauvegardes PostgreSQL et volumes.", "Réduire le risque de perte de données."),
            ("Moyen terme", "Mettre en place une intégration et un déploiement continus.", "Rendre les livraisons reproductibles et traçables."),
            ("Moyen terme", "Stocker les justificatifs dans un service objet compatible S3.", "Améliorer la durabilité, la capacité et la distribution des fichiers."),
            ("Moyen terme", "Ajouter une supervision centralisée et des alertes.", "Réagir rapidement aux erreurs et dégradations."),
            ("Long terme", "Enrichir les analyses comparatives et tendances pluriannuelles.", "Renforcer le pilotage gouvernemental."),
            ("Long terme", "Réaliser un audit d’accessibilité et un test de charge.", "Préparer un usage large et inclusif."),
        ],
        widths=[2.4, 8.0, 5.2],
        font_size=8.2,
    )


def add_conclusion(doc: Document) -> None:
    add_title(doc, "Conclusion générale", level=1)
    add_body(doc, "Le stage effectué au Centre National de l’Informatique a abouti à la consolidation et au déploiement d’une plateforme complète de suivi et d’évaluation de la bonne gouvernance. Le projet répond à un besoin exigeant : guider la saisie d’un référentiel détaillé, associer des preuves à chaque réponse, organiser une revue traçable, traiter les corrections et produire des résultats consolidés.")
    add_body(doc, "La solution s’appuie sur une architecture moderne et maintenable : React et TypeScript pour l’interface, Spring Boot pour l’API et la logique métier, PostgreSQL pour les données, Docker Compose pour l’exécution et AWS EC2 pour l’hébergement. La sécurité combine authentification JWT, rôles et contrôle de propriété des ressources. Le scoring dynamique et les transitions contrôlées assurent la cohérence du résultat.")
    add_body(doc, "Les améliorations réalisées ont également transformé l’expérience utilisateur. Les quatre profils disposent désormais d’un espace mieux adapté à leur mission, d’une navigation réversible, de formulaires complets, d’une préférence de langue propre au compte et d’interfaces plus lisibles. Les défauts visuels signalés ont été corrigés sans dissocier le design des règles métier sous-jacentes.")
    add_body(doc, "Au-delà du produit livré, cette expérience m’a appris à travailler de manière méthodique sur une base de code réelle, à justifier les choix, à protéger les données existantes, à vérifier une version déployée et à documenter le résultat. Les perspectives proposées — HTTPS, tests end-to-end, sauvegardes automatisées, CI/CD et supervision — constituent les prochaines étapes vers une exploitation institutionnelle durable.")


def add_bibliography(doc: Document) -> None:
    add_title(doc, "Bibliographie et webographie", level=1)
    add_body(doc, "Les ressources suivantes ont été consultées pour documenter le contexte institutionnel et les technologies. Date de consultation des ressources en ligne : 23 juillet 2026.")
    refs = [
        "[1] Centre National de l’Informatique, « Présentation du CNI ». https://www.cni.tn/index.php/fr/layout-3/presentation-du-cni-2",
        "[2] Centre National de l’Informatique, « Formation ». https://www.cni.tn/index.php/fr/pages-3/formation",
        "[3] ESPRIT, site institutionnel et présentation de l’approche pédagogique. https://www.esprit.tn/",
        "[4] VMware, Spring Boot Reference Documentation, version 3.2. https://docs.spring.io/spring-boot/",
        "[5] Meta Open Source, React Documentation, « Describing the UI ». https://react.dev/learn/describing-the-ui",
        "[6] Docker, « Docker Compose documentation ». https://docs.docker.com/compose/",
        "[7] Amazon Web Services, « Amazon EC2 Documentation ». https://docs.aws.amazon.com/ec2/",
        "[8] PostgreSQL Global Development Group, PostgreSQL Documentation. https://www.postgresql.org/docs/",
        "[9] OpenAPI Initiative, « OpenAPI Specification ». https://spec.openapis.org/oas/latest.html",
        "[10] OWASP Foundation, « JSON Web Token Cheat Sheet for Java ». https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html",
        "[11] ESPRIT, « Visite virtuelle » — photographie du campus. https://www.esprit.tn/vie-estudiantine/visite-virtuelle/",
        "[12] Leaders, « Fadhel Kraiem : le CNI jouera un rôle central » — photographie du siège du CNI. https://www.leaders.com.tn/article/30963-fadhel-kraiem-le-cni-jouera-un-role-central",
        "[13] i18next, « Extracting translations ». https://www.i18next.com/how-to/extracting-translations",
        "[14] MyMemory, « API technical specifications ». https://mymemory.translated.net/doc/spec.php",
        "[15] LibreTranslate, documentation officielle. https://docs.libretranslate.com/",
        "[16] Icons8, bibliothèque d’icônes technologiques utilisée pour l’illustration des outils. https://icons8.com/icons",
    ]
    for ref in refs:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Cm(0.7)
        p.paragraph_format.first_line_indent = Cm(-0.7)
        p.paragraph_format.space_after = Pt(5)
        p.add_run(ref)


def add_appendices(doc: Document) -> None:
    add_title(doc, "Annexes", level=1)
    add_callout(doc, "Contenu", "Les annexes regroupent les principaux points d’entrée de l’API, les transitions de statut, une procédure d’installation et un glossaire métier.")

    add_title(doc, "Annexe A — Principaux points d’entrée REST", level=2)
    add_table(
        doc,
        ["Domaine", "Méthode et route", "Usage"],
        [
            ("Authentification", "POST /auth/login", "Connexion et émission des jetons."),
            ("Authentification", "POST /auth/refresh", "Renouvellement du jeton d’accès."),
            ("Comptes", "POST /account-requests", "Dépôt public d’une demande de compte."),
            ("Administration", "GET /admin/users", "Liste paginée des utilisateurs."),
            ("Administration", "POST /admin/users/with-organisme", "Création d’un utilisateur et de son organisme."),
            ("Organismes", "GET /organismes/{id}", "Consultation autorisée d’un organisme."),
            ("Référentiel", "GET /principes", "Lecture des principes, bonnes pratiques et critères."),
            ("Évaluations", "POST /evaluations", "Création d’une évaluation."),
            ("Évaluations", "PUT /evaluations/{id}/submit", "Soumission après contrôle de complétude."),
            ("Évaluations", "PUT /evaluations/{id}/claim", "Prise en charge de la validation."),
            ("Évaluations", "PUT /evaluations/{id}/validate", "Validation finale et calcul du score."),
            ("Évaluations", "PUT /evaluations/{id}/request-correction", "Retour ciblé vers l’utilisateur."),
            ("Réponses", "POST /reponses/evaluation/{id}", "Sauvegarde d’un lot de réponses."),
            ("Réponses", "PUT /reponses/{id}/validate", "Validation d’une réponse."),
            ("Réponses", "PUT /reponses/{id}/reject", "Rejet d’une réponse avec motif."),
            ("Fichiers", "POST /files ou route de téléversement", "Ajout d’un justificatif autorisé."),
            ("Notifications", "GET /notifications", "Liste et état de lecture."),
            ("Rapports", "GET /reports/evaluations/{id}/pdf", "Téléchargement du rapport PDF."),
            ("Pilotage", "GET /dashboard/...", "KPI, distributions et classement."),
        ],
        widths=[3.1, 6.0, 6.5],
        font_size=7.9,
    )

    add_title(doc, "Annexe B — Matrice des transitions", level=2)
    add_table(
        doc,
        ["État initial", "Action", "Acteur", "État final"],
        [
            ("EN_COURS", "Soumettre", "Utilisateur / administrateur autorisé", "SOUMISE"),
            ("SOUMISE", "Prendre en charge", "Évaluateur / administrateur", "EN_VALIDATION"),
            ("SOUMISE ou EN_VALIDATION", "Demander correction", "Propriétaire du verrou", "EN_COURS"),
            ("SOUMISE ou EN_VALIDATION", "Valider toutes les réponses et le dossier", "Propriétaire du verrou", "VALIDEE"),
            ("SOUMISE ou EN_VALIDATION", "Rejeter le dossier", "Propriétaire du verrou", "REJETEE"),
            ("EN_VALIDATION", "Libérer ou expirer le verrou", "Système / propriétaire", "SOUMISE"),
        ],
        widths=[3.6, 5.0, 4.2, 2.8],
        font_size=8.4,
    )

    add_title(doc, "Annexe C — Installation locale synthétique", level=2)
    add_bullets(doc, [
        "installer Git et Docker avec le module Docker Compose ;",
        "cloner le dépôt puis se placer à sa racine ;",
        "copier le fichier d’exemple des variables d’environnement et définir les secrets locaux ;",
        "démarrer l’ensemble avec la commande Docker Compose du projet ;",
        "attendre que PostgreSQL et le back-end soient déclarés sains ;",
        "ouvrir l’adresse du front-end, puis vérifier la connexion avec un compte de test ;",
        "consulter les journaux des services si un healthcheck échoue.",
    ], numbered=True)
    p = doc.add_paragraph(style="Code technique")
    p.add_run("docker compose up -d --build")
    p = doc.add_paragraph(style="Code technique")
    p.add_run("docker compose ps")
    p = doc.add_paragraph(style="Code technique")
    p.add_run("docker compose logs --tail=200 backend")

    add_title(doc, "Annexe D — Glossaire métier", level=2)
    add_table(
        doc,
        ["Terme", "Définition"],
        [
            ("Principe", "Axe majeur du référentiel de gouvernance."),
            ("Bonne pratique", "Ensemble cohérent de pratiques rattachées à un principe."),
            ("Critère", "Question ou exigence élémentaire qui reçoit un niveau, un commentaire et des preuves."),
            ("Réponse", "État renseigné par l’organisme pour un critère donné dans une évaluation."),
            ("Justificatif", "Fichier ou lien permettant d’étayer une réponse."),
            ("Évaluation", "Dossier annuel d’un organisme couvrant le référentiel actif."),
            ("Validateur", "Évaluateur ou administrateur autorisé qui examine le dossier."),
            ("Maturité", "Catégorie synthétique dérivée du score global."),
            ("Verrou", "Mécanisme qui réserve temporairement une validation à un utilisateur."),
            ("Audit", "Trace horodatée d’une opération sensible."),
        ],
        widths=[3.8, 11.8],
        font_size=8.7,
    )

    add_title(doc, "Annexe E — Livrables UML", level=2)
    add_body(doc, "Les fichiers sources et les exports des diagrammes de classes, de cas d’utilisation et de séquence sont conservés avec le projet. Le diagramme de classes officiel a été converti depuis SVG vers PNG haute résolution sans modification de son contenu. Le diagramme de cas d’utilisation est décliné en quatre vues indépendantes — administrateur, utilisateur, évaluateur et gouvernement — tandis que les séquences sont réparties en quatre scénarios séparés afin de faciliter leur lecture et leur présentation.")

    add_title(doc, "Annexe F — Checklist avant mise en production", level=2)
    add_bullets(doc, [
        "supprimer les comptes, principes et données de démonstration ;",
        "activer HTTPS et contrôler les redirections ;",
        "remplacer tous les secrets et vérifier qu’aucun n’est suivi par Git ;",
        "tester les quatre rôles avec des comptes de recette ;",
        "exécuter la suite Maven et la construction Vite ;",
        "sauvegarder PostgreSQL et les justificatifs ;",
        "vérifier les limites de taille et types de fichiers ;",
        "contrôler le journal d’audit, la file de courriels et les notifications ;",
        "préparer la procédure de rollback et identifier le commit déployé ;",
        "documenter le responsable d’exploitation et le canal de support.",
    ])


def build_document() -> Document:
    doc = Document()
    configure_styles(doc)
    props = doc.core_properties
    props.title = "Rapport de stage d’été — Plateforme SSE"
    props.subject = "Conception, réalisation et déploiement d’une plateforme de suivi et d’évaluation de la bonne gouvernance"
    props.author = "Khelifl Mohamed Anas"
    props.last_modified_by = "Khelifl Mohamed Anas"
    props.revision = 1
    props.created = datetime(2026, 7, 23, 12, 0, tzinfo=timezone.utc)
    props.modified = datetime(2026, 7, 23, 12, 0, tzinfo=timezone.utc)
    props.keywords = "SSE, CNI, ESPRIT, gouvernance, Spring Boot, React, Docker, AWS"
    props.comments = "Rapport académique — année universitaire 2025-2026"
    add_cover(doc)
    add_front_matter(doc)
    add_main_report(doc)
    add_chapter_1(doc)
    add_chapter_2(doc)
    add_chapter_3(doc)
    add_chapter_4(doc)
    add_chapter_5(doc)
    add_chapter_6(doc)
    add_conclusion(doc)
    add_bibliography(doc)
    add_appendices(doc)
    return doc


if __name__ == "__main__":
    document = build_document()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document.save(OUTPUT)
    print(OUTPUT)
