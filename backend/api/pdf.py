"""PDF receipt generation utilities for customer and admin order downloads."""
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

BROWN_LIGHT_BG = colors.HexColor("#F5EFE6")
BROWN_ACCENT = colors.HexColor("#5C4033")
WOOD_GOLD = colors.HexColor("#D2B48C")
TEXT_DARK = colors.HexColor("#2C1A0E")
TEXT_DIM = colors.HexColor("#9E8C7A")


def _draw_watermark(canvas_obj, _doc):
    """Draw tiled CalmTable watermark on each page."""
    canvas_obj.saveState()
    canvas_obj.setFont("Helvetica-Bold", 48)
    canvas_obj.setFillColor(WOOD_GOLD)
    canvas_obj.setFillAlpha(0.07)
    width, height = A4
    canvas_obj.translate(width / 2, height / 2)
    canvas_obj.rotate(35)
    for x in range(-3, 4):
        for y in range(-3, 4):
            canvas_obj.drawCentredString(x * 200, y * 140, "CALM TABLE")
    canvas_obj.restoreState()


def generate_receipt_pdf(order) -> BytesIO:
    """Build and return a branded PDF receipt buffer for an order."""
    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=22 * mm,
        bottomMargin=22 * mm,
    )

    styles = getSampleStyleSheet()

    def style(name, **kwargs):
        return ParagraphStyle(name, parent=styles["Normal"], **kwargs)

    h1 = style(
        "h1",
        fontName="Helvetica-Bold",
        fontSize=26,
        textColor=BROWN_ACCENT,
        alignment=TA_CENTER,
        spaceAfter=2,
    )
    sub = style(
        "sub",
        fontName="Helvetica",
        fontSize=10,
        textColor=WOOD_GOLD,
        alignment=TA_CENTER,
        spaceAfter=6,
    )
    label = style("label", fontName="Helvetica-Bold", fontSize=9, textColor=TEXT_DIM)
    value = style("value", fontName="Helvetica", fontSize=10, textColor=TEXT_DARK)
    total_style = style(
        "total",
        fontName="Helvetica-Bold",
        fontSize=13,
        textColor=BROWN_ACCENT,
        alignment=TA_RIGHT,
    )
    footer = style(
        "footer",
        fontName="Helvetica",
        fontSize=8,
        textColor=TEXT_DIM,
        alignment=TA_CENTER,
    )

    story = [
        Paragraph("The CalmTable", h1),
        Paragraph("Dine with Dignity · Luwinga, Mzuzu, Malawi", sub),
        HRFlowable(width="100%", thickness=1.5, color=WOOD_GOLD, spaceAfter=12),
    ]

    meta_rows = [
        [
            Paragraph("ORDER NUMBER", label),
            Paragraph(order.order_number, value),
            Paragraph("DATE", label),
            Paragraph(order.created_at.strftime("%d %b %Y  %H:%M"), value),
        ],
        [
            Paragraph("CUSTOMER", label),
            Paragraph(order.customer_name or "Guest", value),
            Paragraph("STATUS", label),
            Paragraph(order.get_status_display().upper(), value),
        ],
        [
            Paragraph("EMAIL", label),
            Paragraph(order.customer_email or "—", value),
            Paragraph("", label),
            Paragraph("", value),
        ],
    ]
    meta_table = Table(meta_rows, colWidths=[35 * mm, 65 * mm, 30 * mm, 55 * mm])
    meta_table.setStyle(
        TableStyle(
            [
                ("ROWBACKGROUNDS", (0, 0), (-1, -1), [BROWN_LIGHT_BG, colors.white]),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.extend([meta_table, Spacer(1, 8 * mm)])

    story.append(
        Paragraph(
            "ORDER ITEMS",
            style("sec", fontName="Helvetica-Bold", fontSize=9, textColor=WOOD_GOLD, spaceAfter=5),
        )
    )

    rows = [
        [
            Paragraph("ITEM", style("th", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white)),
            Paragraph("QTY", style("th2", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white, alignment=TA_CENTER)),
            Paragraph("UNIT PRICE", style("th3", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white, alignment=TA_RIGHT)),
            Paragraph("SUBTOTAL", style("th4", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white, alignment=TA_RIGHT)),
        ]
    ]

    for item in order.items.all():
        item_name = item.item_name or (item.menu_item.name if item.menu_item else "Menu Item")
        rows.append(
            [
                Paragraph(item_name, value),
                Paragraph(str(item.quantity), style("qty", fontSize=10, textColor=TEXT_DARK, alignment=TA_CENTER)),
                Paragraph(f"MK {item.item_price:,.0f}", style("price", fontSize=10, textColor=TEXT_DARK, alignment=TA_RIGHT)),
                Paragraph(f"MK {item.subtotal:,.0f}", style("subtotal", fontSize=10, textColor=TEXT_DARK, alignment=TA_RIGHT)),
            ]
        )

    items_table = Table(rows, colWidths=[85 * mm, 20 * mm, 40 * mm, 40 * mm])
    items_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BROWN_ACCENT),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BROWN_LIGHT_BG]),
                ("GRID", (0, 0), (-1, -1), 0.4, WOOD_GOLD),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.extend([items_table, Spacer(1, 6 * mm)])

    total_table = Table([[Paragraph(f"TOTAL  MK {order.total_amount:,.0f}", total_style)]], colWidths=[185 * mm])
    total_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), BROWN_LIGHT_BG),
                ("TOPPADDING", (0, 0), (0, 0), 10),
                ("BOTTOMPADDING", (0, 0), (0, 0), 10),
                ("RIGHTPADDING", (0, 0), (0, 0), 10),
                ("LINEABOVE", (0, 0), (0, 0), 1.5, WOOD_GOLD),
            ]
        )
    )
    story.extend([total_table, Spacer(1, 12 * mm)])
    story.extend(
        [
            HRFlowable(width="100%", thickness=0.5, color=WOOD_GOLD, spaceAfter=8),
            Paragraph("Thank you for dining with us. The CalmTable — Dine with Dignity.", footer),
            Paragraph("hello@calmtable.mw · +265 999 000 000 · Luwinga, Mzuzu, Malawi", footer),
        ]
    )

    document.build(story, onFirstPage=_draw_watermark, onLaterPages=_draw_watermark)
    buffer.seek(0)
    return buffer
