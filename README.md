# Impression Étiquettes Thermiques BLE (50x30 mm)

Application web statique autonome (Client-side pure, zéro serveur, zéro télémétrie, zéro dépendance externe) pour imprimer des étiquettes au format strict **50x30 mm** (384 x 240 pixels à 203 DPI) sur une imprimante thermique Bluetooth Low Energy (BLE) utilisant le protocole **Tiny Print / GB01 / Cat Printer**.

---

## 🌟 Fonctionnalités

- **Format Strict 50 x 30 mm** : Canvas fixe de 384 x 240 pixels (203 DPI).
- **Mise en page dédiée** :
  - **Discipline** : Texte vertical le long de la marge gauche.
  - **Date d'entrée** : Format `JJ/MM` en haut à droite.
  - **NOM & Prénom** : Grands caractères lisibles au centre.
  - **Date de naissance** : Format `JJ/MM/AAAA` au centre.
  - **Motif d'admission** : Positionné en bas au centre.
- **Prévisualisation en direct** : Rendu dynamique en noir et blanc instantané.
- **Étiquette en saisie libre** (fenêtre dédiée, même format 50 x 30 mm) :
  - **Texte libre** : autant d'éléments que voulu, texte multi-lignes, retour à la ligne automatique (largeur max.).
  - **Placement libre** : glisser-déposer à la souris/au doigt sur l'aperçu, saisie directe des positions X/Y, flèches du clavier (Maj = 10 px) et calages rapides (Centrer, Haut, Bas, Gauche, Droite).
  - **Mise en forme libre** : 7 polices, taille (6-96 px), gras, italique, souligné, alignement gauche/centre/droite, rotation 0/90/180/270°, texte inversé (blanc sur noir), interligne, espacement des lettres, encadrement de l'élément.
  - **Traits** : ajout de traits/séparateurs avec longueur et épaisseur réglables.
  - **Options d'étiquette** : cadre (fin, épais, double, arrondi), marge, magnétisme sur grille, repères visuels et choix de la zone imprimable (19 mm recommandé ou 30 mm pleine hauteur).
  - **Calques** : réordonnancement (monter/descendre), duplication, masquage, suppression.
  - **Modèles** : modèles intégrés (deux lignes, trois lignes + trait, bandeau inversé, étiquette patient, mention + cadre), enregistrement de ses propres modèles, import depuis le formulaire, persistance automatique (localStorage).
  - **File d'attente** : ajout à la file et impression directe, au même titre que les étiquettes du formulaire.
- **100% Client-side & Sécurisé** : Aucun appel réseau externe, aucun CDN distant, aucune transmission de données.
- **Support du Protocole Tiny Print / GB01** :
  - Conversion automatique du canvas en trames binaires 1-bit bitmap (48 octets/ligne x 240 lignes).
  - Calcul de checksum CRC8 et empaquetage des commandes Tiny Print (`0x51 0x78`).
  - Découpage en paquets sécurisés MTU avec temporisation.
- **Réglages d'impression** :
  - Densité / Energie d'impression réglable (Faible, Normale, Intense).
  - Contrôle de l'espace inter-étiquettes et de l'avance papier finale (Feed).
  - Bouton d'avance papier manuelle.
- **Gestion de file d'attente (Batch Printing)** :
  - Préparation et programmation de plusieurs étiquettes.
  - Lancement de l'impression globale du lot en une seule connexion BLE avec avance automatique configurable entre chaque étiquette.

---

## 📋 Prérequis

1. **Navigateur compatible Web Bluetooth API** :
   - Google Chrome (Desktop ou Android)
   - Microsoft Edge
   - Opera
   *(Note : iOS WebKit / Safari ne supporte pas l'API Web Bluetooth par défaut).*

2. **Sécurité & Contexte Sécurisé** :
   - L'API Web Bluetooth exige **HTTPS** ou **localhost** (`http://127.0.0.1`).

3. **Imprimante thermique BLE compatible** :
   - Modèles Tiny Print, GB01, MX06, Cat Printer, Fun Print, etc.

---

## 🚀 Déploiement sur GitHub Pages

1. Créez un dépôt sur GitHub et poussez les fichiers :
   - `index.html`
   - `style.css`
   - `app.js`
   - `README.md`

2. Sur GitHub, rendez-vous dans les paramètres du dépôt : **Settings** > **Pages**.
3. Dans **Source**, sélectionnez la branche `main` (ou `master`) et le dossier `/ (root)`.
4. Cliquez sur **Save**.
5. Après quelques instants, votre application sera accessible via l'URL HTTPS sécurisée `https://<votre-compte>.github.io/<nom-du-depot>/`.

---

## 💻 Utilisation Locale

Vous pouvez exécuter l'application localement sans installer de serveur complexe :

### Option 1 : Python (Recommandé)
```bash
python3 -m http.server 8000
```
Ouvrez ensuite `http://localhost:8000` dans Chrome ou Edge.

### Option 2 : Extension VS Code
Utilisez l'extension **Live Server** dans VS Code.

---

## 🔧 Utilisation de l'Application

1. Connectez l'imprimante thermique via le bouton **"Connexion Imprimante"**.
2. Remplissez le formulaire d'informations. La prévisualisation canvas s'actualise immédiatement.
3. **Impression directe** : Cliquez sur **"Imprimer cette étiquette"**.
4. **Impression par lot** :
   - Cliquez sur **"+ Ajouter à la file"**.
   - Répétez l'opération pour d'autres étiquettes.
   - Cliquez sur **"Imprimer la file d'attente"** pour lancer l'impression continue du lot.
