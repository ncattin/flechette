"""Dessine l'icône de Fléchette (une vraie cible à 20 secteurs sur fond noir) et
génère toutes les tailles : icônes web + icônes et écran de démarrage Android.
usage : python icones.py <dossier flechette> [<dossier res Android>]"""
import math
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

NIGHT = (10, 10, 10)
CREAM = (244, 238, 225)
BLACK = (20, 20, 20)
RED = (227, 36, 43)
GREEN = (30, 158, 85)
GOLD = (227, 36, 43)


def board(size, scale=0.78, glow=True):
    """Cible centrée ; scale = diamètre de la cible / côté de l'image."""
    S = size * 4  # dessin en grand puis réduction : bords lisses
    im = Image.new("RGBA", (S, S), NIGHT + (255,))
    c = S / 2
    R = S * scale / 2
    if glow:
        g = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        ImageDraw.Draw(g).ellipse([c - R * 1.08, c - R * 1.02, c + R * 1.08, c + R * 1.14], fill=GOLD + (70,))
        im.alpha_composite(g.filter(ImageFilter.GaussianBlur(S * 0.05)))
    d = ImageDraw.Draw(im)
    box = lambda r: [c - r, c - r, c + r, c + r]
    d.ellipse(box(R), fill=(13, 13, 13))
    # rayons relatifs (mêmes proportions qu'une vraie cible, anneau des chiffres réduit)
    rd_out, rd_in, rt_out, rt_in, rb_out, rb_in = (R * k for k in (0.86, 0.80, 0.55, 0.49, 0.085, 0.04))
    for i in range(20):
        a0 = -90 - 9 + i * 18
        dark = i % 2 == 0
        seg = BLACK if dark else CREAM
        ring = RED if dark else GREEN
        d.pieslice(box(rd_out), a0, a0 + 18, fill=ring)
        d.pieslice(box(rd_in), a0, a0 + 18, fill=seg)
        d.pieslice(box(rt_out), a0, a0 + 18, fill=ring)
        d.pieslice(box(rt_in), a0, a0 + 18, fill=seg)
    d.ellipse(box(rb_out), fill=GREEN)
    d.ellipse(box(rb_in), fill=RED)
    # fils fins entre les secteurs
    w = max(1, int(S * 0.004))
    for i in range(20):
        a = math.radians(-90 - 9 + i * 18)
        d.line([(c + rb_out * math.cos(a), c + rb_out * math.sin(a)), (c + rd_out * math.cos(a), c + rd_out * math.sin(a))], fill=(150, 150, 150), width=w)
    for r in (rd_out, rd_in, rt_out, rt_in, rb_out):
        d.ellipse(box(r), outline=(150, 150, 150), width=w)
    return im.resize((size, size), Image.LANCZOS)


def save(im, path, rgb=True):
    path.parent.mkdir(parents=True, exist_ok=True)
    (im.convert("RGB") if rgb else im).save(path, optimize=True)
    print("  ", path)


def main():
    web = Path(sys.argv[1])
    save(board(512), web / "icon-512.png")
    save(board(192), web / "icon-192.png")
    save(board(180), web / "apple-touch-icon.png")
    save(board(64, scale=0.94, glow=False), web / "favicon.png")
    if len(sys.argv) > 2:
        res = Path(sys.argv[2])
        dens = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
        for k, f in dens.items():
            n = round(48 * f)
            save(board(n, scale=0.84), res / f"mipmap-{k}" / "ic_launcher.png")
            # icône ronde : la cible occupe le disque
            rnd = board(n, scale=0.9, glow=False)
            mask = Image.new("L", (n * 4, n * 4), 0)
            ImageDraw.Draw(mask).ellipse([0, 0, n * 4 - 1, n * 4 - 1], fill=255)
            rnd.putalpha(mask.resize((n, n), Image.LANCZOS))
            save(rnd, res / f"mipmap-{k}" / "ic_launcher_round.png", rgb=False)
            # icône adaptative (108 dp) : la cible tient dans la zone sûre de 66 dp
            m = round(108 * f)
            fg = board(m, scale=0.58)
            save(fg, res / f"mipmap-{k}" / "ic_launcher_foreground.png")
        # écrans de démarrage : fond nuit + petite cible au centre, aux tailles déjà présentes
        for p in res.glob("drawable*/splash.png"):
            W, H = Image.open(p).size
            sp = Image.new("RGB", (W, H), NIGHT)
            n = int(min(W, H) * 0.32)
            sp.paste(board(n, scale=0.9, glow=False).convert("RGB"), ((W - n) // 2, (H - n) // 2))
            save(sp, p)


if __name__ == "__main__":
    main()
