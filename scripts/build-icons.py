"""Rasterise the simple archive mark for Chrome's toolbar and extension list."""
from pathlib import Path
from PIL import Image, ImageDraw

output = Path(__file__).resolve().parents[1] / 'extension' / 'icons'
scale = 16
canvas = Image.new('RGBA', (40 * scale, 40 * scale))
draw = ImageDraw.Draw(canvas)
draw.rounded_rectangle((0, 0, 40 * scale - 1, 40 * scale - 1), 12 * scale, fill='#ff0033')
paths = [
    [(7, 7), (7, 4), (20, 4), (20, 17), (17, 17)],
    [(4, 7), (17, 7), (17, 20), (4, 20), (4, 7)],
    [(10.5, 10), (10.5, 17)],
    [(7.5, 14), (10.5, 17), (13.5, 14)],
]
width = round(1.7 * 25 / 24 * scale)
for path in paths:
    points = [((7.5 + x * 25 / 24) * scale, (7.5 + y * 25 / 24) * scale) for x, y in path]
    draw.line(points, fill='white', width=width, joint='curve')
    for x, y in points:
        r = width / 2
        draw.ellipse((x - r, y - r, x + r, y + r), fill='white')
for size in (16, 32, 48, 128):
    canvas.resize((size, size), Image.Resampling.LANCZOS).save(output / f'archive-{size}.png')
