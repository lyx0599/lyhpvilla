from pathlib import Path
import sys

from PIL import Image, ImageDraw, ImageFont


source = Path(sys.argv[1])
output = Path(sys.argv[2])
columns = int(sys.argv[3]) if len(sys.argv) > 3 else 4
files = sorted(source.glob("*.png"))
if not files:
    raise SystemExit(f"no PNG files in {source}")

thumb_width = 420
thumb_height = 560
caption_height = 42
rows = (len(files) + columns - 1) // columns
sheet = Image.new("RGB", (columns * thumb_width, rows * (thumb_height + caption_height)), "#eee9e1")
draw = ImageDraw.Draw(sheet)
font = ImageFont.load_default(size=18)

for index, file in enumerate(files):
    image = Image.open(file).convert("RGB")
    image.thumbnail((thumb_width, thumb_height), Image.Resampling.LANCZOS)
    x = (index % columns) * thumb_width + (thumb_width - image.width) // 2
    y = (index // columns) * (thumb_height + caption_height) + (thumb_height - image.height) // 2
    sheet.paste(image, (x, y))
    draw.text((index % columns * thumb_width + 12, y + image.height + 8), file.stem, fill="#302923", font=font)

output.parent.mkdir(parents=True, exist_ok=True)
sheet.save(output, quality=92)
print(output)
