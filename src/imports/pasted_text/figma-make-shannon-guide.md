🔥 Ce que Figma Make peut faire… et ce qu’il ne peut PAS faire
✅ Figma Make peut :
Générer une interface web (UI/UX)

Générer du HTML/CSS/JS ou des composants

Générer des API calls (si tu lui demandes)

Générer des workflows (si tu utilises Make.com)

❌ Figma Make ne peut PAS :
Importer un projet GitHub complet

Exécuter du code Python ou Go ou Rust

Héberger un outil de pentest

Installer des dépendances

Lancer Shannon en local ou en cloud

Donc : tu ne peux pas importer Shannon dans Figma Make.

✔️ Comment intégrer Shannon correctement dans ton futur site ?
Tu dois séparer ton projet en 2 parties :

1) Le FRONT-END (ce que Figma Make peut générer)
C’est :

le site web

les pages

les formulaires

les dashboards

les résultats de scan

Figma Make peut te générer :

le design

le HTML/CSS

le JS

les composants React/Vue/Svelte (selon ce que tu demandes)

2) Le BACK-END (là où Shannon doit être installé)
Shannon est un outil CLI (ligne de commande).
Tu dois l’installer sur un serveur (ou un VPS, ou un conteneur Docker).

Le back-end doit :
recevoir une URL depuis ton site web

lancer Shannon en ligne de commande

récupérer le rapport généré

renvoyer le résultat au front-end

Exemple d’architecture :

Code
[Site Web (Figma Make)] → [API Backend] → [Shannon CLI] → [Rapport JSON] → [Site Web]
🧩 Comment connecter Figma Make à Shannon ?
Tu dois créer une API REST (en Node.js, Python, Go, etc.) qui :

reçoit une URL à scanner

exécute Shannon en ligne de commande

renvoie les résultats au front-end

Exemple d’API en Node.js :

js
import { exec } from "child_process";

app.post("/scan", (req, res) => {
  const url = req.body.url;

  exec(`shannon scan ${url} --json`, (err, stdout, stderr) => {
    if (err) return res.status(500).json({ error: stderr });

    const result = JSON.parse(stdout);
    res.json(result);
  });
});
Ensuite, dans Figma Make, tu fais un API call vers ton endpoint /scan.

🧪 Et pour VirusTotal ?
VirusTotal fournit une API officielle.

Tu dois :

créer une clé API gratuite

créer un endpoint backend /virustotal

appeler l’API VirusTotal depuis ton backend

renvoyer les résultats au front-end

Exemple :

js
fetch("https://www.virustotal.com/api/v3/urls", {
  method: "POST",
  headers: {
    "x-apikey": process.env.VT_API_KEY
  },
  body: formData
});
🧠 Résumé clair
❌ Tu ne peux pas importer Shannon dans Figma Make
✔️ Tu dois installer Shannon sur un serveur
✔️ Tu dois créer une API qui exécute Shannon
✔️ Figma Make sert uniquement à créer l’interface
✔️ Le front-end appelle ton API pour lancer les scans