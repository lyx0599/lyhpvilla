from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "artifacts/1f-final-ten-views-v8/boards/01-1f-furniture-plan.png"
OUTPUT = ROOT / "artifacts/1f-final-ten-views-v8/boards/02-1f-camera-map.png"
WORKSPACE = ROOT / "data/default-workspace.json"

workspace = json.loads(WORKSPACE.read_text(encoding="utf-8"))
camera_ids = [
    "designer-camera-1f-01-foyer-entry",
    "designer-camera-1f-02-foyer-living",
    "designer-camera-1f-03-living-overview",
    "designer-camera-1f-04-living-sofa",
    "designer-camera-1f-05-living-daylight",
    "designer-camera-1f-06-kitchen-entry",
    "designer-camera-1f-07-kitchen-worktop",
    "designer-camera-1f-08-kitchen-living-link",
    "designer-camera-1f-09-bedroom",
    "designer-camera-1f-10-stair-public-route",
]
cameras = {item["id"]: item for item in workspace["cameraViews"]}

image = Image.open(SOURCE).convert("RGBA")
overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
draw = ImageDraw.Draw(overlay)

font_path = "/System/Library/Fonts/STHeiti Medium.ttc"
font_num = ImageFont.truetype(font_path, 17)
font_title = ImageFont.truetype(font_path, 24)
font_legend = ImageFont.truetype(font_path, 16)
font_small = ImageFont.truetype(font_path, 13)

# Pixel bounds of the 12,000 x 9,000 mm model coordinate system in the saved plan screenshot.
plan_left, plan_top, plan_right, plan_bottom = 438, 74, 766, 587

def scene_to_pixel(point):
    x = plan_left + (point["x"] + 6.0) / 12.0 * (plan_right - plan_left)
    y = plan_top + (point["z"] + 4.5) / 9.0 * (plan_bottom - plan_top)
    return int(round(x)), int(round(y))

colors = {
    1: "#D58A22", 2: "#D58A22",
    3: "#C85B3C", 4: "#C85B3C", 5: "#C85B3C", 8: "#C85B3C",
    6: "#2878B5", 7: "#2A9D8F", 9: "#7657A6", 10: "#B33A3A",
}

for number, camera_id in enumerate(camera_ids, start=1):
    camera = cameras[camera_id]
    start = scene_to_pixel(camera["cameraPosition"])
    end = scene_to_pixel(camera["target"])
    color = colors[number]
    draw.line([start, end], fill=color, width=5)
    draw.line([start, end], fill="white", width=1)
    # Arrow head.
    dx, dy = end[0] - start[0], end[1] - start[1]
    length = max(1, (dx * dx + dy * dy) ** 0.5)
    ux, uy = dx / length, dy / length
    px, py = -uy, ux
    tip = end
    wing_a = (int(end[0] - ux * 15 + px * 8), int(end[1] - uy * 15 + py * 8))
    wing_b = (int(end[0] - ux * 15 - px * 8), int(end[1] - uy * 15 - py * 8))
    draw.polygon([tip, wing_a, wing_b], fill=color)
    radius = 14
    draw.ellipse([start[0]-radius, start[1]-radius, start[0]+radius, start[1]+radius], fill=color, outline="white", width=2)
    label = str(number)
    box = draw.textbbox((0, 0), label, font=font_num)
    draw.text((start[0]-(box[2]-box[0])/2, start[1]-(box[3]-box[1])/2-1), label, font=font_num, fill="white")

# Legend uses the otherwise blank left side of the exported editor screenshot.
draw.rounded_rectangle([68, 72, 392, 540], radius=18, fill=(255, 252, 247, 236), outline=(84, 73, 63, 120), width=2)
draw.text((88, 91), "1F 十机位 · 圆点为机位 / 箭头为朝向", font=font_title, fill="#2F2924")
legend = [
    "01  入户三向关系",
    "02  北院玻璃门与挂衣板",
    "03  客餐厅与电动圆桌",
    "04  沙发正对电视壁炉",
    "05  水吧正立面",
    "06  厨房入口与客卫关系",
    "07  客卫正面",
    "08  厨房朝南看客餐厅",
    "09  卧室与飘窗",
    "10  左下B1 / 右上2F与卧室门",
]
for index, item in enumerate(legend, start=1):
    y = 139 + (index - 1) * 36
    color = colors[index]
    draw.ellipse([88, y+2, 106, y+20], fill=color)
    draw.text((116, y), item, font=font_legend, fill="#3C342D")

draw.text((88, 505), "北院在上 · 南院在下 · 主入户在西侧", font=font_small, fill="#6D6258")

result = Image.alpha_composite(image, overlay).convert("RGB")
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
result.save(OUTPUT, quality=94)
print(OUTPUT)
