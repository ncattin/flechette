# Fléchette

Compte les points aux fléchettes avec la caméra du téléphone : la cible est repérée toute seule,
chaque fléchette plantée est détectée et comptée, avec annonce vocale. Jeux : 301, 501, 701,
Cricket (avec cut-throat) et jeu libre.

## L'application Android

1. Double-clique sur `app/construire-apk.bat` (1 à 3 minutes).
2. Le fichier `Flechette.apk` apparaît à côté de `index.html`.
3. Envoie-le sur ton téléphone (câble, Drive, mail…) et ouvre-le. Android demande d'autoriser
   l'installation depuis cette source : accepte, puis installe.
4. Au premier lancement, autorise la caméra.

**Mises à jour (depuis la v27)** : l'appli vérifie toute seule au démarrage s'il existe une version
plus récente sur GitHub (`index.html` de la branche `main` du dépôt ncattin/flechette) et propose
« Installer ». Le bouton « Rechercher une mise à jour » est aussi dans Partie. L'installation prend
quelques secondes, sans recompiler ni réinstaller l'APK, et garde la partie en cours.

Recompiler l'APK reste utile seulement si la partie Android elle-même change (permissions, icône…).
Dans ce cas : relance le script, envoie le nouvel `Flechette.apk` sur le téléphone et ouvre-le.
Android propose « Mettre à jour » : **ne désinstalle pas l'ancienne version**, l'installation se fait
par-dessus et garde les joueurs, les parties et la cible repérée. (Chaque compilation reçoit
automatiquement un numéro de version plus grand.)

Les outils de compilation (Java 21, SDK Android, projet Capacitor) sont dans
`%USERPROFILE%\flechette-outils`. Le fichier `flechette-signature.jks` et `signature.properties`
qu'il contient sont la clé de l'application : garde-les (sans eux, une nouvelle version ne
pourra plus s'installer par-dessus l'ancienne).

## Bien placer le téléphone

- Sur un support, sous la cible ou sur le côté, incliné vers elle ; la cible doit remplir
  une bonne partie de l'image (le zoom automatique aide).
- Éclairage stable ; évite les reflets directs sur la cible.
- Une fois la cible repérée, ne touche plus le téléphone. S'il bouge, l'appli le voit et
  recadre toute seule.
- Retire les fléchettes à la fin de ta volée : le tour passe au joueur suivant automatiquement.

Une fléchette mal comptée se corrige en la touchant (petit crayon). Une fléchette tombée près d'un
fil affiche « ? » et l'autre score possible (« ou T20 ») : une touche suffit pour échanger.
Un joueur se touche pour modifier son total.

Le bouton en haut à gauche de « Partie » ouvre le grand écran, lisible à 2-3 m pendant le jeu
(la caméra reste en vignette et la détection continue). Le bouton graphique ouvre les statistiques :
moyenne, meilleur tour, 180, meilleur finish, réussite aux doubles, progression et dernières parties.

Le drapeau en haut choisit la langue : français (par défaut, à chaque démarrage), anglais ou espagnol,
pour l'écran et pour la voix.

Dans Partie → Détection et diagnostic : la résolution de la caméra et la qualité de la vue (netteté,
taille de la cible à l'image, lumière). Si l'image est floue, touche-la pour faire la mise au point.

## Version web

`index.html` fonctionne aussi tel quel dans un navigateur (GitHub Pages, par exemple).

## Banc d'essai de la détection (développement)

`banc.js` simule une vraie cible en perspective avec des fléchettes 3D, des ombres, du bruit
de capteur, une main qui retire les fléchettes et des rebonds, puis compare ce que l'appli
détecte à la vérité. Il ne se charge qu'avec `?banc` dans l'adresse, par exemple :
`http://localhost:8765/?banc&pose=dessous&n=30&seed=1`
(poses : `dessous`, `bas`, `cote`, `face`).
