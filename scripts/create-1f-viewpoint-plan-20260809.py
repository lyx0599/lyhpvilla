from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

root = Path('/Users/lyx/Documents/林屿湖畔')
src = root / 'public/floor-plans/no-furniture-source/1f.png'
out = root / 'artifacts/1f-flexible-gathering-20260809/1f-viewpoint-plan-round-table.png'

image = Image.open(src).convert('RGBA')
draw = ImageDraw.Draw(image, 'RGBA')

font_path = '/System/Library/Fonts/STHeiti Medium.ttc'
font = ImageFont.truetype(font_path, 26)
small = ImageFont.truetype(font_path, 21)
title = ImageFont.truetype(font_path, 30)

def circle(box, fill, outline, width=8):
    draw.ellipse(box, fill=fill, outline=outline, width=width)

def arrow(start, end, color, label, label_pos):
    draw.line([start, end], fill=color, width=10)
    x1, y1 = start
    x2, y2 = end
    import math
    angle = math.atan2(y2-y1, x2-x1)
    length = 28
    for offset in (2.55, -2.55):
        p = (x2 - length*math.cos(angle+offset), y2 - length*math.sin(angle+offset))
        draw.line([p, (x2, y2)], fill=color, width=10)
    draw.rounded_rectangle((label_pos[0]-12, label_pos[1]-8, label_pos[0]+62, label_pos[1]+45), 12, fill=(255,255,255,225), outline=color, width=4)
    draw.text(label_pos, label, font=title, fill=color)

# Semi-transparent zones correspond to the actual rooms in the source plan.
circle((470, 30, 700, 355), (242, 111, 96, 28), (218, 65, 55, 245))
circle((110, 330, 555, 575), (74, 144, 217, 22), (41, 103, 190, 235))
circle((520, 345, 1210, 980), (63, 159, 118, 18), (25, 126, 85, 225))

# Proposed closed round table position in the east/south part of the living room.
circle((865, 675, 1060, 870), (238, 173, 65, 62), (190, 124, 14, 240), width=7)
draw.ellipse((915, 725, 1010, 820), fill=(242, 187, 74, 115), outline=(190, 124, 14, 230), width=5)
draw.text((865, 870), 'D 圆桌位置', font=small, fill=(132, 82, 12, 255), stroke_width=2, stroke_fill=(255,255,255,220))

# Camera/view directions: A entry looking south; B living looking north; C dining looking west/north-west.
arrow((565, 115), (570, 315), (218, 65, 55, 245), 'A', (535, 170))
arrow((760, 790), (760, 470), (41, 103, 190, 235), 'B', (725, 610))
arrow((1110, 775), (820, 650), (25, 126, 85, 235), 'C', (980, 700))

# Legend panel outside the house footprint.
panel = (1030, 35, 1515, 290)
draw.rounded_rectangle(panel, 18, fill=(255,255,255,235), outline=(80,80,80,210), width=3)
draw.text((1060, 58), '1F 渲染视角对应图', font=title, fill=(45,45,45,255))
legend = [
    ('A', (218,65,55,255), '玄关：从入户门向客厅开口看'),
    ('B', (41,103,190,255), '客厅：从南/东侧向厨房看'),
    ('C', (25,126,85,255), '餐区：从餐桌向沙发/西北侧看'),
    ('D', (190,124,14,255), '圆桌：闭合 Ø150–160cm，展开 8–10人'),
]
for index, (key, color, text) in enumerate(legend):
    y = 112 + index * 42
    draw.rounded_rectangle((1060, y, 1105, y+36), 9, fill=(255,255,255,255), outline=color, width=4)
    draw.text((1074, y+1), key, font=font, fill=color)
    draw.text((1120, y+3), text, font=small, fill=(55,55,55,255))

draw.text((35, 25), '1F 原始户型 + 渲染区域与视线标注', font=title, fill=(45,45,45,240), stroke_width=2, stroke_fill=(255,255,255,220))
image.convert('RGB').save(out, quality=95)
print(out)
