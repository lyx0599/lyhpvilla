from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path("/Users/lyx/Documents/林屿湖畔/artifacts/1f-ten-cameras-current-model-v14-20260811")
FINAL = ROOT / "final"
OUTPUT = ROOT / "boards" / "02-final-10-camera-contact-sheet.jpg"

ITEMS = [
    ("01-entry-three-way.png", "01 入户三向关系", "左侧北院玻璃门｜正前玄关｜右侧客厅"),
    ("02-foyer-to-living.png", "02 玄关回看客厅", "玄关前场进入客餐厅的真实视线"),
    ("03-living-dining-electric-table.png", "03 客餐厅全景", "水吧｜电动转盘圆桌｜弧形沙发｜双壁龛电视墙"),
    ("04-sofa-facing-tv.png", "04 沙发正对电视墙", "左右等宽木质壁龛｜电视、悬浮柜、壁炉同轴"),
    ("05-waterbar-front.png", "05 水吧正面", "上下柜｜深色台面｜木格栅｜咖啡机与小水槽"),
    ("06-kitchen-and-bath-door.png", "06 厨房入口", "U 形厨房｜右侧操作台吊柜｜客卫门与厨房墙平行"),
    ("07-kitchen-to-living.png", "07 厨房回看客厅", "餐桌、沙发、电视墙与南院玻璃门的前后关系"),
    ("08-guest-bathroom.png", "08 一楼客卫", "约 1814×2700 mm 窄长尺度｜北窗｜台盆、马桶、淋浴"),
    ("09-stair-system.png", "09 楼梯系统", "左侧下 B1｜右侧上 2F｜右边保持连续实墙"),
    ("10-small-bedroom-open-valet.png", "10 一楼卧室", "1.5 m 床｜飘窗柜｜东墙开放衣架｜门扇贴墙开启"),
]

W = 3200
MARGIN = 80
GAP_X = 60
GAP_Y = 70
COLS = 2
CELL_W = (W - 2 * MARGIN - GAP_X) // COLS
IMAGE_H = 920
TEXT_H = 145
HEADER_H = 190
ROWS = 5
H = HEADER_H + MARGIN + ROWS * (IMAGE_H + TEXT_H) + (ROWS - 1) * GAP_Y + MARGIN


def font(size: int, bold: bool = False):
    candidates = [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/STHeiti Medium.ttc" if bold else "/System/Library/Fonts/STHeiti Light.ttc",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size=size, index=1 if bold and candidate.endswith(".ttc") else 0)
    return ImageFont.load_default()


canvas = Image.new("RGB", (W, H), "#f5f1e9")
draw = ImageDraw.Draw(canvas)
draw.text((MARGIN, 58), "1F 十机位写实效果总览", fill="#2f2922", font=font(62, True))
draw.text((MARGIN, 132), "2D 锁定户型｜当前 3D 锁定机位与物件顺序｜统一材质与自然视角", fill="#786b5e", font=font(30))

for idx, (filename, title, note) in enumerate(ITEMS):
    row, col = divmod(idx, COLS)
    x = MARGIN + col * (CELL_W + GAP_X)
    y = HEADER_H + MARGIN + row * (IMAGE_H + TEXT_H + GAP_Y)
    img = Image.open(FINAL / filename).convert("RGB")
    scale = min(CELL_W / img.width, IMAGE_H / img.height)
    size = (round(img.width * scale), round(img.height * scale))
    img = img.resize(size, Image.Resampling.LANCZOS)
    panel = Image.new("RGB", (CELL_W, IMAGE_H), "#ddd6ca")
    panel.paste(img, ((CELL_W - size[0]) // 2, (IMAGE_H - size[1]) // 2))
    canvas.paste(panel, (x, y))
    draw.text((x, y + IMAGE_H + 22), title, fill="#342c25", font=font(34, True))
    draw.text((x, y + IMAGE_H + 74), note, fill="#75695d", font=font(25))

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
canvas.save(OUTPUT, quality=94, subsampling=0)
print(OUTPUT)
