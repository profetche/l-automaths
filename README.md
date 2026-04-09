# 🚀 l'AutoMaths — Guide d'installation PWA

## Déploiement en 5 minutes (Vercel — gratuit)

### Étape 1 : Crée un compte Vercel
→ https://vercel.com (connexion avec GitHub)

### Étape 2 : Installe Vercel CLI
```bash
npm install -g vercel
```

### Étape 3 : Déploie
```bash
cd ce-dossier
vercel --prod
```
→ Tu obtiens une URL du type : https://automaths-xxxxx.vercel.app

### Étape 4 : Installe sur ton téléphone
1. Ouvre l'URL dans **Chrome** (Android) ou **Safari** (iPhone)
2. **Android** : Menu ⋮ → "Ajouter à l'écran d'accueil"
3. **iPhone** : Bouton Partager → "Sur l'écran d'accueil"
4. L'app s'installe comme une vraie application ✅

---

## Notifications push (optionnel)

Pour les vraies notifs Duolingo-style, il faut un mini-serveur.
Crée un fichier `api/notify.js` sur Vercel :

```js
// api/notify.js
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:ton@email.com',
  process.env.VAPID_PUBLIC,
  process.env.VAPID_PRIVATE
);

export default async function handler(req, res) {
  const { subscription, message } = req.body;
  await webpush.sendNotification(subscription, JSON.stringify({
    title: "l'AutoMaths 🤖",
    body: message || "Sigma t'attend ! 5 minutes aujourd'hui ?"
  }));
  res.json({ ok: true });
}
```

Génère tes clés VAPID :
```bash
npx web-push generate-vapid-keys
```

---

## Structure des fichiers

```
automaths/
├── index.html          ← Point d'entrée PWA
├── app.js              ← L'application complète
├── manifest.json       ← Config PWA (icônes, nom...)
├── service-worker.js   ← Cache hors-ligne + notifs
├── icon-192.png        ← Icône app (à créer)
├── icon-512.png        ← Icône splash (à créer)
└── README.md           ← Ce fichier
```

## Icônes

Crée deux PNGs avec le logo AutoMaths (fond orange, Σ blanc) :
- icon-192.png (192×192px)
- icon-512.png (512×512px)

Outil gratuit : https://www.pwabuilder.com/imageGenerator

---

## Tableau de bord professeur

Ouvre `teacher-dashboard.html` dans un navigateur.
Les élèves exportent leur code QR depuis l'app,
tu le scannes dans le dashboard pour voir leurs progrès.

