import { useState, useEffect } from "react";
import { Mail, Search, CheckCircle, XCircle, AlertTriangle, Shield, Loader2, Link2, SpellCheck, Bug, ChevronDown, ChevronUp, Sparkles, Brain, Clock, Lock, AlertOctagon, Globe, Server, AtSign, Fingerprint, Eye } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { EMAIL_RATE_CONFIG, getGenericQuota, recordGenericRequest } from "./rate-limiter";
import { GenericQuotaDisplay } from "./GenericQuotaDisplay";

// ─── Types ───────────────────────────────────────────────────────────────

interface CheckItem {
  label: string;
  status: "pass" | "fail" | "warn";
  detail: string;
  fix?: string;
  priority: number;
}

interface LinkScanResult {
  url: string;
  safe: boolean;
  threats: string[];
}

interface SpellingError {
  word: string;
  suggestion: string;
  context: string;
}

interface GeminiAnalysis {
  verdict: "safe" | "suspicious" | "dangerous";
  confidence: number;
  summary: string;
  details: string[];
  tactics: string[];
  domain_analysis: string;
  mx_analysis: string;
  header_red_flags: string[];
  social_engineering_score: number;
  recommended_action: string;
}

interface EmailAnalysis {
  email: string;
  isValid: boolean;
  checks: CheckItem[];
  riskScore: number;
  riskLabel: string;
  detectedLinks: LinkScanResult[];
  spellingErrors: SpellingError[];
  gemini: GeminiAnalysis | null;
  domainInfo: DomainInfo | null;
  mxRecords: MXRecord[] | null;
}

interface DomainInfo {
  domain: string;
  hasValidStructure: boolean;
  tld: string;
  subdomainCount: number;
  domainAge: string;
  punycode: boolean;
}

interface MXRecord {
  exchange: string;
  priority: number;
}

// ─── Data ────────────────────────────────────────────────────────────────

const DISPOSABLE_DOMAINS = new Set([
  "tempmail.com", "throwaway.email", "guerrillamail.com", "mailinator.com",
  "yopmail.com", "10minutemail.com", "trashmail.com", "sharklasers.com",
  "guerrillamailblock.com", "grr.la", "dispostable.com", "temp-mail.org",
  "fakeinbox.com", "maildrop.cc", "harakirimail.com", "getairmail.com",
  "mailnesia.com", "tempail.com", "tempmailaddress.com", "throwam.com",
  "mohmal.com", "emailondeck.com", "crazymailing.com", "guerrillamail.info",
  "guerrillamail.net", "guerrillamail.org", "guerrillamail.de",
  "trash-mail.com", "trashmail.me", "trashmail.net", "mytemp.email",
  "tempinbox.com", "burnermail.io", "mailcatch.com", "meltmail.com",
  "spamgourmet.com", "mintemail.com", "mailforspam.com", "deadaddress.com",
  "safetymail.info", "nospam.ze.tc", "mailexpire.com", "inboxalias.com",
  "jetable.org", "mailnull.com", "nomail.xl.cx", "spamfree24.org",
  "sneakemail.com", "33mail.com", "mailsac.com", "getnada.com",
  "anonbox.net", "binkmail.com", "bobmail.info", "bugmenot.com",
  "devnullmail.com", "discard.email", "discardmail.com", "discardmail.de",
  "disposableaddress.com", "disposableemailaddresses.emailmiser.com",
  "dodgeit.com", "dodgit.com", "dontreg.com", "dontsendmespam.de",
  "drdrb.net", "emailigo.de", "emailmiser.com", "emailsensei.com",
  "emailtemporario.com.br", "ephemail.net", "etranquil.com",
  "filzmail.com", "fizmail.com", "fleckens.hu", "frapmail.com",
  "gishpuppy.com", "great-host.in", "greensloth.com",
]);

const REPUTABLE_PROVIDERS = new Set([
  "gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "protonmail.com",
  "icloud.com", "aol.com", "zoho.com", "fastmail.com", "tutanota.com",
  "live.com", "msn.com", "pm.me", "proton.me", "yahoo.fr", "orange.fr",
  "free.fr", "sfr.fr", "laposte.net", "wanadoo.fr", "gmx.com", "gmx.fr",
  "mail.com", "hey.com", "outlook.fr", "hotmail.fr", "me.com", "mac.com",
  "yandex.com", "mail.ru", "inbox.com", "runbox.com", "mailfence.com",
  "hushmail.com", "startmail.com", "posteo.de", "disroot.org",
  "riseup.net", "autistici.org", "tuta.com", "tuta.io",
]);

const URGENCY_PATTERNS = [
  /urgent/i, /immediat/i, /immédiat/i, /vite/i, /rapidement/i,
  /dernier\s*(avis|rappel|chance|delai)/i, /expire/i, /expir[ée]/i,
  /24\s*h/i, /48\s*h/i, /72\s*h/i, /\d+\s*heure/i, /\d+\s*jour/i,
  /dans\s*les\s*\d+/i, /avant\s*(le|la|qu)/i, /sans\s*delai/i,
  /agir\s*maintenant/i, /agissez/i, /ne\s*tardez\s*pas/i,
  /temps\s*(limit[ée]|restant)/i, /compte\s*a\s*rebours/i,
  /suspension\s*(imminent|definitiv|automat)/i,
  /desactiv(er|ation|é)/i, /sera\s*(supprim|bloqu|ferm|desactiv)/i,
  /dernier\s*avertissement/i, /derniere\s*notification/i,
  /action\s*requise/i, /action\s*immediate/i,
  /plus\s*que\s*\d+/i, /fermeture/i, /cloture/i,
  /repondez\s*(vite|rapidement|immediatement)/i,
];

const PHISHING_KEYWORDS = [
  "compte suspendu", "verifiez", "vérifiez", "cliquez ici", "mot de passe expire",
  "votre compte", "confirmer votre", "securite compromise", "sécurité compromise",
  "activite suspecte", "activité suspecte", "mise a jour requise",
  "felicitations", "félicitations", "gagnant", "loterie", "heritage", "héritage",
  "prince", "virement", "carte bancaire", "paypal", "apple id", "netflix",
  "amazon", "remboursement", "reclamation", "réclamation",
  "cliquez sur le lien", "lien ci-dessous", "connectez-vous",
  "identifiant", "reinitialiser", "réinitialiser",
  "cher client", "chere cliente", "cher utilisateur",
  "votre colis", "livraison echouee", "livraison échouée",
  "facture impayee", "facture impayée", "paiement refuse",
  "amende", "contravention", "impot", "impôt",
  "votre commande", "remboursement en attente",
  "gagner", "beneficiaire", "bénéficiaire", "transfert de fonds",
  "informations personnelles", "donnees personnelles",
  "verifier votre identite", "vérifier votre identité",
  "debloquer", "débloquer", "restaurer votre acces",
  "acces restreint", "accès restreint", "acces bloque",
  "conformite", "mise en conformite",
  "regularisation", "régularisation",
  "offre speciale", "offre exclusive", "offre limitee",
  "gratuit", "100%", "sans frais",
];

const PERSONAL_INFO_PATTERNS = [
  /mot de passe/i, /password/i, /numero de carte/i, /numéro de carte/i,
  /code secret/i, /cvv/i, /cvc/i, /\bpin\b/i, /identifiant/i,
  /coordonn[ée]es?\s*bancaire/i, /\brib\b/i, /\biban\b/i,
  /num[eé]ro\s*de\s*s[eé]curit[eé]/i, /carte\s*(vitale|d'identit)/i,
  /date\s*de\s*naissance/i, /pi[eè]ce\s*d'identit/i,
  /passeport/i, /permis\s*de\s*conduire/i,
  /code\s*de\s*v[eé]rification/i, /code\s*sms/i, /code\s*otp/i,
  /num[eé]ro\s*de\s*t[eé]l[eé]phone/i,
];

const PHISHING_TYPOS: { pattern: RegExp; word: string; suggestion: string }[] = [
  { pattern: /\bconexion\b/gi, word: "conexion", suggestion: "connexion" },
  { pattern: /\bconnecxion\b/gi, word: "connecxion", suggestion: "connexion" },
  { pattern: /\bconection\b/gi, word: "conection", suggestion: "connexion" },
  { pattern: /\bauthantification\b/gi, word: "authantification", suggestion: "authentification" },
  { pattern: /\bidentifian\b/gi, word: "identifian", suggestion: "identifiant" },
  { pattern: /\bveuiller\b/gi, word: "veuiller", suggestion: "veuillez" },
  { pattern: /\bveullier\b/gi, word: "veullier", suggestion: "veuillez" },
  { pattern: /\bbanquaire\b/gi, word: "banquaire", suggestion: "bancaire" },
  { pattern: /\bbanquere\b/gi, word: "banquere", suggestion: "bancaire" },
  { pattern: /\bsuspencion\b/gi, word: "suspencion", suggestion: "suspension" },
  { pattern: /\brembourssement\b/gi, word: "rembourssement", suggestion: "remboursement" },
  { pattern: /\bremboursment\b/gi, word: "remboursment", suggestion: "remboursement" },
  { pattern: /\bpayement\b/gi, word: "payement", suggestion: "paiement" },
  { pattern: /\bpayemant\b/gi, word: "payemant", suggestion: "paiement" },
  { pattern: /\breclammation\b/gi, word: "reclammation", suggestion: "reclamation" },
  { pattern: /\bimédiatement\b/gi, word: "imediatement", suggestion: "immediatement" },
  { pattern: /\burjent\b/gi, word: "urjent", suggestion: "urgent" },
  { pattern: /\bcoordonées\b/gi, word: "coordonees", suggestion: "coordonnees" },
  { pattern: /\bactivitée\b/gi, word: "activitee", suggestion: "activite" },
  { pattern: /\becheence\b/gi, word: "echeence", suggestion: "echeance" },
  { pattern: /\bmot de pase\b/gi, word: "mot de pase", suggestion: "mot de passe" },
  { pattern: /\bverifi[ée]\b/gi, word: "verifié", suggestion: "verifie" },
  { pattern: /\binformations personnel\b/gi, word: "informations personnel", suggestion: "informations personnelles" },
  { pattern: /\bsécurite\b/gi, word: "securite", suggestion: "securite" },
];

// ─── Homoglyph Detection ─────────────────────────────────────────────────

const HOMOGLYPH_MAP: Record<string, string> = {
  "\u0430": "a", "\u0435": "e", "\u043e": "o", "\u0440": "p", "\u0441": "c",
  "\u0443": "y", "\u0445": "x", "\u0456": "i", "\u0458": "j", "\u04bb": "h",
  "\u0501": "d", "\u051b": "q", "\u051d": "w", "\u0405": "S", "\u0406": "I",
  "\u0410": "A", "\u0412": "B", "\u0415": "E", "\u041a": "K", "\u041c": "M",
  "\u041d": "H", "\u041e": "O", "\u0420": "P", "\u0421": "C", "\u0422": "T",
  "\u0425": "X", "\u0427": "4",
  // Latin look-alikes
  "\u0131": "i", "\u017f": "s", "\u0261": "g",
};

function detectHomoglyphs(text: string): { char: string; position: number; looksLike: string }[] {
  const found: { char: string; position: number; looksLike: string }[] = [];
  for (let i = 0; i < text.length; i++) {
    const mapped = HOMOGLYPH_MAP[text[i]];
    if (mapped) {
      found.push({ char: text[i], position: i, looksLike: mapped });
    }
  }
  return found;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  return [...new Set(text.match(urlRegex) || [])];
}

function detectSpellingErrors(text: string): SpellingError[] {
  const errors: SpellingError[] = [];
  const lowerText = text.toLowerCase();
  for (const typo of PHISHING_TYPOS) {
    const match = typo.pattern.exec(lowerText);
    if (match) {
      const idx = match.index;
      const start = Math.max(0, idx - 25);
      const end = Math.min(text.length, idx + match[0].length + 25);
      errors.push({
        word: match[0],
        suggestion: typo.suggestion,
        context: "..." + text.slice(start, end).trim() + "...",
      });
    }
  }
  // Cyrillic homoglyph detection
  const cyrillicMatches = text.match(/[\u0400-\u04FF]/g);
  if (cyrillicMatches && cyrillicMatches.length > 0 && cyrillicMatches.length < 20) {
    errors.push({
      word: "Caracteres cyrilliques detectes",
      suggestion: "Attaque par homoglyphes possible (lettres similaires d'un autre alphabet)",
      context: `${cyrillicMatches.length} caractere(s) cyrillique(s) dans un texte latin`,
    });
  }
  return errors;
}

function scanLink(url: string): LinkScanResult {
  const suspiciousShorteners = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "rb.gy", "cutt.ly", "shorturl.at"];
  const dangerousTLDs = [".xyz", ".top", ".click", ".loan", ".tk", ".ml", ".ga", ".cf", ".gq", ".work", ".buzz", ".info", ".pw"];
  const phishingUrlKeywords = ["login", "signin", "verify", "account", "update", "secure", "bank", "paypal", "netflix", "confirm", "validate", "restore", "unlock", "webscr", "cmd=", "redirect"];

  const threats: string[] = [];
  const lowerUrl = url.toLowerCase();

  if (/https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(url)) threats.push("URL avec adresse IP directe — tres suspect");
  if (suspiciousShorteners.some(d => lowerUrl.includes(d))) threats.push("Raccourcisseur d'URL — masque la destination reelle");
  if (dangerousTLDs.some(t => lowerUrl.includes(t))) threats.push("Extension de domaine souvent utilisee pour le phishing");
  if (phishingUrlKeywords.some(k => lowerUrl.includes(k))) threats.push("Mots-cles de phishing dans l'URL");
  if ((url.match(/-/g) || []).length > 3) threats.push("Nombre excessif de tirets dans le domaine");
  if ((url.match(/\./g) || []).length > 4) threats.push("Nombre excessif de sous-domaines");
  if (lowerUrl.includes("@")) threats.push("Caractere @ dans l'URL — technique de masquage");
  if (/https?:\/\/[^/]*\d{5,}/.test(url)) threats.push("Suite de chiffres dans le domaine — suspect");
  // Check if it looks like it's impersonating a real domain
  const fakePatterns = ["paypal", "google", "apple", "microsoft", "amazon", "netflix", "facebook", "instagram", "whatsapp", "dhl", "laposte", "colissimo", "chronopost", "ameli", "impots", "caf", "cpam"];
  for (const brand of fakePatterns) {
    if (lowerUrl.includes(brand) && !lowerUrl.includes(`${brand}.com`) && !lowerUrl.includes(`${brand}.fr`) && !lowerUrl.includes(`${brand}.net`)) {
      threats.push(`Potentielle usurpation de "${brand}" — le domaine ne correspond pas au site officiel`);
      break;
    }
  }

  return { url, safe: threats.length === 0, threats };
}

// ─── Domain Analysis ─────────────────────────────────────────────────────

function analyzeDomain(email: string): DomainInfo | null {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;

  const parts = domain.split(".");
  const tld = parts[parts.length - 1];
  const subdomainCount = parts.length - 2; // minus domain + tld

  // Detect punycode (internationalized domain)
  const punycode = domain.includes("xn--");

  // Basic structure validation
  const hasValidStructure = parts.length >= 2 && parts.every(p => p.length > 0 && /^[a-z0-9-]+$/.test(p));

  return {
    domain,
    hasValidStructure,
    tld,
    subdomainCount: Math.max(0, subdomainCount),
    domainAge: "inconnu",
    punycode,
  };
}

// ─── MX Record Lookup via dns.google ─────────────────────────────────────

async function lookupMX(domain: string): Promise<MXRecord[]> {
  try {
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.Answer) return [];
    return data.Answer
      .filter((a: any) => a.type === 15) // MX records
      .map((a: any) => {
        const parts = a.data.split(" ");
        return {
          priority: parseInt(parts[0]) || 0,
          exchange: (parts[1] || "").replace(/\.$/, ""),
        };
      })
      .sort((a: MXRecord, b: MXRecord) => a.priority - b.priority);
  } catch {
    return [];
  }
}

// ─── Gemini API (Enhanced Prompt) ────────────────────────────────────────

async function analyzeWithGemini(email: string, content: string): Promise<GeminiAnalysis | null> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return null;

  const domain = email.split("@")[1]?.toLowerCase() || "";

  const prompt = `Tu es un analyste senior en cybersecurite specialise dans la detection avancee de phishing, scam, social engineering et fraude par email. Tu as 15 ans d'experience dans l'analyse forensique d'emails malveillants.

MISSION : Analyse cet email avec une rigueur maximale. Chaque detail compte.

═══════════════════════════════════════════
DONNEES A ANALYSER
═══════════════════════════════════════════

**Adresse expediteur :** ${email}
**Domaine :** ${domain}

**Contenu complet du mail :**
${content || "(aucun contenu fourni — analyse uniquement l'adresse)"}

═══════════════════════════════════════════
CRITERES D'ANALYSE (tous obligatoires)
═══════════════════════════════════════════

1. VALIDITE SYNTAXIQUE : L'adresse respecte-t-elle RFC 5322 ? Caracteres interdits ? Longueur anormale ?

2. ANALYSE DU DOMAINE :
   - Le domaine existe-t-il ? Est-il connu ?
   - Y a-t-il des sous-domaines suspects ?
   - Le TLD est-il associe au spam (.xyz, .tk, .top, .click...) ?
   - Y a-t-il du punycode/IDN (internationalized domain name) ?

3. VERIFICATION MX IMPLICITE :
   - Le domaine semble-t-il capable de recevoir des emails ?
   - Est-ce un domaine d'entreprise, de webmail, ou suspect ?

4. DETECTION DE DOMAINES JETABLES :
   - Est-ce un service d'email temporaire/jetable connu ?
   - Y a-t-il des indicateurs de domaine ephemere ?

5. TYPOSQUATTING & HOMOGLYPHES :
   - Le domaine imite-t-il un service connu (gogle.com, paypa1.com, amaz0n.com) ?
   - Y a-t-il des caracteres Unicode/cyrilliques qui ressemblent a des lettres latines ?
   - Le nom de domaine utilise-t-il des substitutions (0 pour O, 1 pour l, rn pour m) ?

6. ANALYSE DU CONTENU (si fourni) :
   - Tactiques de manipulation : urgence, peur, appat du gain, autorite, rarete
   - Social engineering : usurpation d'identite, pretexting, quid pro quo
   - Demande d'informations sensibles (mots de passe, CB, codes, etc.)
   - Liens suspects dans le texte
   - Coherence linguistique (fautes volontaires, traduction automatique ?)
   - Headers suspects mentionnes
   - Pieces jointes suspectes mentionnees

7. SCORE DE CONFIANCE : De 0 (certainement safe) a 100 (certainement malveillant)

═══════════════════════════════════════════
FORMAT DE REPONSE
═══════════════════════════════════════════

Reponds UNIQUEMENT en JSON valide, sans markdown, sans backticks :

{
  "verdict": "safe" | "suspicious" | "dangerous",
  "confidence": <nombre 0-100>,
  "summary": "<resume de l'analyse en 2-3 phrases percutantes>",
  "details": ["<point d'analyse detaille 1>", "<point 2>", ...],
  "tactics": ["<tactique de manipulation detectee>", ...],
  "domain_analysis": "<analyse complete du domaine : structure, reputation, age estime, coherence>",
  "mx_analysis": "<analyse MX : le domaine peut-il envoyer/recevoir des emails ? Quel fournisseur MX utilise-t-il ?>",
  "header_red_flags": ["<indicateur suspect dans les headers/metadonnees>", ...],
  "social_engineering_score": <nombre 0-100 representant le niveau de manipulation sociale>,
  "recommended_action": "<action recommandee : ignorer / verifier / signaler / supprimer immediatement>"
}

REGLES STRICTES :
- Un email de service client LEGITIME n'utilise JAMAIS : urgence extreme, menaces, liens raccourcis, demandes de credentials.
- Si le domaine ne correspond pas a la marque mentionnee dans le contenu → phishing probable.
- Si le contenu demande TOUTE information sensible → c'est du phishing, POINT FINAL.
- Les vrais services s'adressent par nom/prenom, jamais "Cher client" ou "Cher utilisateur".
- Reponds en francais. Sois precis, factuel, et sans ambiguite.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.05,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      // Check for rate limit
      if (response.status === 429) {
        return { verdict: "suspicious", confidence: 0, summary: "Limite d'API Gemini atteinte. L'analyse IA est temporairement indisponible.", details: ["Rate limit Gemini atteint. Reessayez dans quelques minutes."], tactics: [], domain_analysis: "", mx_analysis: "", header_red_flags: [], social_engineering_score: 0, recommended_action: "Reessayez dans quelques minutes." };
      }
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      verdict: parsed.verdict || "suspicious",
      confidence: parsed.confidence || 50,
      summary: parsed.summary || "",
      details: parsed.details || [],
      tactics: parsed.tactics || [],
      domain_analysis: parsed.domain_analysis || "",
      mx_analysis: parsed.mx_analysis || "",
      header_red_flags: parsed.header_red_flags || [],
      social_engineering_score: parsed.social_engineering_score || 0,
      recommended_action: parsed.recommended_action || "",
    };
  } catch {
    return null;
  }
}

// ─── Main analysis ───────────────────────────────────────────────────────

function analyzeEmail(email: string, content: string, mxRecords: MXRecord[] | null, domainInfo: DomainInfo | null): Omit<EmailAnalysis, "gemini"> {
  const checks: CheckItem[] = [];
  let riskPoints = 0;
  const lowerContent = content.toLowerCase();
  const hasContent = content.trim().length > 0;

  // === URGENCY (priority 0) ===
  if (hasContent) {
    const urgencyMatches = URGENCY_PATTERNS.filter(p => p.test(content));
    if (urgencyMatches.length > 0) {
      checks.push({
        label: "Sentiment d'urgence",
        status: urgencyMatches.length >= 3 ? "fail" : "warn",
        detail: `${urgencyMatches.length} indicateur(s) d'urgence detecte(s). Les emails de phishing creent de la pression pour vous empecher de reflechir.`,
        fix: "Ne cedez JAMAIS a l'urgence d'un email. Les services legitimes vous laissent toujours le temps de reagir. C'est la technique de manipulation #1 des arnaqueurs.",
        priority: 0,
      });
      riskPoints += urgencyMatches.length >= 3 ? 25 : 12;
    } else {
      checks.push({ label: "Sentiment d'urgence", status: "pass", detail: "Pas de pression temporelle detectee.", priority: 0 });
    }
  }

  // === PERSONAL INFO REQUEST (priority 1) ===
  if (hasContent) {
    const infoMatches = PERSONAL_INFO_PATTERNS.filter(p => p.test(content));
    if (infoMatches.length > 0) {
      checks.push({
        label: "Demande d'informations sensibles",
        status: "fail",
        detail: `Le message demande des informations sensibles (${infoMatches.length} type(s) detecte(s) : mot de passe, coordonnees bancaires, code, etc.).`,
        fix: "JAMAIS un service legitime ne vous demandera votre mot de passe, vos coordonnees bancaires ou un code par email. C'est du phishing a 100%.",
        priority: 1,
      });
      riskPoints += 35;
    }
  }

  // === PHISHING KEYWORDS (priority 2) ===
  if (hasContent) {
    const foundKeywords = PHISHING_KEYWORDS.filter(kw => lowerContent.includes(kw));
    const uniqueKeywords = [...new Set(foundKeywords)];
    if (uniqueKeywords.length > 0) {
      checks.push({
        label: "Mots-cles suspects",
        status: uniqueKeywords.length >= 4 ? "fail" : "warn",
        detail: `${uniqueKeywords.length} mots-cles suspects : "${uniqueKeywords.slice(0, 5).join('", "')}".${uniqueKeywords.length > 5 ? ` Et ${uniqueKeywords.length - 5} autres.` : ""}`,
        fix: "Les emails de phishing utilisent des termes alarmistes et des formulations generiques. Un service reel s'adresse a vous par votre nom et n'utilise pas de menaces.",
        priority: 2,
      });
      riskPoints += uniqueKeywords.length >= 4 ? 25 : uniqueKeywords.length >= 2 ? 15 : 8;
    } else {
      checks.push({ label: "Mots-cles suspects", status: "pass", detail: "Aucun mot-cle de phishing detecte.", priority: 2 });
    }
  }

  // === LINK ANALYSIS (priority 3) ===
  let detectedLinks: LinkScanResult[] = [];
  if (hasContent) {
    const urls = extractUrls(content);
    if (urls.length > 0) {
      detectedLinks = urls.map(u => scanLink(u));
      const dangerousLinks = detectedLinks.filter(l => !l.safe);
      checks.push({
        label: "Liens detectes — analyse heuristique",
        status: dangerousLinks.length > 0 ? "fail" : urls.length > 5 ? "warn" : "pass",
        detail: `${urls.length} lien(s) detecte(s). ${dangerousLinks.length > 0 ? `${dangerousLinks.length} lien(s) signale(s) comme suspects.` : "Aucun indicateur de danger detecte."}`,
        fix: dangerousLinks.length > 0 ? "NE CLIQUEZ PAS sur les liens signales. Survolez pour verifier l'URL reelle. Allez directement sur le site officiel en tapant l'adresse." : undefined,
        priority: 3,
      });
      if (dangerousLinks.length > 0) riskPoints += 25;
      else if (urls.length > 5) riskPoints += 5;
    }
  }

  // === FORMAT CHECK (priority 5) ===
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  const isValidFormat = emailRegex.test(email);
  checks.push({
    label: "Format de l'email (RFC 5322)",
    status: isValidFormat ? "pass" : "fail",
    detail: isValidFormat ? "Le format de l'adresse email est valide (conforme RFC 5322)." : "Le format de l'adresse email est invalide. Ne respecte pas RFC 5322.",
    fix: isValidFormat ? undefined : "Verifiez que l'adresse contient un @ suivi d'un domaine valide avec un TLD.",
    priority: 5,
  });
  if (!isValidFormat) riskPoints += 30;

  const domain = email.split("@")[1]?.toLowerCase() || "";

  // === DOMAIN STRUCTURE (priority 4) ===
  if (domainInfo) {
    if (!domainInfo.hasValidStructure) {
      checks.push({
        label: "Structure du domaine",
        status: "fail",
        detail: `Le domaine "${domainInfo.domain}" a une structure invalide.`,
        fix: "Un domaine valide contient uniquement des lettres, chiffres et tirets, separes par des points.",
        priority: 4,
      });
      riskPoints += 20;
    } else if (domainInfo.subdomainCount > 2) {
      checks.push({
        label: "Structure du domaine",
        status: "warn",
        detail: `Le domaine "${domainInfo.domain}" contient ${domainInfo.subdomainCount} sous-domaines. Les domaines de phishing utilisent souvent des sous-domaines multiples pour paraître legitimes.`,
        fix: "Un nombre excessif de sous-domaines est suspect. Verifiez le domaine principal.",
        priority: 4,
      });
      riskPoints += 10;
    } else {
      checks.push({ label: "Structure du domaine", status: "pass", detail: `Structure du domaine "${domainInfo.domain}" valide. TLD: .${domainInfo.tld}`, priority: 4 });
    }

    // Punycode detection
    if (domainInfo.punycode) {
      checks.push({
        label: "Domaine internationalisé (punycode)",
        status: "fail",
        detail: `Le domaine utilise un encodage punycode (xn--...). C'est une technique classique d'attaque par homoglyphe pour imiter des domaines legitimes.`,
        fix: "Les domaines en punycode peuvent afficher des caracteres Unicode qui ressemblent a des lettres latines. Verifiez tres attentivement le domaine.",
        priority: 3,
      });
      riskPoints += 30;
    }
  }

  // === MX RECORDS (priority 5) ===
  if (mxRecords !== null) {
    if (mxRecords.length === 0) {
      checks.push({
        label: "Enregistrements MX",
        status: "fail",
        detail: `Aucun enregistrement MX trouve pour "${domain}". Ce domaine ne peut pas recevoir d'emails — il est tres probablement faux ou inactif.`,
        fix: "Un domaine sans enregistrement MX ne peut ni envoyer ni recevoir d'emails. L'adresse est tres probablement frauduleuse.",
        priority: 5,
      });
      riskPoints += 25;
    } else {
      const mxDomains = mxRecords.map(r => r.exchange.toLowerCase());
      const knownProviders = ["google", "outlook", "protonmail", "ovh", "gandi", "zoho", "fastmail", "icloud", "yahoo", "orange", "free.fr", "sfr"];
      const matchedProvider = knownProviders.find(p => mxDomains.some(d => d.includes(p)));
      checks.push({
        label: "Enregistrements MX",
        status: "pass",
        detail: `${mxRecords.length} serveur(s) MX trouve(s) pour "${domain}". ${matchedProvider ? `Fournisseur detecte : ${matchedProvider}.` : `MX primaire : ${mxRecords[0].exchange}`}`,
        priority: 5,
      });
    }
  }

  // === DISPOSABLE CHECK (priority 4) ===
  const isDisposable = DISPOSABLE_DOMAINS.has(domain);
  checks.push({
    label: "Email jetable",
    status: isDisposable ? "fail" : "pass",
    detail: isDisposable ? `"${domain}" est un service d'email jetable/temporaire. Ces adresses sont creees pour un usage unique et sont tres utilisees dans les arnaques.` : "Ce n'est pas un domaine d'email jetable connu.",
    fix: isDisposable ? "N'interagissez JAMAIS avec des emails provenant de services jetables. Ils sont utilises pour masquer l'identite de l'expediteur." : undefined,
    priority: 4,
  });
  if (isDisposable) riskPoints += 30;

  // === REPUTABLE (priority 6) ===
  const isReputable = REPUTABLE_PROVIDERS.has(domain);
  checks.push({
    label: "Fournisseur reconnu",
    status: isReputable ? "pass" : "warn",
    detail: isReputable ? `"${domain}" est un fournisseur d'email reconnu et fiable.` : `"${domain}" n'est pas un fournisseur grand public. Soyez vigilant.`,
    fix: isReputable ? undefined : "Verifiez l'identite de l'expediteur par un autre canal avant de faire confiance.",
    priority: 6,
  });
  if (!isReputable && !isDisposable) riskPoints += 10;

  // === TLD CHECK (priority 7) ===
  const suspiciousTLDs = [".xyz", ".top", ".click", ".loan", ".work", ".gq", ".ml", ".tk", ".cf", ".ga", ".buzz", ".pw", ".info"];
  const hasSuspiciousTLD = suspiciousTLDs.some(tld => domain.endsWith(tld));
  checks.push({
    label: "Extension de domaine (TLD)",
    status: hasSuspiciousTLD ? "warn" : "pass",
    detail: hasSuspiciousTLD ? "Extension souvent associee au spam/phishing." : "Extension de domaine standard.",
    fix: hasSuspiciousTLD ? "Les domaines en .xyz, .tk, .ml etc. sont gratuits et abuses par les spammeurs." : undefined,
    priority: 7,
  });
  if (hasSuspiciousTLD) riskPoints += 15;

  // === TYPOSQUATTING (priority 3) ===
  const typosquatDomains = ["gmali.com", "gmai.com", "gogle.com", "yahooo.com", "outloock.com", "hotmai.com", "gmial.com", "gomail.com", "protonmial.com", "outlok.com", "yaho.com", "googlé.com", "microsft.com", "aple.com", "amazn.com", "g00gle.com", "paypa1.com", "amaz0n.com", "micr0soft.com", "0utlook.com", "gma1l.com"];
  const isTyposquat = typosquatDomains.includes(domain);
  if (isTyposquat) {
    checks.push({
      label: "Typosquatting",
      status: "fail",
      detail: "Ce domaine imite un domaine legitime avec une faute de frappe. Technique de phishing classique !",
      fix: "C'est du PHISHING ! Le domaine imite un service connu. Ne cliquez sur aucun lien. Signalez et supprimez.",
      priority: 3,
    });
    riskPoints += 35;
  }

  // === HOMOGLYPH DETECTION IN DOMAIN (priority 3) ===
  const domainHomoglyphs = detectHomoglyphs(domain);
  if (domainHomoglyphs.length > 0) {
    checks.push({
      label: "Homoglyphes dans le domaine",
      status: "fail",
      detail: `${domainHomoglyphs.length} caractere(s) homoglyphe(s) detecte(s) dans le domaine. Ces caracteres ressemblent a des lettres latines mais proviennent d'un autre alphabet (cyrillique, etc.). Technique avancee d'usurpation.`,
      fix: "PHISHING AVANCE ! Le domaine utilise des caracteres Unicode qui imitent des lettres latines. L'adresse semble identique mais est en realite completement differente.",
      priority: 3,
    });
    riskPoints += 40;
  }

  // === SPELLING ERRORS (priority 5) ===
  let spellingErrors: SpellingError[] = [];
  if (hasContent) {
    spellingErrors = detectSpellingErrors(content);
    if (spellingErrors.length > 0) {
      checks.push({
        label: "Fautes d'orthographe",
        status: spellingErrors.length > 2 ? "fail" : "warn",
        detail: `${spellingErrors.length} faute(s) detectee(s). Les emails de phishing contiennent souvent des erreurs volontaires pour contourner les filtres anti-spam.`,
        fix: "Les entreprises legitimes envoient des emails relus et corriges. De nombreuses fautes = signal d'alerte majeur.",
        priority: 5,
      });
      riskPoints += spellingErrors.length > 2 ? 20 : 8;
    } else if (content.trim().length > 20) {
      checks.push({ label: "Fautes d'orthographe", status: "pass", detail: "Aucune faute suspecte detectee.", priority: 5 });
    }
  }

  // === GENERIC GREETING (priority 4) ===
  if (hasContent) {
    const genericGreeting = /cher\s*(client|utilisateur|membre|monsieur|madame)|bonjour\s*,\s*$/im.test(content);
    if (genericGreeting) {
      checks.push({
        label: "Formule generique",
        status: "warn",
        detail: "L'email utilise une formule d'adresse generique au lieu de votre nom. Les vrais services connaissent votre identite.",
        fix: "Un service chez lequel vous avez un compte s'adressera toujours a vous par votre nom et prenom.",
        priority: 4,
      });
      riskPoints += 8;
    }
  }

  // === IMPERSONATION (priority 2) ===
  if (hasContent) {
    const brands = ["paypal", "google", "apple", "microsoft", "amazon", "netflix", "facebook", "instagram", "la poste", "colissimo", "chronopost", "ameli", "impots", "caf", "edf", "engie", "free", "orange", "sfr", "bouygues"];
    const mentionedBrands = brands.filter(b => lowerContent.includes(b));
    if (mentionedBrands.length > 0) {
      const brandInDomain = mentionedBrands.some(b => domain.includes(b));
      if (!brandInDomain && !isReputable) {
        checks.push({
          label: "Usurpation d'identite possible",
          status: "fail",
          detail: `Le mail mentionne "${mentionedBrands.join('", "')}" mais l'expediteur ("${domain}") n'est pas le domaine officiel de ces services.`,
          fix: `Un email officiel de ${mentionedBrands[0]} viendrait d'un domaine @${mentionedBrands[0]}.com/.fr. Allez sur le site officiel directement.`,
          priority: 2,
        });
        riskPoints += 25;
      }
    }
  }

  // === HOMOGLYPH IN CONTENT (priority 5) ===
  if (hasContent) {
    const contentHomoglyphs = detectHomoglyphs(content);
    if (contentHomoglyphs.length > 0 && contentHomoglyphs.length < 30) {
      checks.push({
        label: "Homoglyphes dans le contenu",
        status: "warn",
        detail: `${contentHomoglyphs.length} caractere(s) homoglyphe(s) detecte(s) dans le corps du message. Technique utilisee pour contourner les filtres anti-phishing.`,
        fix: "Le contenu utilise des caracteres qui ressemblent a des lettres latines mais proviennent d'un autre alphabet. C'est suspect.",
        priority: 5,
      });
      riskPoints += 10;
    }
  }

  // Sort checks
  checks.sort((a, b) => {
    const statusOrder = { fail: 0, warn: 1, pass: 2 };
    const sa = statusOrder[a.status];
    const sb = statusOrder[b.status];
    if (sa !== sb) return sa - sb;
    return a.priority - b.priority;
  });

  const riskScore = Math.min(100, riskPoints);
  let riskLabel = "Faible risque";
  if (riskScore >= 60) riskLabel = "Risque eleve";
  else if (riskScore >= 30) riskLabel = "Risque moyen";

  return { email, isValid: isValidFormat, checks, riskScore, riskLabel, detectedLinks, spellingErrors, domainInfo, mxRecords };
}

// ─── Component ───────────────────────────────────────────────────────────

export function EmailChecker() {
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [result, setResult] = useState<EmailAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  const [showSpelling, setShowSpelling] = useState(false);
  const [showMx, setShowMx] = useState(false);
  const [showDomain, setShowDomain] = useState(false);

  const hasGeminiKey = !!import.meta.env.VITE_GEMINI_API_KEY;

  const handleAnalyze = async () => {
    if (!email) return;

    // Rate limit check
    const quota = getGenericQuota(EMAIL_RATE_CONFIG);
    if (!quota.canRequest) {
      return; // QuotaDisplay will show the reason
    }

    if (!recordGenericRequest(EMAIL_RATE_CONFIG)) {
      return;
    }

    setAnalyzing(true);
    setResult(null);
    setShowLinks(false);
    setShowSpelling(false);
    setShowMx(false);
    setShowDomain(false);

    // Domain info (instant)
    const domainInfo = analyzeDomain(email);

    // MX lookup (async but fast)
    const domain = email.split("@")[1]?.toLowerCase() || "";
    let mxRecords: MXRecord[] | null = null;
    if (domain) {
      try {
        mxRecords = await lookupMX(domain);
      } catch {
        mxRecords = [];
      }
    }

    // Local analysis
    const localResult = analyzeEmail(email, content, mxRecords, domainInfo);
    setResult({ ...localResult, gemini: null });
    setAnalyzing(false);

    // Gemini analysis (async)
    if (hasGeminiKey && (content.trim() || email)) {
      setGeminiLoading(true);
      try {
        const gemini = await analyzeWithGemini(email, content);
        setResult(prev => prev ? { ...prev, gemini } : null);
        if (gemini) {
          setResult(prev => {
            if (!prev) return null;
            let bonus = 0;
            if (gemini.verdict === "dangerous") bonus = 25;
            else if (gemini.verdict === "suspicious") bonus = 10;
            const newScore = Math.min(100, prev.riskScore + bonus);
            let newLabel = "Faible risque";
            if (newScore >= 60) newLabel = "Risque eleve";
            else if (newScore >= 30) newLabel = "Risque moyen";
            return { ...prev, riskScore: newScore, riskLabel: newLabel };
          });
        }
      } catch { /* ignore */ }
      finally { setGeminiLoading(false); }
    }
  };

  const getRiskColor = (score: number) => {
    if (score < 30) return "#39ff14";
    if (score < 60) return "#f59e0b";
    return "#ef4444";
  };

  const getVerdictStyle = (verdict: string) => {
    switch (verdict) {
      case "dangerous": return { color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", icon: AlertOctagon };
      case "suspicious": return { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)", icon: AlertTriangle };
      default: return { color: "#39ff14", bg: "rgba(57,255,20,0.08)", border: "rgba(57,255,20,0.2)", icon: CheckCircle };
    }
  };

  const verdictLabel = (v: string) => {
    switch (v) {
      case "dangerous": return "DANGEREUX";
      case "suspicious": return "SUSPECT";
      default: return "PROBABLEMENT SUR";
    }
  };

  const quotaInfo = getGenericQuota(EMAIL_RATE_CONFIG);

  return (
    <div className="min-h-screen py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6" style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.12)" }}>
            <Mail className="w-3.5 h-3.5 text-[#06b6d4]" />
            <span className="text-[#06b6d4]" style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace" }}>
              Heuristique + MX + DNS + Homoglyphes{hasGeminiKey ? " + Gemini AI" : ""}
            </span>
          </div>
          <h1 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.8rem, 3vw, 2.2rem)" }} className="text-[#e2e8f0] mb-4">
            Verificateur d'{" "}
            <span style={{ background: "linear-gradient(135deg, #06b6d4, #00d4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Email</span>
          </h1>
          <p className="text-[#94a3b8] max-w-xl mx-auto" style={{ lineHeight: 1.7 }}>
            Analyse complete : validite syntaxique, structure du domaine, verification MX reelle via dns.google,
            detection de domaines jetables, typosquatting, homoglyphes{hasGeminiKey ? " et analyse avancee par Gemini AI" : ""}.
          </p>
        </motion.div>

        {/* Rate Limit Quota */}
        <div className="mb-6">
          <GenericQuotaDisplay
            config={EMAIL_RATE_CONFIG}
            title="Quota Email Checker"
            accentColor="#06b6d4"
          />
        </div>

        {/* Input */}
        <div className="bg-[#111827] border border-[#06b6d4]/20 rounded-xl p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[#94a3b8] mb-1.5" style={{ fontSize: "0.85rem" }}>Adresse email de l'expediteur</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748b]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                  placeholder="suspect@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-[#0a0a0f] border border-[#06b6d4]/20 rounded-lg text-[#e2e8f0] placeholder-[#64748b] focus:outline-none focus:border-[#06b6d4]/60"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#94a3b8] mb-1.5" style={{ fontSize: "0.85rem" }}>
                Contenu complet du mail <span className="text-[#06b6d4]">(recommande)</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Collez ici l'INTEGRALITE du mail suspect (objet + corps + liens). Plus le contenu est complet, plus l'analyse sera precise..."
                rows={6}
                className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#06b6d4]/20 rounded-lg text-[#e2e8f0] placeholder-[#64748b] focus:outline-none focus:border-[#06b6d4]/60 resize-none"
                style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.85rem" }}
              />
              <p className="text-[#64748b] mt-1" style={{ fontSize: "0.75rem" }}>
                Analyse heuristique + MX reel + homoglyphes + typosquatting.{hasGeminiKey ? " Analyse IA Gemini incluse." : ""}
              </p>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={analyzing || !email || !quotaInfo.canRequest}
              className="w-full py-3 bg-[#06b6d4] text-[#0a0a0f] rounded-lg hover:bg-[#0891b2] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem" }}
            >
              {analyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              {analyzing ? "Analyse en cours..." : !quotaInfo.canRequest ? "Limite atteinte" : "Analyser l'email"}
            </button>
          </div>
        </div>

        {/* Results */}
        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Risk score */}
            <div className="bg-[#111827] border border-[#06b6d4]/20 rounded-xl p-6 text-center">
              <p className="text-[#94a3b8] mb-2" style={{ fontSize: "0.85rem" }}>Score de risque</p>
              <div className="mb-2" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "3.5rem", color: getRiskColor(result.riskScore) }}>
                {result.riskScore}%
              </div>
              <span
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full"
                style={{ fontSize: "0.85rem", color: getRiskColor(result.riskScore), backgroundColor: `${getRiskColor(result.riskScore)}15` }}
              >
                {result.riskScore < 30 ? <CheckCircle className="w-4 h-4" /> : result.riskScore < 60 ? <AlertTriangle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {result.riskLabel}
              </span>
              <div className="flex items-center justify-center gap-4 mt-3">
                {(() => {
                  const fails = result.checks.filter(c => c.status === "fail").length;
                  const warns = result.checks.filter(c => c.status === "warn").length;
                  const passes = result.checks.filter(c => c.status === "pass").length;
                  return (
                    <>
                      {fails > 0 && <span className="text-[#ef4444] flex items-center gap-1" style={{ fontSize: "0.75rem" }}><XCircle className="w-3 h-3" />{fails} critique(s)</span>}
                      {warns > 0 && <span className="text-[#f59e0b] flex items-center gap-1" style={{ fontSize: "0.75rem" }}><AlertTriangle className="w-3 h-3" />{warns} alerte(s)</span>}
                      {passes > 0 && <span className="text-[#39ff14] flex items-center gap-1" style={{ fontSize: "0.75rem" }}><CheckCircle className="w-3 h-3" />{passes} OK</span>}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* ═══ DOMAIN INFO ═══ */}
            {result.domainInfo && (
              <div className="bg-[#111827] border border-[#06b6d4]/20 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowDomain(!showDomain)}
                  className="w-full p-4 flex items-center justify-between hover:bg-[#1e293b]/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-[#06b6d4]" />
                    <span className="text-[#e2e8f0]" style={{ fontSize: "0.9rem" }}>
                      Analyse du domaine : {result.domainInfo.domain}
                    </span>
                    {result.domainInfo.punycode && (
                      <span className="px-2 py-0.5 rounded-full bg-[#ef4444]/10 text-[#ef4444]" style={{ fontSize: "0.65rem" }}>
                        Punycode
                      </span>
                    )}
                  </div>
                  {showDomain ? <ChevronUp className="w-4 h-4 text-[#64748b]" /> : <ChevronDown className="w-4 h-4 text-[#64748b]" />}
                </button>
                <AnimatePresence>
                  {showDomain && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="p-4 pt-0 grid grid-cols-2 gap-3">
                        {[
                          { label: "Domaine", value: result.domainInfo.domain, icon: Globe },
                          { label: "TLD", value: `.${result.domainInfo.tld}`, icon: AtSign },
                          { label: "Sous-domaines", value: `${result.domainInfo.subdomainCount}`, icon: Server },
                          { label: "Structure valide", value: result.domainInfo.hasValidStructure ? "Oui" : "Non", icon: CheckCircle },
                          { label: "Punycode/IDN", value: result.domainInfo.punycode ? "Oui (suspect)" : "Non", icon: Fingerprint },
                        ].map((item) => (
                          <div key={item.label} className="bg-[#0a0a0f] rounded-lg p-3">
                            <div className="flex items-center gap-1.5 mb-1">
                              <item.icon className="w-3 h-3 text-[#06b6d4]" />
                              <span className="text-[#64748b]" style={{ fontSize: "0.7rem" }}>{item.label}</span>
                            </div>
                            <span className="text-[#e2e8f0] font-mono" style={{ fontSize: "0.82rem" }}>{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ═══ MX RECORDS ═══ */}
            {result.mxRecords && result.mxRecords.length > 0 && (
              <div className="bg-[#111827] border border-[#39ff14]/20 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowMx(!showMx)}
                  className="w-full p-4 flex items-center justify-between hover:bg-[#1e293b]/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Server className="w-5 h-5 text-[#39ff14]" />
                    <span className="text-[#e2e8f0]" style={{ fontSize: "0.9rem" }}>
                      Enregistrements MX ({result.mxRecords.length})
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#39ff14]/10 text-[#39ff14]" style={{ fontSize: "0.65rem" }}>
                      dns.google
                    </span>
                  </div>
                  {showMx ? <ChevronUp className="w-4 h-4 text-[#64748b]" /> : <ChevronDown className="w-4 h-4 text-[#64748b]" />}
                </button>
                <AnimatePresence>
                  {showMx && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="p-4 pt-0 space-y-2">
                        {result.mxRecords.map((mx, i) => (
                          <div key={i} className="bg-[#0a0a0f] rounded-lg p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[#39ff14] font-mono" style={{ fontSize: "0.72rem", minWidth: "24px" }}>
                                {mx.priority}
                              </span>
                              <span className="text-[#e2e8f0] font-mono" style={{ fontSize: "0.82rem" }}>
                                {mx.exchange}
                              </span>
                            </div>
                            <span className="text-[#64748b]" style={{ fontSize: "0.68rem" }}>priorite</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ═══ GEMINI AI ANALYSIS ═══ */}
            {(geminiLoading || result.gemini) && (
              <div
                className="bg-[#111827] rounded-xl overflow-hidden"
                style={{
                  border: `1px solid ${result.gemini ? getVerdictStyle(result.gemini.verdict).border : "rgba(139,92,246,0.2)"}`,
                }}
              >
                <div className="p-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)" }}>
                    <Brain className="w-4 h-4 text-[#8b5cf6]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[#e2e8f0]" style={{ fontSize: "0.9rem", fontFamily: "Orbitron, sans-serif" }}>Analyse IA — Gemini 2.0 Flash</p>
                    <p className="text-[#64748b]" style={{ fontSize: "0.7rem" }}>Analyse forensique avancee par intelligence artificielle</p>
                  </div>
                  {result.gemini && (
                    <span
                      className="px-3 py-1 rounded-full flex items-center gap-1.5"
                      style={{
                        fontSize: "0.75rem",
                        fontFamily: "Orbitron, sans-serif",
                        color: getVerdictStyle(result.gemini.verdict).color,
                        background: getVerdictStyle(result.gemini.verdict).bg,
                      }}
                    >
                      {(() => { const S = getVerdictStyle(result.gemini!.verdict); return <S.icon className="w-3.5 h-3.5" />; })()}
                      {verdictLabel(result.gemini.verdict)}
                      <span className="opacity-60">({result.gemini.confidence}%)</span>
                    </span>
                  )}
                </div>

                {geminiLoading && !result.gemini && (
                  <div className="p-6 flex items-center justify-center gap-3">
                    <Loader2 className="w-5 h-5 text-[#8b5cf6] animate-spin" />
                    <span className="text-[#94a3b8]" style={{ fontSize: "0.85rem" }}>Analyse IA en cours...</span>
                  </div>
                )}

                {result.gemini && (
                  <div className="p-4 space-y-4">
                    {/* Summary */}
                    <p className="text-[#e2e8f0]" style={{ fontSize: "0.85rem", lineHeight: 1.7 }}>{result.gemini.summary}</p>

                    {/* Social Engineering Score */}
                    {result.gemini.social_engineering_score > 0 && (
                      <div className="bg-[#0a0a0f] rounded-lg p-3" style={{ border: "1px solid rgba(245,158,11,0.1)" }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[#f59e0b]" style={{ fontSize: "0.75rem", fontFamily: "Orbitron, sans-serif" }}>Score de manipulation sociale</span>
                          <span className="text-[#f59e0b] font-mono" style={{ fontSize: "0.85rem" }}>{result.gemini.social_engineering_score}/100</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                          <div className="h-full rounded-full" style={{
                            width: `${result.gemini.social_engineering_score}%`,
                            background: result.gemini.social_engineering_score > 60 ? "#ef4444" : result.gemini.social_engineering_score > 30 ? "#f59e0b" : "#39ff14",
                          }} />
                        </div>
                      </div>
                    )}

                    {/* Domain Analysis from Gemini */}
                    {result.gemini.domain_analysis && (
                      <div className="bg-[#0a0a0f] rounded-lg p-3" style={{ border: "1px solid rgba(6,182,212,0.1)" }}>
                        <p className="text-[#06b6d4] mb-1" style={{ fontSize: "0.75rem", fontFamily: "Orbitron, sans-serif" }}>Analyse du domaine (IA)</p>
                        <p className="text-[#94a3b8]" style={{ fontSize: "0.8rem", lineHeight: 1.6 }}>{result.gemini.domain_analysis}</p>
                      </div>
                    )}

                    {/* MX Analysis from Gemini */}
                    {result.gemini.mx_analysis && (
                      <div className="bg-[#0a0a0f] rounded-lg p-3" style={{ border: "1px solid rgba(57,255,20,0.1)" }}>
                        <p className="text-[#39ff14] mb-1" style={{ fontSize: "0.75rem", fontFamily: "Orbitron, sans-serif" }}>Analyse MX (IA)</p>
                        <p className="text-[#94a3b8]" style={{ fontSize: "0.8rem", lineHeight: 1.6 }}>{result.gemini.mx_analysis}</p>
                      </div>
                    )}

                    {/* Details */}
                    {result.gemini.details.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[#94a3b8]" style={{ fontSize: "0.75rem", fontFamily: "Orbitron, sans-serif" }}>Points d'analyse</p>
                        {result.gemini.details.map((d, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <Sparkles className="w-3 h-3 text-[#8b5cf6] flex-shrink-0 mt-1" />
                            <p className="text-[#94a3b8]" style={{ fontSize: "0.8rem" }}>{d}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tactics */}
                    {result.gemini.tactics.length > 0 && (
                      <div className="bg-[#0a0a0f] rounded-lg p-3" style={{ border: "1px solid rgba(239,68,68,0.1)" }}>
                        <p className="text-[#ef4444] mb-2" style={{ fontSize: "0.75rem", fontFamily: "Orbitron, sans-serif" }}>Tactiques de manipulation detectees</p>
                        <div className="flex flex-wrap gap-2">
                          {result.gemini.tactics.map((t, i) => (
                            <span key={i} className="px-2 py-1 rounded-full bg-[#ef4444]/10 text-[#ef4444]" style={{ fontSize: "0.72rem" }}>{t}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Header Red Flags */}
                    {result.gemini.header_red_flags.length > 0 && (
                      <div className="bg-[#0a0a0f] rounded-lg p-3" style={{ border: "1px solid rgba(245,158,11,0.1)" }}>
                        <p className="text-[#f59e0b] mb-2" style={{ fontSize: "0.75rem", fontFamily: "Orbitron, sans-serif" }}>Indicateurs suspects (headers/metadonnees)</p>
                        <div className="space-y-1">
                          {result.gemini.header_red_flags.map((f, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <Eye className="w-3 h-3 text-[#f59e0b] flex-shrink-0 mt-0.5" />
                              <p className="text-[#94a3b8]" style={{ fontSize: "0.78rem" }}>{f}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommended Action */}
                    {result.gemini.recommended_action && (
                      <div className="bg-[#0a0a0f] rounded-lg p-3 border-l-2" style={{ borderColor: getVerdictStyle(result.gemini.verdict).color }}>
                        <p className="text-[#e2e8f0]" style={{ fontSize: "0.8rem" }}>
                          <span style={{ color: getVerdictStyle(result.gemini.verdict).color }}>Action recommandee : </span>
                          {result.gemini.recommended_action}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Checks list */}
            <div className="space-y-3">
              {result.checks.map((check, i) => (
                <motion.div
                  key={`${check.label}-${i}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-[#111827] border border-[#00d4ff]/10 rounded-xl p-4"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: check.status === "pass" ? "rgba(57,255,20,0.1)" : check.status === "warn" ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
                      }}
                    >
                      {check.status === "pass" ? (
                        <CheckCircle className="w-4 h-4 text-[#39ff14]" />
                      ) : check.status === "warn" ? (
                        <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />
                      ) : (
                        <XCircle className="w-4 h-4 text-[#ef4444]" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-[#e2e8f0]" style={{ fontSize: "0.9rem" }}>{check.label}</p>
                      <p className="text-[#94a3b8]" style={{ fontSize: "0.8rem" }}>{check.detail}</p>
                      {check.fix && (
                        <div className="mt-2 bg-[#0a0a0f] rounded-lg p-3 border-l-2" style={{ borderColor: check.status === "fail" ? "#ef4444" : "#f59e0b" }}>
                          <p className="text-[#e2e8f0]" style={{ fontSize: "0.8rem" }}>
                            <span style={{ color: check.status === "fail" ? "#ef4444" : "#f59e0b" }}>Comment reagir : </span>
                            {check.fix}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Detected Links */}
            {result.detectedLinks.length > 0 && (
              <div className="bg-[#111827] border border-[#8b5cf6]/20 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowLinks(!showLinks)}
                  className="w-full p-4 flex items-center justify-between hover:bg-[#1e293b]/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Link2 className="w-5 h-5 text-[#8b5cf6]" />
                    <span className="text-[#e2e8f0]" style={{ fontSize: "0.9rem" }}>
                      Liens detectes ({result.detectedLinks.length})
                    </span>
                    {result.detectedLinks.some(l => !l.safe) && (
                      <span className="px-2 py-0.5 rounded-full bg-[#ef4444]/10 text-[#ef4444]" style={{ fontSize: "0.65rem" }}>
                        {result.detectedLinks.filter(l => !l.safe).length} dangereux
                      </span>
                    )}
                  </div>
                  {showLinks ? <ChevronUp className="w-4 h-4 text-[#64748b]" /> : <ChevronDown className="w-4 h-4 text-[#64748b]" />}
                </button>
                <AnimatePresence>
                  {showLinks && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="p-4 pt-0 space-y-3">
                        {result.detectedLinks.map((link, i) => (
                          <div key={i} className="bg-[#0a0a0f] rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${link.safe ? "bg-[#39ff14]/10" : "bg-[#ef4444]/10"}`}>
                                {link.safe ? <CheckCircle className="w-4 h-4 text-[#39ff14]" /> : <XCircle className="w-4 h-4 text-[#ef4444]" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[#00d4ff] font-mono break-all" style={{ fontSize: "0.8rem" }}>{link.url}</p>
                                <span className="inline-block mt-1 px-2 py-0.5 rounded-full" style={{ fontSize: "0.7rem", color: link.safe ? "#39ff14" : "#ef4444", background: link.safe ? "rgba(57,255,20,0.1)" : "rgba(239,68,68,0.1)" }}>
                                  {link.safe ? "Aucun indicateur suspect" : "Suspect"}
                                </span>
                                {link.threats.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {link.threats.map((t, j) => (
                                      <p key={j} className="text-[#ef4444] flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
                                        <Bug className="w-3 h-3 flex-shrink-0" /> {t}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Spelling Errors */}
            {result.spellingErrors.length > 0 && (
              <div className="bg-[#111827] border border-[#f59e0b]/20 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowSpelling(!showSpelling)}
                  className="w-full p-4 flex items-center justify-between hover:bg-[#1e293b]/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <SpellCheck className="w-5 h-5 text-[#f59e0b]" />
                    <span className="text-[#e2e8f0]" style={{ fontSize: "0.9rem" }}>
                      Fautes d'orthographe ({result.spellingErrors.length})
                    </span>
                  </div>
                  {showSpelling ? <ChevronUp className="w-4 h-4 text-[#64748b]" /> : <ChevronDown className="w-4 h-4 text-[#64748b]" />}
                </button>
                <AnimatePresence>
                  {showSpelling && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="p-4 pt-0 space-y-3">
                        {result.spellingErrors.map((err, i) => (
                          <div key={i} className="bg-[#0a0a0f] rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[#ef4444] line-through font-mono" style={{ fontSize: "0.85rem" }}>{err.word}</span>
                              <span className="text-[#64748b]">&rarr;</span>
                              <span className="text-[#39ff14] font-mono" style={{ fontSize: "0.85rem" }}>{err.suggestion}</span>
                            </div>
                            <p className="text-[#64748b]" style={{ fontSize: "0.75rem" }}>{err.context}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Actions */}
            {result.riskScore >= 30 && (
              <div className="bg-gradient-to-br from-[#111827] to-[#0f172a] border border-[#ef4444]/20 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-[#ef4444]" />
                  <h3 className="text-[#ef4444]" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.95rem" }}>Actions recommandees</h3>
                </div>
                <ul className="space-y-2">
                  {[
                    "Ne cliquez sur AUCUN lien present dans l'email",
                    "Ne telechargez aucune piece jointe",
                    "Ne repondez pas et ne fournissez aucune information personnelle",
                    "Signalez l'email comme spam/phishing dans votre messagerie",
                    "Si vous avez deja clique, changez immediatement vos mots de passe",
                    "Contactez le service concerne via son site OFFICIEL (pas via l'email)",
                  ].map((action, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#ef4444] mt-1" style={{ fontSize: "0.8rem" }}>●</span>
                      <span className="text-[#94a3b8]" style={{ fontSize: "0.85rem" }}>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
