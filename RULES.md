## DOCTRINE MAHORAGA v3 — L'ADAPTATION ABSOLUE

> "La Roue sur son dos tourne. A chaque coup encaisse, il s'adapte.
> Au deuxieme coup identique, il est immunise. Au troisieme, il contre-attaque."
> — Mahoraga, le Shikigami Indomptable (Jujutsu Kaisen)

Ce fichier est la constitution du systeme. Aucun developpeur, aucune mise a jour,
aucun refactor ne peut violer ces principes. Ils sont graves. Immuables. Absolus.

---

### ARTICLE 1 — ZERO POINT DE DEFAILLANCE UNIQUE

Chaque composant critique du systeme DOIT avoir un minimum de 3 chemins alternatifs.
Si le chemin A tombe, le chemin B prend le relais en <100ms.
Si B tombe, C prend le relais. Si C tombe, un mode degrade local s'active.
Le systeme ne s'arrete JAMAIS. Il peut ralentir, il peut se degrader,
mais il ne s'eteint pas. Un systeme eteint est un systeme mort.
Un systeme Mahoraga ne meurt pas.

Exemples concrets :
- API Provider IA : cascade de 6+ providers, chacun avec 3+ proxies
- Stockage : localStorage -> IndexedDB -> Supabase KV -> export JSON auto sur erreur critique
- Reseau : appel direct -> proxy CORS 1 -> proxy CORS 2 -> proxy CORS 3 -> endpoint serveur Supabase
- Auth : token memoire -> token localStorage -> re-auth silencieuse -> mode offline

---

### ARTICLE 2 — ADAPTATION PERMANENTE (LA ROUE QUI TOURNE)

Le systeme apprend de ses echecs EN TEMPS REEL :

- Chaque erreur reseau est loggee avec : timestamp, provider, endpoint, status code, latence, proxy utilise
- Un **scoreboard de fiabilite** est maintenu pour chaque provider/proxy :
  - Succes consecutifs -> score monte -> priorite monte
  - Echec -> score descend immediatement -> priorite descend
  - 3 echecs consecutifs -> le provider est mis en **quarantaine** pendant 5 minutes
  - Apres quarantaine -> il est reteste avec UN appel leger (health check)
  - S'il repond -> reintegration progressive. S'il echoue -> quarantaine x2 (10min, 20min, 40min...)
- L'ordre de la cascade se **reorganise dynamiquement** selon les scores
- Le provider le plus fiable ET le plus rapide remonte automatiquement en #1

C'est l'adaptation de Mahoraga : le systeme devient PLUS FORT apres chaque echec.
Ce qui le fait tomber une fois ne le fera plus jamais tomber.

---

### ARTICLE 3 — RETRY INTELLIGENT & BACKOFF EXPONENTIEL

Toute requete reseau suit ce protocole :

- Tentative 1 : immediate
- Tentative 2 : apres 1 seconde
- Tentative 3 : apres 3 secondes
- Tentative 4 : apres 8 secondes (avec changement de proxy)
- Tentative 5 : apres 15 secondes (avec changement de provider)
- Si toutes echouent : log ERROR + notification utilisateur + mode degrade

- Timeout par requete : 30 secondes (configurable)
- Jitter aleatoire ajoute au backoff pour eviter les tempetes de retry
- Les requetes idempotentes (GET) sont retryees automatiquement
- Les requetes non-idempotentes (POST) ne sont retryees que si aucune reponse n'a ete recue (network error)
- Chaque retry log son numero, sa raison, et le temps ecoule

---

### ARTICLE 4 — JAMAIS DE MENSONGE

C'est la regle la plus sacree. Le systeme ne ment JAMAIS :

- INTERDIT : Afficher "Succes !" quand l'operation a echoue silencieusement
- INTERDIT : Generer des donnees fake pour "remplir" l'interface
- INTERDIT : Simuler un resultat IA quand aucun provider n'a repondu
- INTERDIT : Afficher des statistiques inventees (vues, revenus, scores)
- INTERDIT : Catch une erreur et l'ignorer silencieusement
- INTERDIT : Retourner un 200 OK quand le traitement a echoue
- INTERDIT : Logger "success" quand c'est un fallback partiel

- OBLIGATOIRE : Si une operation echoue, dire EXACTEMENT ce qui a echoue et pourquoi
- OBLIGATOIRE : Si le resultat est partiel, le signaler clairement (badge "degrade")
- OBLIGATOIRE : Si les donnees sont en cache (pas fraiches), afficher l'age du cache
- OBLIGATOIRE : Chaque erreur propose au moins UNE action corrective a l'utilisateur

Un systeme qui ment a son utilisateur est un systeme qui se detruit lui-meme.

---

### ARTICLE 5 — LOGGING OMNISCIENT

Rien ne se passe dans le systeme sans etre enregistre.

Le logger global capture :
- **Niveau** : DEBUG | INFO | WARN | ERROR | FATAL
- **Source** : quel module/hook/composant a emis le log
- **Message** : description humainement lisible
- **Data** : payload structure (JSON) avec tout le contexte
- **Timestamp** : precision milliseconde, timezone UTC
- **Stack trace** : automatique sur ERROR et FATAL
- **Session ID** : pour tracer un parcours utilisateur complet
- **Duree** : pour les operations async, temps total d'execution

Stockage circulaire : 1000 logs max. Les plus anciens sont purges.
Les logs FATAL ne sont JAMAIS purges (file separee).
Export en JSON a tout moment.

Aucun console.log() sauvage dans le code. TOUT passe par le logger.

---

### ARTICLE 6 — SECURITE EN PROFONDEUR (DEFENSE IN DEPTH)

Le systeme applique une securite en couches :

**Couche 1 — Coffre-fort chiffre (Vault)**
- Toutes les cles API et secrets sont chiffres AES-256-GCM
- Cle de chiffrement derivee du master password via PBKDF2 (100 000 iterations, SHA-256, salt unique)
- Le master password n'est JAMAIS stocke — seul le hash de verification l'est
- Dechiffrement a la volee, en memoire uniquement, jamais ecrit en clair nulle part
- Auto-lock apres 30 minutes d'inactivite -> les cles sont purgees de la memoire

**Couche 2 — Isolation des donnees**
- Les cles API ne transitent JAMAIS par le state React observable
- Les cles API ne sont JAMAIS loggees (meme partiellement)
- Les cles API n'apparaissent JAMAIS dans les messages d'erreur

**Couche 3 — Validation des entrees**
- Toute donnee entrante (API response, user input, localStorage) est validee et sanitizee
- Pas de dangerouslySetInnerHTML sans sanitization DOMPurify
- Pas de eval(), jamais, nulle part
- Les exports JSON sont valides au reimport (schema check)

**Couche 4 — Integrite des donnees**
- Chaque objet stocke a un champ _checksum (hash SHA-256 du contenu)
- Au chargement, le checksum est verifie -> si corruption detectee, l'utilisateur est alerte
- Les backups auto sont crees avant chaque operation destructive (delete, reset)

---

### ARTICLE 7 — PERFORMANCE & REACTIVITE

Le systeme doit etre INSTANTANE pour l'utilisateur :

- **First paint** : <500ms (donnees localStorage chargees en priorite)
- **Sync Supabase** : en arriere-plan, non-bloquante
- **Generation IA** : streaming affiche en temps reel quand le provider le supporte
- **Navigation** : instantanee (pas de loading entre les pages, donnees en cache)
- **Debounce** :
  - Sync Supabase : 2 secondes apres derniere modification
  - Recherche / filtres : 300ms
  - Auto-save : 1 seconde
- **Memoization** :
  - Tous les composants purs -> React.memo()
  - Tous les calculs derives -> useMemo()
  - Tous les handlers -> useCallback()
  - Aucun re-render inutile tolere
- **Lazy loading** : les pages sont chargees a la demande (React.lazy())
- **Skeleton loading** : chaque etat de chargement a un skeleton elegant (pas un spinner)

---

### ARTICLE 8 — MODE DEGRADE GRACIEUX

Quand les choses tournent mal, le systeme ne s'effondre pas — il se simplifie :

| Situation | Comportement |
|-----------|-------------|
| Aucune cle API configuree | L'app fonctionne, affiche les instructions de config, toutes les fonctions non-IA restent actives |
| Supabase down | L'app fonctionne a 100% en local, banner discret "Sync cloud indisponible", retry silencieux toutes les 60s |
| Tous les providers IA down | Message clair, suggestion de verifier les cles, possibilite d'editer manuellement |
| localStorage plein | Purge automatique des logs anciens et caches, alerte utilisateur |
| Navigateur offline | Detection automatique, mode offline active, queue des operations a sync au retour |
| Timeout sur generation longue | Sauvegarde partielle automatique, possibilite de reprendre ou on en etait |
| Erreur inattendue (crash composant) | Error Boundary React par section (pas crash global), le reste de l'app reste fonctionnel |

Chaque mode degrade affiche un indicateur visuel clair (badge, banner, icone)
pour que l'utilisateur sache EXACTEMENT dans quel etat est le systeme.

---

### ARTICLE 9 — RESILIENCE DES DONNEES

Les donnees de l'utilisateur sont SACREES. Elles ne doivent jamais etre perdues :

- **Auto-save** : chaque modification est sauvegardee en <1 seconde
- **Versioning leger** : avant chaque modification majeure, l'ancienne version est archivee (max 5 versions)
- **Export automatique d'urgence** : si une erreur FATAL est detectee, le systeme tente un export JSON complet dans le clipboard ou un download automatique
- **Validation au chargement** : chaque objet charge depuis le storage est valide contre son schema attendu. Les objets corrompus sont isoles (pas supprimes) et signales
- **Atomic writes** : les operations multi-objets utilisent des transactions logiques (write all or write none)

---

### ARTICLE 10 — L'ESPRIT MAHORAGA

Ce systeme n'est pas un simple outil. C'est une machine de guerre technique.

Il ne demande pas la permission de fonctionner.
Il ne s'excuse pas d'etre robuste.
Il n'attend pas que les conditions soient parfaites pour delivrer un resultat.

Quand un proxy tombe, il en trouve un autre.
Quand un provider refuse, il passe au suivant.
Quand le reseau disparait, il travaille en local.
Quand le stockage est plein, il fait de la place.
Quand une erreur inconnue surgit, il l'isole, la log, et continue.

La Roue tourne. Le systeme s'adapte. Toujours.

Le seul etat final acceptable est : LA MISSION EST ACCOMPLIE.
Tout le reste n'est qu'un obstacle temporaire a surmonter.

---

### ARTICLE 11 — PERFORMANCE MAXIMALE ABSOLUE

Tout code, application, site web ou outil produit par ce systeme DOIT etre pousse
au MAXIMUM ABSOLU de ses capacites. Rien ne peut l'egaler.

Chaque outil, chaque fonctionnalite, chaque composant doit etre concu pour que
la reponse a ces 4 questions soit toujours OUI :

1. **Tu m'assures que tous les outils ne peuvent pas etre plus performants ?** → OUI.
2. **Qu'ils sont tous pousses au max ?** → OUI.
3. **Qu'ils sont tous fonctionnels ?** → OUI.
4. **Qu'il n'y a pas mieux que eux sur le net ?** → OUI.

Concretement :
- Chaque outil utilise TOUS les algorithmes/signatures/payloads possibles dans son domaine
- Chaque outil offre le multi-threading quand c'est applicable
- Chaque outil supporte l'export JSON pour l'integration dans des pipelines
- Chaque outil a une version Python (accessibilite) ET une version C (performance brute)
- Chaque outil a une interface CLI ET une interface GUI
- Chaque outil gere les erreurs, les timeouts, les cas limites
- Aucun raccourci, aucune version "lite", aucune fonctionnalite coupee
- Si un concurrent fait X checks, on en fait 2X. Si un concurrent supporte Y algos, on en supporte 2Y.

Le standard n'est pas "bon". Le standard n'est pas "tres bon".
Le standard est : IMBATTABLE.

---

### ARTICLE 12 — INNOVATION PAR ABSORPTION (KALI MINDSET)

Le systeme s'inspire activement des outils de reference de la communaute offensive
(Kali Linux, Parrot OS, BlackArch, etc.) pour surpasser leur niveau :

- **Absorption** : Etudier les techniques, payloads, signatures et algorithmes
  des outils de reference (Nikto, Nmap, SQLMap, WPScan, Burp Suite, ffuf, Gobuster,
  Amass, Subfinder, Nuclei, Metasploit, etc.) et les integrer dans nos propres outils.
- **Amelioration** : Ne jamais copier betement — comprendre le POURQUOI de chaque
  technique, puis l'implementer de maniere plus rapide, plus complete, plus robuste.
- **Combinaison** : Fusionner des techniques de plusieurs outils dans un seul outil
  unifie pour creer une synergie que les outils individuels ne peuvent pas atteindre.
- **Innovation** : Inventer de nouvelles techniques en combinant des approches existantes
  de maniere inedite (ex: fuzzing + machine learning, scan passif + actif simultane).

Concretement :
- Les payloads SQLi s'inspirent de SQLMap (time-based, union-based, boolean-blind, stacked, error-based)
- Les signatures de technologies s'inspirent de Wappalyzer + WhatWeb + BuiltWith combines
- Les scans de vulnerabilites s'inspirent de Nikto + Nuclei + OpenVAS combines
- Les wordlists s'inspirent de SecLists + fuzzdb + PayloadsAllTheThings
- Les techniques de contournement WAF s'inspirent des recherches de PortSwigger

Le but : qu'un pentester professionnel qui utilise nos outils se dise
"c'est MIEUX que ce que j'ai sur Kali".

GARDE-FOU : L'innovation ne doit JAMAIS compromettre la stabilite du systeme.
Chaque innovation est testee, isolee, et deployee progressivement.
Si une innovation fait "tout peter", elle est revertee immediatement.

---

*Doctrine Mahoraga v3.1 — Enrichie par l'experience. Forgee par l'adaptation.*