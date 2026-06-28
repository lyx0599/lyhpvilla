from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "public" / "floor-plans" / "no-furniture-source"
OUT_DIR = ROOT / "public" / "floor-plans" / "hd-clean"
WALL = 22
DARK = (94, 100, 104)
MID = (148, 158, 166)
LIGHT = (205, 211, 216)
WHITE = (255, 255, 255)


def remove_small_components(mask: np.ndarray, min_area: int, min_span: int) -> np.ndarray:
    height, width = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    keep = np.zeros_like(mask, dtype=bool)
    neighbors = ((1, 0), (-1, 0), (0, 1), (0, -1))

    for y in range(height):
        xs = np.where(mask[y] & ~seen[y])[0]
        for x0 in xs:
            if seen[y, x0]:
                continue

            queue = deque([(y, x0)])
            seen[y, x0] = True
            pixels = []
            min_x = max_x = x0
            min_y = max_y = y

            while queue:
                cy, cx = queue.popleft()
                pixels.append((cy, cx))
                min_x = min(min_x, cx)
                max_x = max(max_x, cx)
                min_y = min(min_y, cy)
                max_y = max(max_y, cy)

                for dy, dx in neighbors:
                    ny, nx = cy + dy, cx + dx
                    if ny < 0 or ny >= height or nx < 0 or nx >= width:
                        continue
                    if seen[ny, nx] or not mask[ny, nx]:
                        continue
                    seen[ny, nx] = True
                    queue.append((ny, nx))

            span = max(max_x - min_x + 1, max_y - min_y + 1)
            if len(pixels) >= min_area or span >= min_span:
                ys, xs = zip(*pixels)
                keep[ys, xs] = True

    return keep


def keep_long_runs(mask: np.ndarray, min_run: int) -> np.ndarray:
    height, width = mask.shape
    keep = np.zeros_like(mask, dtype=bool)

    for y in range(height):
        row = mask[y]
        start = None
        for x in range(width + 1):
            active = x < width and row[x]
            if active and start is None:
                start = x
            if (not active or x == width) and start is not None:
                if x - start >= min_run:
                    keep[y, start:x] = True
                start = None

    for x in range(width):
        col = mask[:, x]
        start = None
        for y in range(height + 1):
            active = y < height and col[y]
            if active and start is None:
                start = y
            if (not active or y == height) and start is not None:
                if y - start >= min_run:
                    keep[start:y, x] = True
                start = None

    return keep


def generate_clean_plan(source: Path, destination: Path) -> None:
    image = Image.open(source).convert("RGB")
    rgb = np.asarray(image).astype(np.int16)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    luma = (0.299 * r + 0.587 * g + 0.114 * b).astype(np.uint8)
    saturation = (rgb.max(axis=2) - rgb.min(axis=2)).astype(np.uint8)

    # Keep long orthogonal runs instead of all dark pixels. This preserves walls, windows,
    # doors and structure while dropping wood grain, stone veins, text and blurred patches.
    structural_source = (luma < 190) & (saturation < 34)
    structural = keep_long_runs(structural_source, min_run=46)
    structural = remove_small_components(structural, min_area=260, min_span=60)

    wall_source = (luma < 164) & (saturation < 32)
    wall_core = keep_long_runs(wall_source, min_run=80)
    wall_core = remove_small_components(wall_core, min_area=700, min_span=100)

    edge = image.convert("L").filter(ImageFilter.FIND_EDGES)
    edge_arr = np.asarray(edge)
    fine_source = (edge_arr > 40) & (saturation < 45) & (luma < 232)
    fine_lines = keep_long_runs(fine_source, min_run=36)
    fine_lines = remove_small_components(fine_lines, min_area=140, min_span=48)

    # Thicken walls slightly and keep fine lines subtle.
    wall_img = Image.fromarray((wall_core * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))
    structural_img = Image.fromarray((structural * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))
    fine_img = Image.fromarray((fine_lines * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))
    wall = np.asarray(wall_img) > 0
    structural = np.asarray(structural_img) > 0
    fine = np.asarray(fine_img) > 0

    out = np.full((rgb.shape[0], rgb.shape[1], 3), 255, dtype=np.uint8)
    out[structural] = np.array([205, 211, 216], dtype=np.uint8)
    out[fine] = np.array([148, 158, 166], dtype=np.uint8)
    out[wall] = np.array([94, 100, 104], dtype=np.uint8)

    # Very light exterior grid hint, softened so it does not compete with the plan.
    grid = (luma > 210) & (saturation < 18) & (edge_arr > 18)
    grid = keep_long_runs(grid, min_run=85)
    grid = remove_small_components(grid, min_area=500, min_span=120)
    out[grid & ~structural & ~fine & ~wall] = np.array([232, 236, 239], dtype=np.uint8)

    Image.fromarray(out, "RGB").save(destination)


def simplify_1f_top_rooms(path: Path) -> None:
    image = Image.open(path).convert("RGB")
    draw = ImageDraw.Draw(image)
    dark = (94, 100, 104)
    mid = (148, 158, 166)
    light = (205, 211, 216)
    white = (255, 255, 255)

    # The kitchen/bath area in 1F contains dense KooPlan cabinet and material artifacts.
    # Clear it and redraw only the room/wall structure needed for renovation discussion.
    draw.rectangle((666, 24, 1228, 356), fill=white)

    # Top exterior and side walls.
    draw.rectangle((690, 26, 1218, 96), fill=dark)
    draw.rectangle((690, 26, 735, 356), fill=dark)
    draw.rectangle((1188, 26, 1218, 356), fill=dark)
    draw.rectangle((735, 326, 1218, 356), fill=dark)

    # Partition between the two rooms.
    draw.rectangle((988, 96, 1026, 356), fill=dark)

    # Clean inner wall hints and openings.
    draw.rectangle((735, 96, 988, 320), fill=white)
    draw.rectangle((1026, 96, 1188, 320), fill=white)
    draw.line((760, 112, 960, 112), fill=mid, width=4)
    draw.line((1048, 112, 1166, 112), fill=mid, width=4)
    draw.line((760, 302, 960, 302), fill=mid, width=4)
    draw.line((1048, 302, 1166, 302), fill=mid, width=4)

    # Door swing in bathroom, subtle enough not to read as old white model.
    draw.arc((1034, 230, 1168, 356), 180, 270, fill=light, width=4)
    draw.line((1034, 356, 1034, 250), fill=mid, width=4)

    image.save(path)


def draw_polyline(draw: ImageDraw.ImageDraw, points, fill=DARK, width=WALL):
    draw.line(points, fill=fill, width=width, joint="curve")


def draw_rect_outline(draw: ImageDraw.ImageDraw, box, fill=DARK, width=WALL):
    x1, y1, x2, y2 = box
    draw_polyline(draw, (x1, y1, x2, y1, x2, y2, x1, y2, x1, y1), fill=fill, width=width)


def draw_blank_1f(destination: Path) -> None:
    img = Image.new("RGB", (1526, 1086), WHITE)
    draw = ImageDraw.Draw(img)

    # Main living/dining volume.
    draw_rect_outline(draw, (500, 370, 1188, 955))
    draw.rectangle((490, 382, 522, 548), fill=WHITE)

    # Left bedroom/service volume.
    draw_rect_outline(draw, (108, 320, 500, 955))
    draw_polyline(draw, (108, 560, 500, 560))
    draw_polyline(draw, (500, 560, 500, 955))
    draw.rectangle((492, 390, 518, 540), fill=WHITE)

    # Top utility rooms.
    draw_rect_outline(draw, (690, 36, 1218, 356))
    draw_polyline(draw, (1008, 36, 1008, 356))
    draw.rectangle((676, 350, 1228, 382), fill=WHITE)
    draw_polyline(draw, (690, 356, 1218, 356))

    # Upper-left entry boundary.
    draw_polyline(draw, (500, 180, 500, 320, 108, 320))
    draw_polyline(draw, (500, 36, 604, 36))
    draw_polyline(draw, (500, 36, 500, 180))
    draw.line((405, 274, 515, 274), fill=MID, width=4)

    # Doors and window/terrace hints.
    draw.arc((1032, 230, 1168, 356), 180, 270, fill=LIGHT, width=4)
    draw.line((1032, 356, 1032, 250), fill=MID, width=4)
    draw.line((760, 112, 960, 112), fill=MID, width=4)
    draw.line((1048, 112, 1166, 112), fill=MID, width=4)
    draw.line((760, 302, 960, 302), fill=MID, width=4)
    draw.line((1048, 302, 1166, 302), fill=MID, width=4)

    # Outdoor/terrace boundary kept thin and quiet.
    draw_rect_outline(draw, (860, 620, 1280, 1042), fill=MID, width=4)
    draw.line((1208, 590, 1405, 590), fill=MID, width=4)
    draw.line((1405, 590, 1405, 1080), fill=MID, width=4)

    img.save(destination)


def draw_blank_2f(destination: Path) -> None:
    img = Image.new("RGB", (1446, 1040), WHITE)
    draw = ImageDraw.Draw(img)

    # Main 2F outline follows the original stepped room layout.
    draw_polyline(draw, (
        104, 1034,
        104, 286,
        286, 286,
        286, 70,
        1128, 70,
        1128, 390,
        803, 390,
        803, 844,
        104, 844,
        104, 1034,
        803, 1034,
        803, 844
    ))

    # Top rooms and bedroom partitions.
    draw_polyline(draw, (562, 70, 562, 312, 492, 312))
    draw_polyline(draw, (586, 70, 586, 536, 803, 536))
    draw_polyline(draw, (870, 70, 870, 390))
    draw_polyline(draw, (803, 390, 803, 844))
    draw_polyline(draw, (104, 536, 432, 536))
    draw_polyline(draw, (432, 536, 432, 844))
    draw_polyline(draw, (458, 536, 458, 1034))

    # Openings.
    draw.rectangle((410, 528, 558, 558), fill=WHITE)
    draw.rectangle((730, 382, 894, 410), fill=WHITE)
    draw.rectangle((278, 846, 436, 874), fill=WHITE)
    draw.rectangle((510, 846, 650, 874), fill=WHITE)

    # Balconies and bay windows as thin secondary structure.
    draw_rect_outline(draw, (130, 870, 436, 1010), fill=MID, width=4)
    draw_rect_outline(draw, (462, 870, 778, 1010), fill=MID, width=4)
    draw_rect_outline(draw, (810, 540, 1210, 930), fill=MID, width=4)
    draw_rect_outline(draw, (590, 18, 868, 96), fill=MID, width=4)
    draw_rect_outline(draw, (895, 18, 1130, 96), fill=MID, width=4)

    # Stair and door hints.
    draw.line((176, 410, 410, 410), fill=MID, width=4)
    draw.line((176, 440, 410, 440), fill=MID, width=4)
    draw.arc((430, 535, 642, 648), 180, 360, fill=LIGHT, width=4)
    draw.arc((772, 392, 900, 470), 90, 180, fill=LIGHT, width=4)
    draw.arc((410, 300, 510, 390), 270, 360, fill=LIGHT, width=4)

    img.save(destination)


def draw_blank_b2(destination: Path) -> None:
    img = Image.new("RGB", (1482, 1086), WHITE)
    draw = ImageDraw.Draw(img)

    # B2 outline, based on the original basement plan: upper room, left stair
    # volume, large multi-function area, and lower/right light-well boundary.
    draw_polyline(draw, (
        545, 28,
        1000, 28,
        1000, 930,
        666, 930,
        666, 1070,
        128, 1070,
        128, 435,
        455, 435,
        455, 258,
        545, 258,
        545, 28
    ))
    draw_polyline(draw, (545, 258, 1000, 258))
    draw_polyline(draw, (455, 650, 1000, 650))
    draw_polyline(draw, (455, 435, 455, 650))
    draw_polyline(draw, (666, 930, 1000, 930))

    # Left stair/service box.
    draw_rect_outline(draw, (128, 435, 455, 650))
    draw.rectangle((438, 448, 470, 636), fill=WHITE)

    # Light well / lower exterior boundary.
    draw_polyline(draw, (1000, 650, 1168, 650, 1168, 1070, 666, 1070), fill=DARK, width=WALL)
    draw_rect_outline(draw, (1018, 672, 1148, 1030), fill=MID, width=4)

    # Window/door/stair hints only.
    draw.line((228, 552, 455, 552), fill=MID, width=4)
    draw.line((228, 612, 455, 612), fill=MID, width=4)
    draw.line((725, 170, 974, 170), fill=MID, width=4)
    draw.line((725, 220, 974, 220), fill=MID, width=4)
    draw.arc((545, 258, 655, 360), 180, 270, fill=LIGHT, width=4)

    img.save(destination)


def generate_b1_open_basement(source: Path, destination: Path) -> None:
    source_image = Image.open(source).convert("RGB")
    img = Image.new("RGB", source_image.size, (255, 255, 255))
    draw = ImageDraw.Draw(img)
    dark = (94, 100, 104)
    mid = (148, 158, 166)

    # B1 is a basement void/open level. Draw only the actual structural boundary:
    # no floor material, no projected blue outline, no internal partitions.
    wall = WALL
    draw.line((288, 10, 1025, 10, 1025, 408, 622, 408), fill=dark, width=wall, joint="curve")
    draw.line((288, 10, 288, 404, 155, 404, 155, 1024, 832, 1024, 832, 802, 620, 802), fill=dark, width=wall, joint="curve")
    draw.line((622, 408, 590, 455), fill=dark, width=wall)
    draw.arc((520, 398, 760, 800), 92, 268, fill=dark, width=wall)
    draw.line((614, 802, 620, 802), fill=dark, width=wall)

    # A light boundary hint for the void/open edge; not a projected floor shadow.
    draw.arc((548, 428, 728, 760), 96, 264, fill=mid, width=4)
    draw.line((1025, 408, 1110, 408), fill=mid, width=4)
    draw.line((1110, 408, 1110, 560), fill=mid, width=4)
    img.save(destination)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    draw_blank_1f(OUT_DIR / "1f-hd-clean.png")
    draw_blank_2f(OUT_DIR / "2f-hd-clean.png")
    draw_blank_b2(OUT_DIR / "b2-hd-clean.png")
    generate_b1_open_basement(ROOT / "public" / "floor-plans" / "base-clean" / "b1-base-clean.png", OUT_DIR / "b1-hd-clean.png")


if __name__ == "__main__":
    main()
