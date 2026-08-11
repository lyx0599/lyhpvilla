import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SMALL_WARDROBE = os.getenv("LYH_SMALL_WARDROBE") == "1"
REFINED_WARDROBE = os.getenv("LYH_REFINED_WARDROBE") == "1"
VALET_CABINET = os.getenv("LYH_VALET_CABINET") == "1"
OPEN_VALET = os.getenv("LYH_OPEN_VALET") == "1"
VALET_CABINET = VALET_CABINET or OPEN_VALET
SMALL_WARDROBE = SMALL_WARDROBE or REFINED_WARDROBE or VALET_CABINET
OUT = ROOT / "artifacts" / ("1f-bedroom-open-valet-rack-20260811" if OPEN_VALET else "1f-bedroom-light-valet-cabinet-20260811" if VALET_CABINET else "1f-bedroom-refined-fixed-cameras-20260810" if REFINED_WARDROBE else "1f-bedroom-small-wardrobe-20260810" if SMALL_WARDROBE else "1f-bedroom-showroom-layout-20260810")
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1600, 1420
img = Image.new("RGB", (W, H), "#f6f2eb")
d = ImageDraw.Draw(img)

FONT = "/System/Library/Fonts/STHeiti Medium.ttc"
FONT_LIGHT = "/System/Library/Fonts/STHeiti Light.ttc"
title = ImageFont.truetype(FONT, 46)
subtitle = ImageFont.truetype(FONT_LIGHT, 24)
label = ImageFont.truetype(FONT, 24)
small = ImageFont.truetype(FONT_LIGHT, 20)
tiny = ImageFont.truetype(FONT_LIGHT, 17)

d.text((80, 55), "1F卧室｜1.5米床＋半开放酒店衣帽架" if OPEN_VALET else "1F卧室｜1.5米床＋轻量酒店衣帽柜" if VALET_CABINET else "1F卧室｜1.5米床＋精品酒店衣帽塔" if REFINED_WARDROBE else "1F卧室｜1.5米床＋酒店式临时衣柜" if SMALL_WARDROBE else "1F卧室｜样板间式床柜平行布置", fill="#2c2823", font=title)
d.text((82, 118), "严格净尺寸 2947 × 2650 mm · 北侧门洞已向东调整", fill="#746c62", font=subtitle)

scale = 0.34
ox, oy = 270, 315
rw, rh = 2947 * scale, 2650 * scale

def p(x, y):
    return ox + x * scale, oy + y * scale

def rect_mm(x1, y1, x2, y2, fill, outline, width=3, radius=0):
    box = (*p(x1, y1), *p(x2, y2))
    if radius:
        d.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)
    else:
        d.rectangle(box, fill=fill, outline=outline, width=width)

def line_mm(points, fill, width=3):
    d.line([p(x, y) for x, y in points], fill=fill, width=width)

def dim_h(x1, x2, y, text, color="#756c61"):
    x1p, yp = p(x1, y); x2p, _ = p(x2, y)
    d.line((x1p, yp, x2p, yp), fill=color, width=2)
    for xp, sign in ((x1p, 1), (x2p, -1)):
        d.line((xp, yp, xp + sign * 12, yp - 7), fill=color, width=2)
        d.line((xp, yp, xp + sign * 12, yp + 7), fill=color, width=2)
    box = d.textbbox((0, 0), text, font=tiny)
    tw = box[2] - box[0]
    d.rounded_rectangle(( (x1p+x2p-tw)/2-8, yp-15, (x1p+x2p+tw)/2+8, yp+15), radius=8, fill="#f6f2eb")
    d.text(((x1p+x2p-tw)/2, yp-11), text, fill=color, font=tiny)

def dim_v(y1, y2, x, text, color="#756c61"):
    xp, y1p = p(x, y1); _, y2p = p(x, y2)
    d.line((xp, y1p, xp, y2p), fill=color, width=2)
    for yp, sign in ((y1p, 1), (y2p, -1)):
        d.line((xp, yp, xp - 7, yp + sign * 12), fill=color, width=2)
        d.line((xp, yp, xp + 7, yp + sign * 12), fill=color, width=2)
    box = d.textbbox((0, 0), text, font=tiny)
    tw, th = box[2] - box[0], box[3] - box[1]
    tile = Image.new("RGBA", (tw + 18, th + 14), (0, 0, 0, 0))
    td = ImageDraw.Draw(tile)
    td.rounded_rectangle((0, 0, tw + 17, th + 13), radius=7, fill="#f6f2eb")
    td.text((9, 5-box[1]), text, fill=color, font=tiny)
    tile = tile.rotate(90, expand=True, resample=Image.Resampling.BICUBIC)
    img.paste(tile, (int(xp-tile.width/2), int((y1p+y2p)/2-tile.height/2)), tile)

# Outdoor stair-side context above the bedroom wall.
d.rounded_rectangle((ox-40, oy-130, ox+rw+40, oy-55), radius=18, fill="#ddd8cf")
d.text((ox+20, oy-111), "楼梯侧公共区域（门不得外开）", fill="#625b53", font=small)

# Floor area and walls. North wall is split at relocated 900 mm door opening.
d.rectangle((ox, oy, ox+rw, oy+rh), fill="#faf8f3")
wall = "#403a34"
ww = 18
d.line((ox, oy, ox+1947*scale, oy), fill=wall, width=ww)
d.line((ox+2847*scale, oy, ox+rw, oy), fill=wall, width=ww)
d.line((ox, oy, ox, oy+rh), fill=wall, width=ww)
d.line((ox+rw, oy, ox+rw, oy+rh), fill=wall, width=ww)
# South wall split for 1200 mm bay window.
d.line((ox, oy+rh, ox+988*scale, oy+rh), fill=wall, width=ww)
d.line((ox+2188*scale, oy+rh, ox+rw, oy+rh), fill=wall, width=ww)

# Headboard ledge, bed, wardrobe and bay storage.
rect_mm(0, 0, 1700, 130, "#6d5140" if REFINED_WARDROBE else "#c9a477", "#49362b" if REFINED_WARDROBE else "#8b6b49", 3)
d.text(p(250, 28), "1700×130 长条台", fill="#5e4935", font=tiny)

rect_mm(100, 130, 1600, 2130, "#ddd0bd", "#8f7b63", 4, 20)
# Headboard and pillows.
line_mm([(160, 210), (1540, 210)], "#9c8264", 13)
rect_mm(250, 310, 790, 650, "#f7f3eb", "#c8bba8", 2, 18)
rect_mm(910, 310, 1450, 650, "#f7f3eb", "#c8bba8", 2, 18)
d.text(p(470, 1030), "1500×2000 床", fill="#554b40", font=label)
d.text(p(455, 1130), "床头朝北｜床尾朝飘窗", fill="#7a6c5d", font=tiny)

wardrobe_y1, wardrobe_y2 = ((1000, 1700) if SMALL_WARDROBE else (950, 2150))
wardrobe_x1 = 2497 if VALET_CABINET else 2397
rect_mm(wardrobe_x1, wardrobe_y1, 2947, wardrobe_y2, "#8f7f6c" if REFINED_WARDROBE or VALET_CABINET else "#b9a98f", "#49362b" if REFINED_WARDROBE or VALET_CABINET else "#66594a", 4)
for y in ((1350,) if SMALL_WARDROBE else (1350, 1750)):
    line_mm([(wardrobe_x1, y), (2947, y)], "#81735f", 2)
wardrobe_chars = "半开放衣帽架" if OPEN_VALET else "轻量衣帽柜" if VALET_CABINET else "衣帽塔" if REFINED_WARDROBE else "临时衣柜" if SMALL_WARDROBE else "东墙移门衣柜"
wardrobe_label_y = wardrobe_y1 + (wardrobe_y2 - wardrobe_y1 - len(wardrobe_chars) * 75) / 2
for i, ch in enumerate(wardrobe_chars):
    d.text(p(2505, wardrobe_label_y + i * 75), ch, fill="#443b32", font=small)

# Bay projection and storage seat.
rect_mm(988, 2650, 2188, 3200, "#d8e5e1", "#62867d", 4)
rect_mm(1018, 2720, 2158, 3140, "#d9bd96", "#917151", 3)
d.text(p(1200, 2860), "1200×550 飘窗收纳", fill="#5d4b37", font=small)

# Door leaf: hinge at east side, opening inward against east wall.
hinge = p(2847, 0)
leaf_end = p(2847, 900)
d.line((*hinge, *leaf_end), fill="#3f7c75", width=8)
arc_box = (hinge[0]-900*scale, hinge[1], hinge[0]+900*scale, hinge[1]+1800*scale)
d.arc(arc_box, 180, 270, fill="#3f7c75", width=3)
d.ellipse((hinge[0]-7, hinge[1]-7, hinge[0]+7, hinge[1]+7), fill="#3f7c75")
d.text((ox+2050*scale, oy-43), "900门洞", fill="#2f6d67", font=small)

# Key dimensions.
dim_h(0, 2947, -215, "2947")
dim_v(0, 2650, -185, "2650")
dim_h(1600, wardrobe_x1, 2260, "897 柜前通道" if VALET_CABINET else "797 柜前通道", "#2f746c")
dim_v(2130, 2650, 1730, "520 床尾", "#2f746c")
dim_v(900, wardrobe_y1, 3020, "100" if SMALL_WARDROBE else "50", "#a05f47")

# North arrow and legend.
d.polygon([(1320, 215), (1305, 248), (1335, 248)], fill="#3f3a34")
d.line((1320, 247, 1320, 292), fill="#3f3a34", width=4)
d.text((1309, 176), "北", fill="#3f3a34", font=label)

legend_y = 1240
d.rounded_rectangle((80, legend_y, 1520, 1370), radius=22, fill="#ebe5dc")
d.text((115, legend_y+25), "布置结论", fill="#3d3832", font=label)
d.text((285, legend_y+23), "门扇内开贴东墙；700×450mm半开放衣帽架与门扇留100mm；床侧主通道897mm。" if OPEN_VALET else "门扇内开贴东墙；700×450mm轻量衣帽柜与门扇留100mm；床侧主通道提高到897mm。" if VALET_CABINET else "门扇内开贴东墙；700mm衣帽塔与门扇留100mm；床侧主通道797mm；床头无高柜、无吊柜。" if REFINED_WARDROBE else "门扇内开贴东墙；700mm临时衣柜与门扇留100mm；床侧主通道797mm；床头无高柜、无吊柜。" if SMALL_WARDROBE else "门扇内开贴东墙；衣柜从门扇末端后开始；床侧主通道797mm；床头无高柜、无吊柜。", fill="#5f574e", font=small)
d.text((115, legend_y+77), "上层搁板＋开放侧拉挂衣＋下部封闭双抽；柜高1750mm，南侧留空约950mm。" if OPEN_VALET else "侧拉挂衣＋卷帘感滑移门，不占通道；柜高1750mm、顶面留1050mm，南侧留空约950mm。" if VALET_CABINET else "胡桃木圆角外框＋燕麦灰双门＋贯穿古铜拉手；东墙南段留空约950mm，飘窗继续承担床品收纳。" if REFINED_WARDROBE else "小柜仅收纳6–8件临时衣物；东墙南段留空约950mm，飘窗继续承担床品收纳。" if SMALL_WARDROBE else "适用：1F偶住/老人房；主要从床东侧上下床，飘窗继续承担低位收纳。", fill="#746a60", font=small)

path = OUT / "01-bedroom-plan-dimensioned.png"
img.save(path, quality=95)
print(path)
