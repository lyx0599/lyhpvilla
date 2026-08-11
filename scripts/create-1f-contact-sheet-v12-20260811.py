from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "artifacts/1f-final-ten-views-v12/final"
OUTPUT = ROOT / "artifacts/1f-final-ten-views-v12/boards/03-final-render-contact-sheet.png"

files = sorted(SOURCE.glob("*.png"))
if len(files) != 10:
    raise SystemExit(f"expected 10 renders, found {len(files)}")

font_path = "/System/Library/Fonts/STHeiti Medium.ttc"
font_title = ImageFont.truetype(font_path, 34)
font_caption = ImageFont.truetype(font_path, 20)
font_note = ImageFont.truetype(font_path, 16)

labels = [
    "01 入户三向关系",
    "02 玄关朝东南看客厅",
    "03 客餐厅与六人电动圆桌",
    "04 沙发正对电视壁炉",
    "05 水吧正立面",
    "06 厨房入口与900mm客卫门",
    "07 厨房朝南看客餐厅",
    "08 窄长客卫与北窗",
    "09 左下B1 / 右上2F与唯一卧室门",
    "10 1.5m床与700mm半开放衣帽架",
]

columns = 2
cell_w, image_h, caption_h = 720, 405, 54
margin, gap = 36, 24
header_h = 108
rows = 5
sheet_w = margin * 2 + columns * cell_w + gap
sheet_h = header_h + margin + rows * (image_h + caption_h + gap) - gap + margin
sheet = Image.new("RGB", (sheet_w, sheet_h), "#F1ECE4")
draw = ImageDraw.Draw(sheet)

draw.text((margin, 28), "1F 十机位写实效果图 · V12", font=font_title, fill="#2F2924")
draw.text(
    (margin, 72),
    "前九个已确认机位保持不变；10号同步为最新半开放衣帽架卧室。",
    font=font_note,
    fill="#786B60",
)

for index, (file, label) in enumerate(zip(files, labels)):
    row, column = divmod(index, columns)
    x = margin + column * (cell_w + gap)
    y = header_h + margin + row * (image_h + caption_h + gap)
    source = Image.open(file).convert("RGB")
    framed = ImageOps.fit(
        source,
        (cell_w, image_h),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    )
    sheet.paste(framed, (x, y))
    draw.rectangle([x, y, x + cell_w - 1, y + image_h - 1], outline="#C8BEB2", width=1)
    draw.text((x + 12, y + image_h + 13), label, font=font_caption, fill="#382F29")

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
sheet.save(OUTPUT, quality=94)
print(OUTPUT)
