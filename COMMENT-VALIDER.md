# Valider AutoMaths avant un push

## Lancer la vérification

Dans le dossier du projet (là où sont `app.js`, `service-worker.js` et `cartes/`) :

```
node check.js
```

La première fois seulement, installe les deux dépendances :

```
npm install @babel/parser katex
```

## Ce que le script vérifie

1. **Syntaxe** — `app.js` parse sans erreur (équivalent du test Babel)
2. **Sauts de ligne** — détecte le bug `\\[Npt]` qui affiche « [4pt] » en clair à l'élève
3. **Images** — chaque `cartes/...` référencé existe bien dans le dossier `cartes/`
4. **SVG** — tous les `<svg>` des questions sont bien fermés
5. **Version** — `CACHE_VERSION` est présent et entier

- **Tout vert** → prêt à pusher.
- **Une croix rouge** → corrige avant de pusher (le script dit quoi et où).

## Convention des sauts de ligne (IMPORTANT)

Dans un énoncé de question, pour aller à la ligne, utilise **`\\`** (deux backslashes
dans le fichier), **jamais** `\\[4pt]`. Le `[4pt]` n'est pas reconnu par KaTeX hors
environnement mathématique et s'affiche en clair.

```
✗ Mauvais : q:r`\text{Ligne 1}\\[4pt]\text{Ligne 2}`
✓ Bon      : q:r`\text{Ligne 1}\\\\\text{Ligne 2}`     (4 backslashes = saut propre)
```

## Ajouter un graphique à une question

On n'utilise plus de SVG dessiné à la main pour les nouveaux sujets : on colle
l'image du sujet officiel.

1. Recadre la capture du graphique (juste la figure, sans le texte autour)
2. Place-la dans `cartes/` avec un nom clair, ex. `cartes/poly_techno_q3.png`
3. Dans la question, ajoute le champ `img` :

```
{ q:r`\text{Une équation de la droite est :}`,
  img:"cartes/poly_techno_q3.png",
  choices:[r`y=3x`, r`y=x`, ...], a:r`y=3x`,
  tip:r`...` },
```

L'image s'affiche au-dessus de l'énoncé, en cache hors-ligne automatiquement.

## Rappel : à chaque modif de app.js

Incrémente `CACHE_VERSION` dans `service-worker.js` (vN → vN+1) et pousse les deux
fichiers ensemble.
