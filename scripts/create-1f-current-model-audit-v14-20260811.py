from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "artifacts/1f-ten-cameras-current-model-v14-20260811/base-3d"
CROPPED = ROOT / "artifacts/1f-ten-cameras-current-model-v14-20260811/base-3d-cropped"
BOARD = ROOT / "artifacts/1f-ten-cameras-current-model-v14-20260811/boards/01-current-3d-camera-audit.png"

LABELS = [
    "01 入户三向关系",
    "02 玄关朝东南看客厅",
    "03 客餐厅整体与电动圆桌",
    "04 沙发正对电视壁炉",
    "05 水吧正立面",
    "06 厨房入口与净通道",
    "07 厨房朝南看客餐厅",
    "08 客卫正面",
    "09 左下B1 / 右上2F楼梯系统",
    "10 小卧室与半开放衣帽架",
]

files = sorted(SOURCE.glob("[0-9][0-9]-*.png"))
if len(files) != 10:
    raise SystemExit(f"expected 10 model captures, found {len(files)}")

CROPPED.mkdir(parents=True, exist_ok=True)
cropped_files = []
for source in files:
    image = Image.open(source).convert("RGB")
    # Remove the editor chrome while preserving the entire 3D viewport.
    cropped = image.crop((191, 52, 1208, 693))
    destination = CROPPED / source.name
    cropped.save(destination, quality=95)
    cropped_files.append(destination)

font_path = "/System/Library/Fonts/STHeiti Medium.ttc"
title_font = ImageFont.truetype(font_path, 32)
caption_font = ImageFont.truetype(font_path, 18)
note_font = ImageFont.truetype(font_path, 15)
columns = 2
cell_w, image_h, caption_h = 720, 454, 48
margin, gap, header_h = 34, 22, 104
rows = 5
board_w = margin * 2 + columns * cell_w + gap
board_h = header_h + margin + rows * (image_h + caption_h + gap) - gap + margin
board = Image.new("RGB", (board_w, board_h), "#F2EEE8")
draw = ImageDraw.Draw(board)
draw.text((margin, 24), "1F 当前3D模型 · 十机位底图审计", font=title_font, fill="#2F2924")
draw.text((margin, 67), "仅检查几何、门窗、家具和机位，不把材质精度作为判断依据。", font=note_font, fill="#786B60")

for index, (file, label) in enumerate(zip(cropped_files, LABELS)):
    row, column = divmod(index, columns)
    x = margin + column * (cell_w + gap)
    y = header_h + margin + row * (image_h + caption_h + gap)
    image = Image.open(file).convert("RGB")
    frame = ImageOps.fit(image, (cell_w, image_h), method=Image.Resampling.LANCZOS)
    board.paste(frame, (x, y))
    draw.rectangle((x, y, x + cell_w - 1, y + image_h - 1), outline="#C9BEB1", width=1)
    draw.text((x + 10, y + image_h + 11), label, font=caption_font, fill="#382F29")

BOARD.parent.mkdir(parents=True, exist_ok=True)
board.save(BOARD, quality=94)
print(BOARD)
