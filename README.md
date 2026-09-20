# VisitePro — Site vitrine

Landing page statique (HTML/CSS/JS pur) pour **VisitePro**, plateforme SaaS de
gestion et de suivi qualité des visites de chantier pour les entreprises de
nettoyage et de facility services.

> *Parce que chaque visite compte.*

## Structure

```
index.html      → la landing page (site vitrine)
styles.css      → toute la mise en forme
images/         → captures d'écran (placeholders à remplacer)
demos.html      → lanceur vers les applications de démonstration
visitepro_*.html, visitepro2_*.html → applications de démo
```

## Remplacer les captures d'écran

Le dossier `images/` contient des **placeholders** à remplacer par vos vraies
captures. Gardez les mêmes noms de fichiers pour que la page les affiche
automatiquement :

| Fichier | Contenu attendu | Format conseillé |
|---|---|---|
| `images/screenshot-dashboard.png` | Tableau de bord de pilotage | ~1440 × 900 px (paysage) |
| `images/screenshot-fiche-chantier.png` | Fiche d'un chantier | ~1440 × 900 px (paysage) |
| `images/screenshot-rapport-visite.png` | Rapport de visite | ~1440 × 900 px (paysage) |
| `images/screenshot-mobile.png` | Écran de l'application mobile | ~720 × 1280 px (portrait) |

Les trois premières s'affichent dans des cadres « navigateur », la dernière dans
un cadre « mobile ».

## Formulaire de démo

Le formulaire « Demander une démo » fonctionne côté client uniquement (message de
confirmation). Pour recevoir réellement les demandes, branchez l'envoi dans le
`<script>` en bas de `index.html` (voir le `// TODO`) vers un service comme
[Formspree](https://formspree.io), une fonction serverless, ou votre back-end.

## Hébergement gratuit

Le site est 100 % statique : aucun build n'est nécessaire.

### GitHub Pages
1. Poussez ces fichiers sur votre dépôt GitHub.
2. **Settings → Pages** → *Source* : `Deploy from a branch`.
3. Choisissez la branche et le dossier `/ (root)`, puis **Save**.
4. Le site est publié sur `https://<utilisateur>.github.io/<dépôt>/`.

### Cloudflare Pages
1. **Create a project → Connect to Git**, sélectionnez le dépôt.
2. *Framework preset* : `None`.
3. *Build command* : laissez vide. *Build output directory* : `/` (racine).
4. **Save and Deploy**.
