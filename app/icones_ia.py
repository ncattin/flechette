"""Icônes de Pointe IA (appli d'essai du réseau de neurones) : cible cyan et bleue sur fond bleu nuit,
barrée d'une pointe blanche. Toutes les tailles web + Android (icônes, icône adaptative, démarrage).
usage : python icones_ia.py <dossier web> [<dossier res Android>]"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

NIGHT = (7, 11, 20)
CYAN = (34, 211, 238)
BLUE = (59, 130, 246)
WHITE = (230, 238, 255)
DEEP = (11, 26, 51)


def logo(size, scale=0.8, glow=True):
    S = size * 4
    im = Image.new("RGBA", (S, S), NIGHT + (255,))
    c, R = S / 2, S * scale / 2
    if glow:
        g = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        ImageDraw.Draw(g).ellipse([c - R * 1.05, c - R * 1.05, c + R * 1.05, c + R * 1.05], fill=CYAN + (90,))
        im.alpha_composite(g.filter(ImageFilter.GaussianBlur(S * 0.06)))
    d = ImageDraw.Draw(im)
    box = lambda r: [c - r, c - r, c + r, c + r]
    d.ellipse(box(R), fill=DEEP)
    for r, col in ((0.92, BLUE), (0.74, DEEP), (0.6, CYAN), (0.44, DEEP), (0.3, CYAN), (0.15, DEEP), (0.08, CYAN)):
        d.ellipse(box(R * r), fill=col)
    # la pointe : un trait blanc en diagonale, effilé vers le centre
    w = R * 0.11
    d.polygon([(c + R * 0.95, c - R * 0.95 - w * .2), (c + R * 0.95 + w * .2, c - R * 0.95), (c + w * .15, c + w * .15)], fill=WHITE)
    d.line([(c + R * 0.98, c - R * 0.98), (c + R * 0.35, c - R * 0.35)], fill=WHITE, width=int(w))
    return im.resize((size, size), Image.LANCZOS)


def save(im, path, rgb=True):
    path.parent.mkdir(parents=True, exist_ok=True)
    (im.convert("RGB") if rgb else im).save(path, optimize=True)


def main():
    web = Path(sys.argv[1])
    save(logo(512), web / "icon-512.png"); save(logo(192), web / "icon-192.png")
    save(logo(180), web / "apple-touch-icon.png"); save(logo(64, .94, False), web / "favicon.png")
    if len(sys.argv) > 2:
        res = Path(sys.argv[2])
        for k, f in {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}.items():
            n = round(48 * f)
            save(logo(n, .86), res / f"mipmap-{k}" / "ic_launcher.png")
            r = logo(n, .92, False); m = Image.new("L", (n * 4, n * 4), 0); ImageDraw.Draw(m).ellipse([0, 0, n * 4 - 1, n * 4 - 1], fill=255)
            r.putalpha(m.resize((n, n), Image.LANCZOS)); save(r, res / f"mipmap-{k}" / "ic_launcher_round.png", rgb=False)
            save(logo(round(108 * f), .6), res / f"mipmap-{k}" / "ic_launcher_foreground.png")
        for p in res.glob("drawable*/splash.png"):
            W, H = Image.open(p).size; sp = Image.new("RGB", (W, H), NIGHT); n = int(min(W, H) * .32)
            sp.paste(logo(n, .9, False).convert("RGB"), ((W - n) // 2, (H - n) // 2)); save(sp, p)
    print("ok")


if __name__ == "__main__":
    main()
