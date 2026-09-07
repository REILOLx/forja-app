from PIL import Image, ImageDraw
import math

def make_icon(size, path):
    img = Image.new("RGB", (size, size), (0, 0, 0))
    d = ImageDraw.Draw(img)

    # background: near-black cool tone (matches --bg)
    bg = (18, 18, 22)
    d.rectangle([0, 0, size, size], fill=bg)

    # radial-ish warm glow behind the flame
    cx, cy = size * 0.5, size * 0.5
    glow_r = int(size * 0.42)
    for i in range(glow_r, 0, -2):
        t = i / glow_r
        alpha_col = (
            int(60 + (1 - t) * 40),
            int(28 + (1 - t) * 14),
            int(14),
        )
        bbox = [cx - i, cy - i, cx + i, cy + i]
        d.ellipse(bbox, fill=alpha_col)

    # flame shape (simple stylized path), ember color
    ember = (222, 133, 58)  # approx oklch(0.75 0.17 55) in sRGB
    ember_dark = (168, 88, 30)

    s = size
    flame = [
        (0.50*s, 0.16*s),
        (0.40*s, 0.30*s),
        (0.40*s, 0.42*s),
        (0.33*s, 0.36*s),
        (0.30*s, 0.50*s),
        (0.30*s, 0.62*s),
        (0.38*s, 0.74*s),
        (0.50*s, 0.80*s),
        (0.62*s, 0.74*s),
        (0.70*s, 0.62*s),
        (0.70*s, 0.50*s),
        (0.66*s, 0.40*s),
        (0.62*s, 0.46*s),
        (0.58*s, 0.34*s),
        (0.58*s, 0.24*s),
    ]
    d.polygon(flame, fill=ember)

    inner = [
        (0.50*s, 0.40*s),
        (0.44*s, 0.50*s),
        (0.44*s, 0.60*s),
        (0.50*s, 0.68*s),
        (0.56*s, 0.60*s),
        (0.56*s, 0.50*s),
    ]
    d.polygon(inner, fill=ember_dark)

    img.save(path, "PNG")

make_icon(192, "icon-192.png")
make_icon(512, "icon-512.png")
print("done")
