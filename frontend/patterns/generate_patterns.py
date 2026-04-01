"""Generate tileable pattern images for the autostereogram generator."""

import math
import random

from PIL import Image, ImageDraw


def create_pattern(name, draw_func, size=128):
    img = Image.new("RGB", (size, size))
    draw = ImageDraw.Draw(img)
    draw_func(draw, size)
    img.save(f"{name}.png")


def dots(draw, size):
    random.seed(42)
    for _ in range(300):
        x, y = random.randint(0, size - 1), random.randint(0, size - 1)
        r = random.randint(1, 3)
        color = (random.randint(50, 255), random.randint(50, 255), random.randint(50, 255))
        draw.ellipse([x - r, y - r, x + r, y + r], fill=color)


def checkerboard(draw, size):
    cell = 16
    for y in range(0, size, cell):
        for x in range(0, size, cell):
            if ((x // cell) + (y // cell)) % 2 == 0:
                draw.rectangle([x, y, x + cell, y + cell], fill=(200, 80, 80))
            else:
                draw.rectangle([x, y, x + cell, y + cell], fill=(80, 80, 200))


def stripes_diagonal(draw, size):
    colors = [(230, 120, 50), (50, 150, 230), (230, 230, 50), (50, 200, 100)]
    stripe_w = 12
    for y in range(size):
        for x in range(size):
            idx = ((x + y) // stripe_w) % len(colors)
            draw.point((x, y), fill=colors[idx])


def noise(draw, size):
    random.seed(123)
    for y in range(size):
        for x in range(size):
            c = (random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))
            draw.point((x, y), fill=c)


def circles(draw, size):
    for y in range(0, size, 24):
        for x in range(0, size, 24):
            cx, cy = x + 12, y + 12
            r = 8
            hue_r = int(127 + 127 * math.sin(x * 0.1))
            hue_g = int(127 + 127 * math.sin(y * 0.1 + 2))
            hue_b = int(127 + 127 * math.sin((x + y) * 0.05 + 4))
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(hue_r, hue_g, hue_b))
            draw.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], fill=(30, 30, 30))


def triangles(draw, size):
    random.seed(77)
    colors = [(255, 100, 100), (100, 255, 100), (100, 100, 255), (255, 255, 100), (255, 100, 255)]
    step = 20
    for y in range(0, size, step):
        for x in range(0, size, step):
            color = colors[((x // step) + (y // step)) % len(colors)]
            if ((x // step) + (y // step)) % 2 == 0:
                draw.polygon([(x, y + step), (x + step // 2, y), (x + step, y + step)], fill=color)
            else:
                draw.polygon([(x, y), (x + step // 2, y + step), (x + step, y)], fill=color)


def waves(draw, size):
    for y in range(size):
        for x in range(size):
            r = int(127 + 127 * math.sin(x * 0.15 + y * 0.05))
            g = int(127 + 127 * math.sin(x * 0.05 + y * 0.15 + 2))
            b = int(127 + 127 * math.sin(x * 0.1 - y * 0.1 + 4))
            draw.point((x, y), fill=(r, g, b))


def mosaic(draw, size):
    random.seed(99)
    cell = 8
    for y in range(0, size, cell):
        for x in range(0, size, cell):
            color = (random.randint(30, 230), random.randint(30, 230), random.randint(30, 230))
            draw.rectangle([x, y, x + cell - 1, y + cell - 1], fill=color)


def stars(draw, size):
    random.seed(55)
    draw.rectangle([0, 0, size, size], fill=(15, 15, 40))
    for _ in range(200):
        x, y = random.randint(0, size - 1), random.randint(0, size - 1)
        brightness = random.randint(150, 255)
        r = random.randint(0, 2)
        draw.ellipse([x - r, y - r, x + r, y + r], fill=(brightness, brightness, brightness))


def hexagons(draw, size):
    hex_r = 10
    colors = [(200, 60, 60), (60, 200, 60), (60, 60, 200), (200, 200, 60)]
    idx = 0
    for row in range(0, size + hex_r, int(hex_r * 1.8)):
        for col in range(0, size + hex_r, int(hex_r * 2.1)):
            cx = col + (hex_r if (row // int(hex_r * 1.8)) % 2 else 0)
            cy = row
            points = []
            for i in range(6):
                angle = math.pi / 3 * i + math.pi / 6
                px = cx + hex_r * math.cos(angle)
                py = cy + hex_r * math.sin(angle)
                points.append((px, py))
            draw.polygon(points, fill=colors[idx % len(colors)], outline=(30, 30, 30))
            idx += 1


if __name__ == "__main__":
    patterns = [
        ("pattern-dots", dots),
        ("pattern-checkerboard", checkerboard),
        ("pattern-stripes", stripes_diagonal),
        ("pattern-noise", noise),
        ("pattern-circles", circles),
        ("pattern-triangles", triangles),
        ("pattern-waves", waves),
        ("pattern-mosaic", mosaic),
        ("pattern-stars", stars),
        ("pattern-hexagons", hexagons),
    ]
    for name, func in patterns:
        create_pattern(name, func)
        print(f"Created {name}.png")
