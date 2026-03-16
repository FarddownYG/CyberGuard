
CYBERGUARD
Accueil
Pentesting
VirusTotal
Outils
Blog
Statut
A propos
DNS-over-HTTPS — Requetes reelles
DNS Security Check
Verifiez la configuration DNS complete de votre domaine via DNS-over-HTTPS (Google Public DNS). A, AAAA, NS, SPF, DKIM, DMARC, DNSSEC, MX, CAA, SSL et HSTS.

https://cyber-guard-dusky.vercel.app
Verifier DNS
Requetes DNS reelles via dns.google (DoH). Resultats en temps reel. DKIM teste avec 13 selecteurs courants.
Sous-domaine detecte

cyber-guard-dusky.vercel.app est un sous-domaine de vercel.app. Les enregistrements email (SPF, DKIM, DMARC, MX) sont generalement configures sur le domaine parent, pas sur les sous-domaines. Leur absence ici est normale.

Score DNS Security — cyber-guard-dusky.vercel.app

33%
Score base sur 6 verifications (les "info" ne comptent pas)

2
Critique
2
Alerte
2
OK
5
Info
IPv4:
64.29.17.67, 216.198.79.67

Recommandations (5)
▸
"cyber-guard-dusky.vercel.app" est un sous-domaine. Les enregistrements SPF, DKIM, DMARC et MX sont generalement configures sur le domaine parent (vercel.app), pas sur les sous-domaines. Ceci explique leur absence.

▸
Priorite haute : ajoutez un enregistrement SPF pour empecher l'usurpation d'email.

▸
Priorite haute : deployez DMARC pour proteger contre le phishing utilisant votre domaine.

▸
Recommande : activez DNSSEC pour proteger contre le DNS spoofing.

▸
Recommande : ajoutez des enregistrements CAA pour restreindre les autorites de certification.

SPF (Sender Policy Framework)

Aucun enregistrement SPF detecte

Aucun enregistrement SPF. Les emails de ce domaine pourraient etre usurpes (spoofing).

Correction : Ajoutez un enregistrement DNS TXT commencant par 'v=spf1' pour declarer les serveurs autorises a envoyer des emails.

DMARC (Domain-based Message Authentication)

Aucune politique DMARC detectee

Aucun enregistrement DMARC sur _dmarc.cyber-guard-dusky.vercel.app. Le domaine est vulnerable au spoofing.

Correction : Ajoutez un enregistrement TXT sur _dmarc.votre-domaine.com avec la valeur 'v=DMARC1; p=none; rua=mailto:dmarc@votre-domaine.com' pour commencer le monitoring.

DNSSEC

DNSSEC non detecte

DNSSEC ne semble pas active. Les reponses DNS pourraient etre falsifiees.

Correction : Contactez votre registrar ou hebergeur DNS pour activer DNSSEC. C'est souvent un bouton dans le panel d'administration.

CAA (Certificate Authority Authorization)

Aucun enregistrement CAA

Sans CAA, n'importe quelle autorite de certification peut emettre un certificat pour votre domaine.

Correction : Ajoutez un enregistrement CAA DNS pour limiter les CA autorisees. Ex: 0 issue "letsencrypt.org"

Enregistrements A (IPv4)

64.29.17.67, 216.198.79.67

2 adresse(s) IPv4 trouvee(s). Le domaine resout correctement.

Certificat SSL/TLS

HTTPS accessible

Le domaine repond sur HTTPS. Le certificat SSL/TLS est actif. Pour un audit detaille, utilisez SSL Labs.

Enregistrements AAAA (IPv6)

Aucun enregistrement AAAA

Pas d'IPv6 configure. Non bloquant mais recommande pour la compatibilite future.

Serveurs de noms (NS)

Pas d'enregistrements NS directs

Aucun enregistrement NS trouve a ce niveau. Si c'est un sous-domaine, les NS sont geres par le domaine parent.

DKIM (DomainKeys Identified Mail)

Aucun DKIM detecte (selecteurs standards)

Teste avec 13 selecteurs (default, google, selector1, selector2, dkim...). Le DKIM peut utiliser un selecteur personnalise non testable depuis l'exterieur.

Enregistrements MX

Aucun enregistrement MX

Aucun MX configure. Ce domaine ne recoit pas d'emails, ou utilise un service externe configure au niveau du domaine parent.

HSTS (HTTP Strict Transport Security)

Non verifiable depuis le navigateur

Le header HSTS ne peut pas etre lu cross-origin (CORS). Verifiez avec : curl -sI https://cyber-guard-dusky.vercel.app | grep -i strict

Resultats DNS reels

Toutes les requetes sont effectuees en temps reel via DNS-over-HTTPS (Google Public DNS).11 verifications effectuees. Aucune donnee simulee ou cachee.

CYBERGUARD
Plateforme open-source de cybersecurite. Testez, analysez et renforcez la securite de vos sites web.

OUTILS
Pentesting
Analyse VirusTotal
SSL Checker
Mots de passe
Analyseur fichiers
Email Checker
DNS Security
RESSOURCES
Blog Securite
Page de Statut
A propos
SYSTEME
Voir le statut en direct

Verifications temps reel

$ cyberguard --version
v3.0.0 — build 2026.03.14

© 2026 CyberGuard. Fait avecpour la cybersecurite.

Mentions legales
|
Confidentialite