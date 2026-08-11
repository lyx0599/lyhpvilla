from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import math

root = Path('/Users/lyx/Documents/林屿湖畔')
src = root / 'public/floor-plans/no-furniture-source/1f.png'
out = root / 'artifacts/1f-flexible-gathering-20260809/1f-furniture-plan-round-powered-table.png'

im = Image.open(src).convert('RGBA')
draw = ImageDraw.Draw(im, 'RGBA')
font_path = '/System/Library/Fonts/STHeiti Medium.ttc'
font = ImageFont.truetype(font_path, 24)
small = ImageFont.truetype(font_path, 18)
title = ImageFont.truetype(font_path, 30)

def label(x, y, text, fill=(40,40,40,255), bg=(255,255,255,220)):
    box = draw.textbbox((x, y), text, font=small)
    draw.rounded_rectangle((box[0]-8, box[1]-5, box[2]+8, box[3]+5), 8, fill=bg, outline=(90,90,90,150), width=2)
    draw.text((x, y), text, font=small, fill=fill)

def chair(cx, cy, angle=0, color=(210,180,142,230)):
    w, h = 34, 42
    layer = Image.new('RGBA', im.size, (0,0,0,0))
    ld = ImageDraw.Draw(layer, 'RGBA')
    ld.rounded_rectangle((cx-w/2, cy-h/2, cx+w/2, cy+h/2), 9, fill=color, outline=(105,78,50,245), width=3)
    ld.line((cx-w/2+4, cy-h/2+7, cx+w/2-4, cy-h/2+7), fill=(115,85,55,220), width=3)
    rotated = layer.rotate(angle, resample=Image.Resampling.BICUBIC, center=(cx, cy))
    im.alpha_composite(rotated)

def arrow(start, end, color=(37,102,173,245)):
    draw.line([start, end], fill=color, width=8)
    a = math.atan2(end[1]-start[1], end[0]-start[0])
    for off in (2.6, -2.6):
        p = (end[0]-24*math.cos(a+off), end[1]-24*math.sin(a+off))
        draw.line([p, end], fill=color, width=8)

# Entry storage on the east/right wall of the compact entry vestibule.
draw.rounded_rectangle((635, 90, 685, 292), 8, fill=(152,103,62,225), outline=(88,55,35,255), width=4)
draw.rectangle((640, 170, 680, 245), fill=(226,197,157,235), outline=(106,74,45,230), width=3)
draw.line((647, 145, 673, 145), fill=(44,44,44,230), width=5)
label(574, 65, '玄关浅收纳 120–140cm', fill=(82,50,28,255))

# TV/fireplace wall on the west side of the living room, with the sofa facing it.
draw.rounded_rectangle((500, 590, 540, 900), 8, fill=(78,66,58,240), outline=(35,30,27,255), width=4)
draw.rectangle((505, 735, 535, 780), fill=(224,102,31,245), outline=(255,174,76,230), width=2)
label(505, 540, '电视 / 壁炉组合墙', fill=(65,52,45,255))

# Straight sofa placed perpendicular to the west wall, facing the TV/fireplace.
draw.rounded_rectangle((690, 590,812,900), 22, fill=(220,214,202,245), outline=(115,100,82,245), width=4)
draw.rounded_rectangle((705, 605,797,690), 16, fill=(235,230,220,235), outline=(155,140,120,180), width=2)
draw.rounded_rectangle((705, 700,797,790), 16, fill=(235,230,220,235), outline=(155,140,120,180), width=2)
draw.rounded_rectangle((705, 800,797,885), 16, fill=(235,230,220,235), outline=(155,140,120,180), width=2)
label(650, 910, '直排模块沙发 260cm｜面向电视壁炉', fill=(80,70,60,255))

# Movable coffee table and two lightweight lounge chairs.
draw.rounded_rectangle((545, 710,645,790), 15, fill=(174,132,82,235), outline=(91,61,33,245), width=4)
label(540, 800, '可移动茶几｜位于沙发前方', fill=(92,60,32,255))
chair(820, 650, -10, (202,182,159,235))
chair(820, 855, 10, (202,182,159,235))

# Closed round table: Ø155cm, six everyday chairs, 75cm powered lazy susan.
cx, cy, r = 950, 760, 96
draw.ellipse((cx-r, cy-r, cx+r, cy+r), fill=(193,143,83,240), outline=(105,67,31,255), width=5)
draw.ellipse((cx-47, cy-47, cx+47, cy+47), fill=(220,178,111,245), outline=(120,79,32,245), width=4)
draw.line((cx-34, cy, cx+34, cy), fill=(164,111,45,200), width=2)
draw.line((cx, cy-34, cx, cy+34), fill=(164,111,45,200), width=2)
for i in range(6):
    angle = math.radians(i*60 - 90)
    chair(cx + 139*math.cos(angle), cy + 139*math.sin(angle), i*60, (220,193,158,235))
label(915, 875, '圆桌 Ø155cm｜电动转盘 Ø75cm', fill=(112,72,22,255))

# Expanded footprint, shown as a reversible dashed envelope.
draw.rounded_rectangle((800, 640, 1100, 880), 80, outline=(192,124,19,210), width=5)
for x in range(810, 1090, 28):
    draw.line((x, 640, min(x+14,1090), 640), fill=(192,124,19,210), width=4)
    draw.line((x, 880, min(x+14,1090), 880), fill=(192,124,19,210), width=4)
label(940, 610, '展开 220–240×110–120cm｜8–10人', fill=(145,88,9,255))

# Kitchen perimeter / no fixed island indication.
draw.rounded_rectangle((725, 70, 955, 108), 7, fill=(95,76,59,225), outline=(50,40,30,255), width=3)
draw.rounded_rectangle((720, 95, 758, 300), 7, fill=(95,76,59,225), outline=(50,40,30,255), width=3)
label(735, 315, '厨房周边柜｜不设固定中岛', fill=(66,53,42,255))

# Existing south water bar on the east living-room wall.
draw.rounded_rectangle((1150, 560, 1190, 870), 8, fill=(92,72,55,235), outline=(46,35,27,255), width=4)
draw.rectangle((1155, 640, 1185, 785), fill=(142,108,73,225), outline=(54,42,32,220), width=2)
draw.line((1157, 620, 1183, 620), fill=(224,214,193,230), width=4)
label(1085, 885, '南段水吧台｜东侧墙面', fill=(71,51,34,255))

# Main circulation arrow, kept clear between entry/stairs and garden.
arrow((585, 350), (900, 500), (37,102,173,235))
arrow((900, 500), (1190, 720), (37,102,173,235))
label(690, 390, '主通道保持连续', fill=(30,78,135,255))

draw.text((35, 25), '1F 2D家具布置图｜按原始户型结构', font=title, fill=(45,45,45,245), stroke_width=2, stroke_fill=(255,255,255,230))

# Legend
panel = (1030, 35, 1515, 290)
draw.rounded_rectangle(panel, 18, fill=(255,255,255,238), outline=(80,80,80,210), width=3)
draw.text((1060, 55), '家具与动线说明', font=title, fill=(45,45,45,255))
items = [
    ('棕色', '玄关浅收纳 / 厨房周边柜'),
    ('浅灰', '直排沙发 / 活动休闲椅'),
    ('橙色', '圆形电动转盘餐桌'),
    ('虚线', '餐桌展开至 8–10 人包络'),
    ('蓝箭头', '入户—楼梯—客餐厅连续动线'),
]
for i, (key, text) in enumerate(items):
    y = 105 + i*34
    draw.text((1060, y), key, font=small, fill=(55,55,55,255))
    draw.text((1150, y), text, font=small, fill=(55,55,55,255))

im.convert('RGB').save(out, quality=95)
print(out)
