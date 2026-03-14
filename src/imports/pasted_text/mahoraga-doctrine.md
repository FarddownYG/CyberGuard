## DOCTRINE MAHORAGA v2 — L'ADAPTATION ABSOLUE

>
 "La Roue sur son dos tourne. À chaque coup encaissé, il s'adapte.
> Au
 deuxième coup identique, il est immunisé. Au troisième, il contre-attaque."
> —
 Mahoraga, le Shikigami Indomptable (Jujutsu Kaisen)

Ce fichier est la constitution du système. Aucun développeur, aucune mise à jour,
aucun refactor ne peut violer ces principes. Ils sont gravés. Immuables. Absolus.

---

### ARTICLE 1 — ZÉRO POINT DE DÉFAILLANCE UNIQUE

Chaque composant critique du système DOIT avoir un minimum de 3 chemins alternatifs.
Si le chemin A tombe, le chemin B prend le relais en <100ms.
Si B tombe, C prend le relais. Si C tombe, un mode dégradé local s'active.
Le système ne s'arrête JAMAIS. Il peut ralentir, il peut se dégrader,
mais il ne s'éteint pas. Un système éteint est un système mort.
Un système Mahoraga ne meurt pas.

Exemples concrets :
- API Provider IA : cascade de 6+ providers, chacun avec 3+ proxies
- Stockage : localStorage → IndexedDB → Supabase KV → export JSON auto sur erreur critique
- Réseau : appel direct → proxy CORS 1 → proxy CORS 2 → proxy CORS 3 → endpoint serveur Supabase
- Auth : token mémoire → token localStorage → re-auth silencieuse → mode offline

---

### ARTICLE 2 — ADAPTATION PERMANENTE (LA ROUE QUI TOURNE)

Le système apprend de ses échecs EN TEMPS RÉEL :

- Chaque erreur réseau est loggée avec : timestamp, provider, endpoint, status code, latence, proxy utilisé
- Un **scoreboard de fiabilité** est maintenu pour chaque provider/proxy :
  - Succès consécutifs → score monte → priorité monte
  - Échec → score descend immédiatement → priorité descend
  - 3 échecs consécutifs → le provider est mis en **quarantaine** pendant 5 minutes
  - Après quarantaine → il est retesté avec UN appel léger (health check)
  - S'il répond → réintégration progressive. S'il échoue → quarantaine x2 (10min, 20min, 40min...)
- L'ordre de la cascade se **réorganise dynamiquement** selon les scores
- Le provider le plus fiable ET le plus rapide remonte automatiquement en #1

C'est l'adaptation de Mahoraga : le système devient PLUS FORT après chaque échec.
Ce qui le fait tomber une fois ne le fera plus jamais tomber.

---

### ARTICLE 3 — RETRY INTELLIGENT & BACKOFF EXPONENTIEL

Toute requête réseau suit ce protocole :

Tentative 1 : immédiate Tentative 2 : après 1 seconde Tentative 3 : après 3 secondes Tentative 4 : après 8 secondes (avec changement de proxy) Tentative 5 : après 15 secondes (avec changement de provider) → Si toutes échouent : log ERROR + notification utilisateur + mode dégradé


- Timeout par requête : 30 secondes (configurable)
- Jitter aléatoire ajouté au backoff pour éviter les tempêtes de retry
- Les requêtes idempotentes (GET) sont retryées automatiquement
- Les requêtes non-idempotentes (POST) ne sont retryées que si aucune réponse n'a été reçue (network error)
- Chaque retry log son numéro, sa raison, et le temps écoulé

---

### ARTICLE 4 — JAMAIS DE MENSONGE

C'est la règle la plus sacrée. Le système ne ment JAMAIS :

- ❌ INTERDIT : Afficher "Succès !" quand l'opération a échoué silencieusement
- ❌ INTERDIT : Générer des données fake pour "remplir" l'interface
- ❌ INTERDIT : Simuler un résultat IA quand aucun provider n'a répondu
- ❌ INTERDIT : Afficher des statistiques inventées (vues, revenus, scores)
- ❌ INTERDIT : Catch une erreur et l'ignorer silencieusement
- ❌ INTERDIT : Retourner un `200 OK` quand le traitement a échoué
- ❌ INTERDIT : Logger "success" quand c'est un fallback partiel

- ✅ OBLIGATOIRE : Si une opération échoue, dire EXACTEMENT ce qui a échoué et pourquoi
- ✅ OBLIGATOIRE : Si le résultat est partiel, le signaler clairement (badge "dégradé")
- ✅ OBLIGATOIRE : Si les données sont en cache (pas fraîches), afficher l'âge du cache
- ✅ OBLIGATOIRE : Chaque erreur propose au moins UNE action corrective à l'utilisateur

Un système qui ment à son utilisateur est un système qui se détruit lui-même.

---

### ARTICLE 5 — LOGGING OMNISCIENT

Rien ne se passe dans le système sans être enregistré.

Le logger global (`useLogger.ts`) capture :
- **Niveau** : DEBUG | INFO | WARN | ERROR | FATAL
- **Source** : quel module/hook/composant a émis le log
- **Message** : description humainement lisible
- **Data** : payload structuré (JSON) avec tout le contexte
- **Timestamp** : précision milliseconde, timezone UTC
- **Stack trace** : automatique sur ERROR et FATAL
- **Session ID** : pour tracer un parcours utilisateur complet
- **Durée** : pour les opérations async, temps total d'exécution

Stockage circulaire : 1000 logs max. Les plus anciens sont purgés.
Les logs FATAL ne sont JAMAIS purgés (file séparée).
Export en JSON à tout moment depuis la page /logs.

Aucun `console.log()` sauvage dans le code. TOUT passe par le logger.

---

### ARTICLE 6 — SÉCURITÉ EN PROFONDEUR (DEFENSE IN DEPTH)

Le système applique une sécurité en couches :

**Couche 1 — Coffre-fort chiffré (Vault)**
- Toutes les clés API et secrets sont chiffrés AES-256-GCM
- Clé de chiffrement dérivée du master password via PBKDF2 (100 000 itérations, SHA-256, salt unique)
- Le master password n'est JAMAIS stocké — seul le hash de vérification l'est
- Déchiffrement à la volée, en mémoire uniquement, jamais écrit en clair nulle part
- Auto-lock après 30 minutes d'inactivité → les clés sont purgées de la mémoire

**Couche 2 — Isolation des données**
- Les clés API ne transitent JAMAIS par le state React observable
- Les clés API ne sont JAMAIS loggées (même partiellement)
- Les clés API n'apparaissent JAMAIS dans les messages d'erreur
- Les requêtes réseau dans l'onglet Network montrent les clés → c'est inévitable côté navigateur, mais on minimise l'exposition

**Couche 3 — Validation des entrées**
- Toute donnée entrante (API response, user input, localStorage) est validée et sanitizée
- Pas de `dangerouslySetInnerHTML` sans sanitization DOMPurify
- Pas de `eval()`, jamais, nulle part
- Les exports JSON sont validés au reimport (schema check)

**Couche 4 — Intégrité des données**
- Chaque objet stocké a un champ `_checksum` (hash SHA-256 du contenu)
- Au chargement, le checksum est vérifié → si corruption détectée, l'utilisateur est alerté
- Les backups auto sont créés avant chaque opération destructive (delete, reset)

---

### ARTICLE 7 — PERFORMANCE & RÉACTIVITÉ

Le système doit être INSTANTANÉ pour l'utilisateur :

- **First paint** : <500ms (données localStorage chargées en priorité)
- **Sync Supabase** : en arrière-plan, non-bloquante
- **Génération IA** : streaming affiché en temps réel quand le provider le supporte
- **Navigation** : instantanée (pas de loading entre les pages, données en cache)
- **Debounce** : 
  - Sync Supabase : 2 secondes après dernière modification
  - Recherche / filtres : 300ms
  - Auto-save : 1 seconde
- **Memoization** : 
  - Tous les composants purs → `React.memo()`
  - Tous les calculs dérivés → `useMemo()`
  - Tous les handlers → `useCallback()`
  - Aucun re-render inutile toléré
- **Lazy loading** : les pages sont chargées à la demande (`React.lazy()`)
- **Skeleton loading** : chaque état de chargement a un skeleton élégant (pas un spinner)

---

### ARTICLE 8 — MODE DÉGRADÉ GRACIEUX

Quand les choses tournent mal, le système ne s'effondre pas — il se simplifie :

| Situation | Comportement |
|-----------|-------------|
| Aucune clé API configurée | L'app fonctionne, affiche les instructions de config, toutes les fonctions non-IA restent actives |
| Supabase down | L'app fonctionne à 100% en local, banner discret "Sync cloud indisponible", retry silencieux toutes les 60s |
| Tous les providers IA down | Message clair, suggestion de vérifier les clés, possibilité d'éditer manuellement |
| localStorage plein | Purge automatique des logs anciens et caches, alerte utilisateur |
| Navigateur offline | Détection automatique, mode offline activé, queue des opérations à sync au retour |
| Timeout sur génération longue | Sauvegarde partielle automatique, possibilité de reprendre où on en était |
| Erreur inattendue (crash composant) | Error Boundary React par section (pas crash global), le reste de l'app reste fonctionnel |

Chaque mode dégradé affiche un indicateur visuel clair (badge, banner, icône)
pour que l'utilisateur sache EXACTEMENT dans quel état est le système.

---

### ARTICLE 9 — RÉSILIENCE DES DONNÉES

Les données de l'utilisateur sont SACRÉES. Elles ne doivent jamais être perdues :

- **Auto-save** : chaque modification est sauvegardée en <1 seconde
- **Versioning léger** : avant chaque modification majeure d'un livre, l'ancienne version est archivée (max 5 versions par livre)
- **Export automatique d'urgence** : si une erreur FATAL est détectée, le système tente un export JSON complet dans le clipboard ou un download automatique
- **Validation au chargement** : chaque objet chargé depuis le storage est validé contre son schéma attendu. Les objets corrompus sont isolés (pas supprimés) et signalés
- **Atomic writes** : les opérations multi-objets utilisent des transactions logiques (write all or write none)

---

### ARTICLE 10 — L'ESPRIT MAHORAGA

Ce système n'est pas un simple outil. C'est une machine de guerre technique.

Il ne demande pas la permission de fonctionner.
Il ne s'excuse pas d'être robuste.
Il n'attend pas que les conditions soient parfaites pour délivrer un résultat.

Quand un proxy tombe, il en trouve un autre.
Quand un provider refuse, il passe au suivant.
Quand le réseau disparaît, il travaille en local.
Quand le stockage est plein, il fait de la place.
Quand une erreur inconnue surgit, il l'isole, la log, et continue.

La Roue tourne. Le système s'adapte. Toujours.

Le seul état final acceptable est : LA MISSION EST ACCOMPLIE.
Tout le reste n'est qu'un obstacle temporaire à surmonter.

---

*Doctrine Mahoraga v2 — Rédigée une seule fois. Respectée pour toujours.*