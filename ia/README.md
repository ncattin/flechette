# Réseau de neurones « pointe de fléchette » (branche `ia`, expérimental)

Ce dossier n'est **pas** dans l'appli. L'appli et ses mises à jour lisent la branche `main` ;
ici on prépare, entraîne et teste le réseau à part.

## Principe

L'appli actuelle garde ce qu'elle fait bien : repérer la cible (erreur ~1 px) et voir qu'une
fléchette vient d'arriver. Le réseau ne remplace que l'étape fragile : **trouver la pointe**.

- Entrée : deux petites images 192 × 192 autour de la nouvelle fléchette, **avant** et **après**
  son arrivée (6 canaux ; le réseau calcule aussi leur différence).
- Sortie : une carte 48 × 48 dont le maximum est la pointe (précision sous le pixel par moyenne
  pondérée).
- Réseau maison (~400 000 paramètres, ~1,6 Mo en ONNX), sans YOLO : la licence AGPL d'Ultralytics
  imposerait des contraintes à l'appli.
- Exécution dans l'appli avec ONNX Runtime Web (WebAssembly), une seule fois par fléchette
  (pas à chaque image de la caméra).

## Fichiers

- `gen.js`, `generateur.html`, `gen.mjs` : fabriquent les exemples d'entraînement (cible et
  fléchettes 3D, caméra, lumière, ombres, flou, bruit tirés au hasard ; vraie pointe connue).
  `node gen.mjs 8000 <dossier>/train 11` puis `node gen.mjs 1000 <dossier>/val 97`.
- `train.py` : entraîne et exporte `tipnet.onnx`.
  `python train.py <dossier données> <dossier sortie> 20`
- `labo.html` : fait tourner le modèle dans le navigateur, mesure précision et vitesse
  (`labo.html?m=chemin/tipnet.onnx&n=60`).

Données et modèles sont hors du dépôt : `%USERPROFILE%\flechette-outils\ia-data`,
`ia-modeles`, environnement Python `ia-env`.

## Étapes

1. Entraînement sur images simulées (en cours).
2. Mesure dans le navigateur (précision, vitesse).
3. Branchement dans une copie de l'appli, en secours de la méthode actuelle, comparé au banc d'essai.
4. Ajout des vraies images de l'utilisateur (corrections) pour l'adapter à sa cible.
5. Seulement si c'est nettement mieux : intégration dans `main`.
