from PIL import Image, ImageDraw, ImageFont
def icon(size, pad=0.14):
    S = size * 4
    im = Image.new("RGB", (S, S), (14, 10, 30))
    d = ImageDraw.Draw(im)
    for y in range(S):
        t = y / S
        d.line([(0, y), (S, y)], fill=(int(30 + 30 * t), int(14 + 10 * t), int(60 + 40 * t)))
    p = int(S * pad); cx = S // 2
    top, bot, w = p, S - p, S - 2 * p
    shield = [(cx, top), (S - p, top + w * 0.18), (S - p, top + w * 0.55), (cx, bot), (p, top + w * 0.55), (p, top + w * 0.18)]
    d.polygon(shield, fill=(245, 185, 50))
    inset = int(S * 0.05)
    inner = [(cx, top + inset), (S - p - inset, top + w * 0.18 + inset * 0.6), (S - p - inset, top + w * 0.55), (cx, bot - inset * 1.6), (p + inset, top + w * 0.55), (p + inset, top + w * 0.18 + inset * 0.6)]
    d.polygon(inner, fill=(28, 18, 56))
    # crossed swords
    lw = int(S * 0.045)
    a, b = int(S * 0.33), int(S * 0.67)
    d.line([(a, a), (b, b)], fill=(120, 200, 255), width=lw)
    d.line([(b, a), (a, b)], fill=(120, 200, 255), width=lw)
    g = int(S * 0.06)
    for (x, y) in [(a + g, b - g), (b - g, b - g)]:
        d.ellipse([x - lw, y - lw, x + lw, y + lw], fill=(245, 185, 50))
    return im.resize((size, size), Image.LANCZOS)
for s, n in [(180, "apple-touch-icon.png"), (192, "icon-192.png"), (512, "icon-512.png"), (32, "favicon-32.png")]:
    icon(s).save("icons/" + n)
icon(512, 0.22).save("icons/icon-maskable-512.png")
