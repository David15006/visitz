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

## Captures d'écran

Le dossier `images/` contient de **vraies captures** de l'application VisitePro,
prises directement depuis les démos du dépôt (`visitepro_DEMO_PC.html` et
`visitepro_DEMO-3.html`) :

| Fichier | Écran | Format |
|---|---|---|
| `images/screenshot-dashboard.png` | Tableau de bord de pilotage | 1440 × 900 px (paysage) |
| `images/screenshot-chantiers.png` | Liste des chantiers | 1440 × 900 px (paysage) |
| `images/screenshot-fiche-chantier.png` | Fiche chantier (résumé) | 1440 × 900 px (paysage) |
| `images/screenshot-rapport-visite.png` | Historique des visites | 1440 × 900 px (paysage) |
| `images/screenshot-mobile.png` | Application mobile (fiche chantier) | 780 × 1688 px (portrait) |

Les captures paysage s'affichent dans des cadres « navigateur », la capture
portrait dans un cadre « mobile ». Pour les mettre à jour, remplacez simplement
le fichier en gardant le même nom : aucune modification de code n'est nécessaire.

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
