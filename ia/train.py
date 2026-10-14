"""Entraîne le réseau « pointe de fléchette » et l'exporte en ONNX (pour l'appli).
Entrée : image avant + image après (2 x RGB, 192x192), autour de la nouvelle fléchette.
Sortie : carte de chaleur 48x48 dont le maximum (moyenne pondérée, précision sous le pixel) est la pointe.
usage : python train.py <dossier données> <dossier sortie> [époques]"""
import json, sys, time, math
from pathlib import Path
import numpy as np
import torch, torch.nn as nn, torch.nn.functional as Fn
from PIL import Image

DATA, OUT = Path(sys.argv[1]), Path(sys.argv[2])
EPOCHS = int(sys.argv[3]) if len(sys.argv) > 3 else 30
OUT.mkdir(parents=True, exist_ok=True)
torch.manual_seed(0); np.random.seed(0)
S, HM = 192, 48  # taille de l'image d'entrée, de la carte de chaleur (précision sous la case par moyenne pondérée)
torch.set_num_threads(4)  # plus rapide que 8 sur ce processeur (cœurs rapides + cœurs économes)


def load(split):
    L = json.load(open(DATA / split / "labels.json"))
    X = np.zeros((len(L), 6, S, S), np.uint8); Y = np.zeros((len(L), 2), np.float32)
    for i, l in enumerate(L):
        a = np.asarray(Image.open(DATA / split / "img" / (l["id"] + "_a.jpg")).convert("RGB"))
        b = np.asarray(Image.open(DATA / split / "img" / (l["id"] + "_b.jpg")).convert("RGB"))
        X[i, :3] = a.transpose(2, 0, 1); X[i, 3:] = b.transpose(2, 0, 1); Y[i] = l["tip"]
    return torch.from_numpy(X), torch.from_numpy(Y)


def cbr(i, o, s=1, d=1):
    return nn.Sequential(nn.Conv2d(i, o, 3, s, d, dilation=d, bias=False), nn.BatchNorm2d(o), nn.ReLU(inplace=True))


class TipNet(nn.Module):
    def __init__(s):
        super().__init__()
        s.e1 = nn.Sequential(cbr(9, 24, 2), cbr(24, 24))        # 96
        s.e2 = nn.Sequential(cbr(24, 48, 2), cbr(48, 48))       # 48
        s.e3 = nn.Sequential(cbr(48, 64, 2), cbr(64, 64))       # 24
        s.e4 = nn.Sequential(cbr(64, 96, 2), cbr(96, 96, d=2), cbr(96, 96))  # 12
        s.d3 = cbr(96 + 64, 64); s.d2 = cbr(64 + 48, 48)
        s.head = nn.Conv2d(48, 1, 1)

    def forward(s, x):  # x : 6 canaux 0..1 (avant, après) ; on ajoute la différence
        x = torch.cat([x - .5, x[:, 3:] - x[:, :3]], 1)
        a = s.e1(x); b = s.e2(a); c = s.e3(b); d = s.e4(c)
        u = s.d3(torch.cat([Fn.interpolate(d, scale_factor=2, mode="bilinear", align_corners=False), c], 1))
        u = s.d2(torch.cat([Fn.interpolate(u, scale_factor=2, mode="bilinear", align_corners=False), b], 1))
        return s.head(u)[:, 0]  # (N, 48, 48)


GX = (torch.arange(HM).float() + .5) * (S / HM)


def decode(h):  # moyenne pondérée de la carte (après softmax) -> coordonnées en pixels de l'image 192
    p = torch.softmax(h.flatten(1), 1).view(-1, HM, HM)
    return torch.stack([(p.sum(1) * GX).sum(1), (p.sum(2) * GX).sum(1)], 1), p


def target(y):  # carte cible : petite gaussienne autour de la vraie pointe
    gx = GX.view(1, 1, HM); gy = GX.view(1, HM, 1); s2 = 2 * (1.5 * S / HM) ** 2
    t = torch.exp(-((gx - y[:, 0].view(-1, 1, 1)) ** 2 + (gy - y[:, 1].view(-1, 1, 1)) ** 2) / s2)
    return t / t.sum((1, 2), keepdim=True)


def augment(x, y):  # miroir gauche-droite (la fléchette est symétrique)
    f = torch.rand(len(x)) < .5
    x = x.clone(); y = y.clone(); x[f] = x[f].flip(3); y[f, 0] = S - y[f, 0]
    return x, y


def evaluate(net, X, Y):
    net.eval(); errs = []
    with torch.no_grad():
        for i in range(0, len(X), 128):
            xy, _ = decode(net(X[i:i + 128].float() / 255)); errs.append((xy - Y[i:i + 128]).norm(dim=1))
    e = torch.cat(errs); net.train()
    return {"mediane_px": round(e.median().item(), 2), "moyenne_px": round(e.mean().item(), 2),
            "sous_2px": round((e < 2).float().mean().item() * 100, 1), "sous_4px": round((e < 4).float().mean().item() * 100, 1),
            "sous_8px": round((e < 8).float().mean().item() * 100, 1)}


if __name__ == "__main__":
    t0 = time.time(); Xt, Yt = load("train"); Xv, Yv = load("val")
    print(f"données : {len(Xt)} entraînement, {len(Xv)} contrôle ({time.time()-t0:.0f} s)", flush=True)
    net = TipNet(); print("paramètres :", sum(p.numel() for p in net.parameters()), flush=True)
    opt = torch.optim.AdamW(net.parameters(), 2e-3, weight_decay=1e-4)
    steps = EPOCHS * math.ceil(len(Xt) / 32); sch = torch.optim.lr_scheduler.OneCycleLR(opt, 2e-3, total_steps=steps)
    best = 1e9
    for ep in range(EPOCHS):
        perm = torch.randperm(len(Xt)); tl = 0; t1 = time.time()
        for i in range(0, len(Xt), 32):
            idx = perm[i:i + 32]; x, y = augment(Xt[idx].float() / 255, Yt[idx])
            h = net(x); xy, p = decode(h)
            loss = (xy - y).abs().sum(1).mean() * .05 - (target(y) * torch.log(p + 1e-9)).sum((1, 2)).mean()
            opt.zero_grad(); loss.backward(); opt.step(); sch.step(); tl += loss.item() * len(idx)
        m = evaluate(net, Xv, Yv)
        print(f"époque {ep+1}/{EPOCHS} perte {tl/len(Xt):.3f} contrôle {m} ({time.time()-t1:.0f} s)", flush=True)
        if m["moyenne_px"] < best:
            best = m["moyenne_px"]; torch.save(net.state_dict(), OUT / "tipnet.pt")
    net.load_state_dict(torch.load(OUT / "tipnet.pt")); net.eval()
    final = evaluate(net, Xv, Yv); print("meilleur modèle :", final, flush=True)
    torch.onnx.export(net, torch.zeros(1, 6, S, S), OUT / "tipnet.onnx", input_names=["paire"], output_names=["carte"],
                      opset_version=17, dynamo=False)
    json.dump({"entree": S, "carte": HM, "controle": final}, open(OUT / "tipnet.json", "w"), ensure_ascii=False)
    print("exporté :", OUT / "tipnet.onnx", flush=True)
