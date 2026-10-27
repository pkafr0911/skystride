"""Render runner-study.cjs triangle exports. Requires Pillow.

python3 scripts/render-runner-study.py /tmp/skystride-runner-study.json docs/vault-study.png
"""
import json
import sys
from PIL import Image, ImageDraw

panels = json.load(open(sys.argv[1], encoding="utf-8"))
width, card_width, card_height = 1800, 300, 350
image = Image.new("RGB", (width, ((len(panels) + 5) // 6) * card_height), "#111b2a")
draw = ImageDraw.Draw(image)
for index, panel in enumerate(panels):
    col, row = index % 6, index // 6
    ox, oy, scale = col * card_width + 140, row * card_height + 310, 92
    obstacle = panel.get("obstacle") or {}
    floor = obstacle.get("floor", 0)
    top = max(v[1] - floor for triangle in panel["triangles"] for v in triangle["points"])
    scale = min(scale, 265 / max(1, top))
    draw.text((col * card_width + 12, row * card_height + 14), panel["title"], fill="#f5b766")
    if obstacle:
        face = ox + obstacle["x"] * scale
        lip = oy - (obstacle["height"] - floor) * scale
        left = max(col * card_width, face)
        right = min((col + 1) * card_width - 1, face + obstacle.get("width", 3) * scale)
        if right > left:
            draw.rectangle((left, lip, right, oy), fill="#344356")
            draw.line((left, lip, right, lip), fill="#ffbf60", width=2)
    for triangle in panel["triangles"]:
        points = [(ox + v[0] * scale, oy - (v[1] - floor) * scale) for v in triangle["points"]]
        draw.polygon(points, fill=triangle["color"])
    draw.line((col * card_width, oy, (col + 1) * card_width - 1, oy), fill="#506078")
image.save(sys.argv[2])
