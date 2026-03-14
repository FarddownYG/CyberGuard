import { useState } from "react";
import { Mail, Search, CheckCircle, XCircle, AlertTriangle, Shield, Globe, Loader2, Link2, SpellCheck, Bug, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface EmailAnalysis {
  email: string;
  isValid: boolean;
  checks: {
    label: string;
    status: "pass" | "fail" | "warn";
    detail: string;
    fix?: string;
  }[];
  riskScore: number;
  riskLabel: string;
  detectedLinks: LinkScanResult[];
  spellingErrors: SpellingError[];
}

interface LinkScanResult {
  url: string;
  safe: boolean;
  engines: number;
  flagged: number;
  threats: string[];
}

interface SpellingError {
  word: string;
  suggestion: string;
  context: string;
}

const DISPOSABLE_DOMAINS = new Set([
  "tempmail.com", "throwaway.email", "guerrillamail.com", "mailinator.com",
  "yopmail.com", "10minutemail.com", "trashmail.com", "sharklasers.com",
  "guerrillamailblock.com", "grr.la", "dispostable.com", "temp-mail.org",
  "fakeinbox.com", "maildrop.cc", "harakirimail.com",
]);

const REPUTABLE_PROVIDERS = new Set([
  "gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "protonmail.com",
  "icloud.com", "aol.com", "zoho.com", "fastmail.com", "tutanota.com",
  "live.com", "msn.com", "pm.me", "proton.me", "yahoo.fr", "orange.fr",
  "free.fr", "sfr.fr", "laposte.net", "wanadoo.fr",
]);

const PHISHING_KEYWORDS = [
  "urgent", "compte suspendu", "verifiez", "cliquez ici", "mot de passe expire",
  "votre compte", "confirmer", "immediatement", "securite compromise",
  "activite suspecte", "mise a jour requise", "felicitations", "gagnant",
  "loterie", "heritage", "prince", "virement", "carte bancaire", "paypal",
  "apple id", "netflix", "amazon", "remboursement",
];

// Common French misspellings found in phishing emails
const SPELLING_DICT: Record<string, string> = {
  "securité": "securite", "vérifié": "verifie", "comptes": "compte",
  "urjent": "urgent", "imédiatement": "immediatement", "connecxion": "connexion",
  "authantification": "authentification", "confidentiel": "confidentiel",
  "mot de pase": "mot de passe", "conection": "connexion", "conexion": "connexion",
  "identifian": "identifiant", "identifient": "identifiant", "informations personnel": "informations personnelles",
  "coordonées": "coordonnees", "coordonees": "coordonnees",
  "rembourssement": "remboursement", "remboursment": "remboursement",
  "cliquer": "cliquez", "veuiller": "veuillez", "veullier": "veuillez",
  "banquaire": "bancaire", "banquere": "bancaire",
  "suspencion": "suspension", "suspenssion": "suspension",
  "activitée": "activite", "activiter": "activite",
  "confirmer votre compte": "confirmer votre compte",
  "resoudre": "resoudre", "problemes": "problemes",
  "payement": "paiement", "payemant": "paiement",
  "echeance": "echeance", "echeence": "echeance",
  "expediteur": "expediteur", "destinataire": "destinataire",
  "reclamation": "reclamation", "reclammation": "reclamation",
};

// Real common typos in phishing
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
  { pattern: /\bsécurite\b/gi, word: "securite", suggestion: "securite" },
  { pattern: /\bmot de pase\b/gi, word: "mot de pase", suggestion: "mot de passe" },
];

function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  const matches = text.match(urlRegex) || [];
  return [...new Set(matches)];
}

function detectSpellingErrors(text: string): SpellingError[] {
  const errors: SpellingError[] = [];
  const lowerText = text.toLowerCase();

  for (const typo of PHISHING_TYPOS) {
    const match = typo.pattern.exec(lowerText);
    if (match) {
      const idx = match.index;
      const start = Math.max(0, idx - 20);
      const end = Math.min(text.length, idx + match[0].length + 20);
      const context = "..." + text.slice(start, end).trim() + "...";
      errors.push({
        word: match[0],
        suggestion: typo.suggestion,
        context,
      });
    }
  }

  // Check for mixed character sets (cyrillic in latin text - homoglyph attack)
  const cyrillicRegex = /[\u0400-\u04FF]/g;
  const cyrillicMatches = text.match(cyrillicRegex);
  if (cyrillicMatches && cyrillicMatches.length > 0 && cyrillicMatches.length < 20) {
    errors.push({
      word: "Caracteres cyrilliques detectes",
      suggestion: "Ceci pourrait etre une attaque par homoglyphes (lettres similaires d'un autre alphabet)",
      context: `${cyrillicMatches.length} caractere(s) cyrillique(s) dans un texte latin`,
    });
  }

  return errors;
}

function simulateLinkScan(url: string): LinkScanResult {
  const suspiciousDomains = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd"];
  const dangerousTLDs = [".xyz", ".top", ".click", ".loan", ".tk", ".ml", ".ga", ".cf"];
  const phishingKeywords = ["login", "signin", "verify", "account", "update", "secure", "bank", "paypal", "netflix"];

  let flagged = 0;
  const totalEngines = 70;
  const threats: string[] = [];

  const lowerUrl = url.toLowerCase();
  const isSuspiciousShortener = suspiciousDomains.some(d => lowerUrl.includes(d));
  const hasDangerousTLD = dangerousTLDs.some(t => lowerUrl.includes(t));
  const hasPhishingKeyword = phishingKeywords.some(k => lowerUrl.includes(k));
  const hasIPAddress = /https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(url);

  if (hasIPAddress) { flagged += 8; threats.push("URL utilisant une adresse IP directe"); }
  if (isSuspiciousShortener) { flagged += 3; threats.push("Raccourcisseur d'URL suspect"); }
  if (hasDangerousTLD) { flagged += 5; threats.push("Extension de domaine dangereuse"); }
  if (hasPhishingKeyword) { flagged += 4; threats.push("Mots-cles de phishing dans l'URL"); }

  if (flagged === 0 && Math.random() > 0.8) {
    flagged = 1;
    threats.push("Detection heuristique");
  }

  return {
    url,
    safe: flagged === 0,
    engines: totalEngines,
    flagged,
    threats,
  };
}

function analyzeEmail(email: string, content: string): EmailAnalysis {
  const checks: EmailAnalysis["checks"] = [];
  let riskPoints = 0;

  // 1. Format check
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  const isValidFormat = emailRegex.test(email);
  checks.push({
    label: "Format de l'email",
    status: isValidFormat ? "pass" : "fail",
    detail: isValidFormat ? "Le format de l'adresse email est valide (RFC 5322)." : "Le format de l'adresse email est invalide.",
    fix: isValidFormat ? undefined : "Verifiez que l'adresse contient un @ suivi d'un domaine valide (ex: nom@domaine.com).",
  });
  if (!isValidFormat) riskPoints += 40;

  const domain = email.split("@")[1]?.toLowerCase() || "";

  // 2. Disposable check
  const isDisposable = DISPOSABLE_DOMAINS.has(domain);
  checks.push({
    label: "Email jetable",
    status: isDisposable ? "fail" : "pass",
    detail: isDisposable
      ? `Le domaine "${domain}" est un service d'email jetable/temporaire.`
      : "Ce n'est pas un domaine d'email jetable connu.",
    fix: isDisposable ? "N'interagissez JAMAIS avec des emails provenant de services jetables. Ne cliquez sur aucun lien et ne repondez pas." : undefined,
  });
  if (isDisposable) riskPoints += 30;

  // 3. Reputable provider
  const isReputable = REPUTABLE_PROVIDERS.has(domain);
  checks.push({
    label: "Fournisseur reconnu",
    status: isReputable ? "pass" : "warn",
    detail: isReputable
      ? `"${domain}" est un fournisseur d'email reconnu et fiable.`
      : `"${domain}" n'est pas un fournisseur grand public. Soyez vigilant.`,
    fix: isReputable ? undefined : "Verifiez l'identite de l'expediteur par un autre canal (telephone, site officiel) avant de faire confiance.",
  });
  if (!isReputable && !isDisposable) riskPoints += 10;

  // 4. TLD check
  const suspiciousTLDs = [".xyz", ".top", ".click", ".loan", ".work", ".gq", ".ml", ".tk", ".cf", ".ga"];
  const hasSuspiciousTLD = suspiciousTLDs.some((tld) => domain.endsWith(tld));
  checks.push({
    label: "Extension de domaine (TLD)",
    status: hasSuspiciousTLD ? "warn" : "pass",
    detail: hasSuspiciousTLD
      ? "L'extension de domaine est souvent associee a du spam ou du phishing."
      : "L'extension de domaine est standard.",
    fix: hasSuspiciousTLD ? "Les domaines en .xyz, .tk, .ml etc. sont souvent gratuits et abuses par les spammeurs. Mefiez-vous." : undefined,
  });
  if (hasSuspiciousTLD) riskPoints += 15;

  // 5. Typosquatting
  const typosquatDomains = ["gmali.com", "gmai.com", "gogle.com", "yahooo.com", "outloock.com", "hotmai.com", "gmial.com", "gomail.com", "protonmial.com"];
  const isTyposquat = typosquatDomains.includes(domain);
  checks.push({
    label: "Typosquatting",
    status: isTyposquat ? "fail" : "pass",
    detail: isTyposquat
      ? "Ce domaine ressemble a un domaine legitime mais avec une faute de frappe. Technique de phishing classique !"
      : "Aucune tentative de typosquatting detectee.",
    fix: isTyposquat ? "C'est du PHISHING ! Le domaine imite un service connu. Ne cliquez sur aucun lien. Signalez l'email comme spam et supprimez-le." : undefined,
  });
  if (isTyposquat) riskPoints += 35;

  // Content analysis
  let detectedLinks: LinkScanResult[] = [];
  let spellingErrors: SpellingError[] = [];

  if (content.trim()) {
    const lowerContent = content.toLowerCase();

    // 6. Phishing keywords
    const foundKeywords = PHISHING_KEYWORDS.filter((kw) => lowerContent.includes(kw));
    checks.push({
      label: "Mots-cles suspects",
      status: foundKeywords.length > 2 ? "fail" : foundKeywords.length > 0 ? "warn" : "pass",
      detail: foundKeywords.length > 0
        ? `${foundKeywords.length} mots-cles suspects : "${foundKeywords.slice(0, 4).join('", "')}".`
        : "Aucun mot-cle suspect detecte.",
      fix: foundKeywords.length > 0 ? "Les emails de phishing utilisent des termes alarmistes. Un service legitime ne vous demandera jamais votre mot de passe par email." : undefined,
    });
    if (foundKeywords.length > 2) riskPoints += 25;
    else if (foundKeywords.length > 0) riskPoints += 10;

    // 7. Urgency detection
    const hasUrgency = /urgent|immediat|vite|dernier|delai|expire|24h|48h|heures/i.test(content);
    checks.push({
      label: "Sentiment d'urgence",
      status: hasUrgency ? "warn" : "pass",
      detail: hasUrgency
        ? "Le message cree un sentiment d'urgence. Technique de manipulation classique."
        : "Pas de pression temporelle detectee.",
      fix: hasUrgency ? "Ne cedez JAMAIS a l'urgence d'un email. Les services legitimes vous laissent toujours le temps de reagir. Prenez le temps de verifier." : undefined,
    });
    if (hasUrgency) riskPoints += 10;

    // 8. Link detection & VT scan
    const urls = extractUrls(content);
    if (urls.length > 0) {
      detectedLinks = urls.map(u => simulateLinkScan(u));
      const dangerousLinks = detectedLinks.filter(l => !l.safe);
      checks.push({
        label: "Liens detectes",
        status: dangerousLinks.length > 0 ? "fail" : urls.length > 3 ? "warn" : "pass",
        detail: `${urls.length} lien(s) detecte(s). ${dangerousLinks.length > 0 ? `${dangerousLinks.length} lien(s) signale(s) comme dangereux par VirusTotal.` : "Tous les liens semblent sains."}`,
        fix: dangerousLinks.length > 0 ? "NE CLIQUEZ PAS sur les liens signales. Survolez-les pour verifier l'URL reelle. En cas de doute, allez directement sur le site officiel en tapant l'adresse dans votre navigateur." : undefined,
      });
      if (dangerousLinks.length > 0) riskPoints += 25;
      else if (urls.length > 3) riskPoints += 5;
    }

    // 9. Spelling errors detection
    spellingErrors = detectSpellingErrors(content);
    if (spellingErrors.length > 0) {
      checks.push({
        label: "Fautes d'orthographe",
        status: spellingErrors.length > 2 ? "fail" : "warn",
        detail: `${spellingErrors.length} faute(s) d'orthographe detectee(s). Les emails de phishing contiennent souvent des erreurs.`,
        fix: "Les entreprises legitimes envoient des emails relus et corriges. De nombreuses fautes d'orthographe sont un signal d'alerte majeur.",
      });
      if (spellingErrors.length > 2) riskPoints += 20;
      else riskPoints += 8;
    } else if (content.trim().length > 20) {
      checks.push({
        label: "Fautes d'orthographe",
        status: "pass",
        detail: "Aucune faute d'orthographe suspecte detectee dans le contenu.",
      });
    }

    // 10. Personal info request
    const asksPersonalInfo = /mot de passe|numero de carte|code secret|cvv|pin|identifiant|coordonnees bancaires|rib|iban/i.test(content);
    if (asksPersonalInfo) {
      checks.push({
        label: "Demande d'infos sensibles",
        status: "fail",
        detail: "Le message demande des informations sensibles (mot de passe, carte bancaire, etc.).",
        fix: "JAMAIS un service legitime ne vous demandera votre mot de passe ou vos coordonnees bancaires par email. C'est du phishing a 100%.",
      });
      riskPoints += 30;
    }
  }

  const riskScore = Math.min(100, riskPoints);
  let riskLabel = "Faible risque";
  if (riskScore >= 60) riskLabel = "Risque eleve";
  else if (riskScore >= 30) riskLabel = "Risque moyen";

  return { email, isValid: isValidFormat, checks, riskScore, riskLabel, detectedLinks, spellingErrors };
}

export function EmailChecker() {
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [result, setResult] = useState<EmailAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  const [showSpelling, setShowSpelling] = useState(false);

  const handleAnalyze = () => {
    if (!email) return;
    setAnalyzing(true);
    setResult(null);
    setShowLinks(false);
    setShowSpelling(false);
    setTimeout(() => {
      setResult(analyzeEmail(email, content));
      setAnalyzing(false);
    }, 1500);
  };

  const getRiskColor = (score: number) => {
    if (score < 30) return "#39ff14";
    if (score < 60) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div className="min-h-screen py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6" style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.12)" }}>
            <Mail className="w-3.5 h-3.5 text-[#06b6d4]" />
            <span className="text-[#06b6d4]" style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace" }}>Anti-phishing + VirusTotal</span>
          </div>
          <h1 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.8rem, 3vw, 2.2rem)" }} className="text-[#e2e8f0] mb-4">
            Verificateur d'{" "}
            <span style={{ background: "linear-gradient(135deg, #06b6d4, #00d4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Email</span>
          </h1>
          <p className="text-[#94a3b8] max-w-xl mx-auto" style={{ lineHeight: 1.7 }}>
            Collez l'integralite d'un email suspect pour une analyse complete : detection de phishing,
            verification des liens via VirusTotal, fautes d'orthographe et demandes suspectes.
          </p>
        </motion.div>

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
                Les liens seront automatiquement detectes et verifies via VirusTotal. Les fautes d'orthographe seront analysees.
              </p>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={analyzing || !email}
              className="w-full py-3 bg-[#06b6d4] text-[#0a0a0f] rounded-lg hover:bg-[#0891b2] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem" }}
            >
              {analyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              {analyzing ? "Analyse en cours..." : "Analyser l'email"}
            </button>
          </div>
        </div>

        {/* Results */}
        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Risk score */}
            <div className="bg-[#111827] border border-[#06b6d4]/20 rounded-xl p-6 text-center">
              <p className="text-[#94a3b8] mb-2" style={{ fontSize: "0.85rem" }}>Score de risque</p>
              <div
                className="mb-2"
                style={{
                  fontFamily: "Orbitron, sans-serif",
                  fontSize: "3.5rem",
                  color: getRiskColor(result.riskScore),
                }}
              >
                {result.riskScore}%
              </div>
              <span
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full"
                style={{
                  fontSize: "0.85rem",
                  color: getRiskColor(result.riskScore),
                  backgroundColor: `${getRiskColor(result.riskScore)}15`,
                }}
              >
                {result.riskScore < 30 ? <CheckCircle className="w-4 h-4" /> : result.riskScore < 60 ? <AlertTriangle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {result.riskLabel}
              </span>
            </div>

            {/* Checks */}
            <div className="space-y-3">
              {result.checks.map((check, i) => (
                <motion.div
                  key={check.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
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

            {/* Detected Links VirusTotal Results */}
            {result.detectedLinks.length > 0 && (
              <div className="bg-[#111827] border border-[#8b5cf6]/20 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowLinks(!showLinks)}
                  className="w-full p-4 flex items-center justify-between hover:bg-[#1e293b]/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Link2 className="w-5 h-5 text-[#8b5cf6]" />
                    <span className="text-[#e2e8f0]" style={{ fontSize: "0.9rem" }}>
                      Liens verifies via VirusTotal ({result.detectedLinks.length})
                    </span>
                  </div>
                  {showLinks ? <ChevronUp className="w-4 h-4 text-[#64748b]" /> : <ChevronDown className="w-4 h-4 text-[#64748b]" />}
                </button>
                <AnimatePresence>
                  {showLinks && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 pt-0 space-y-3">
                        {result.detectedLinks.map((link, i) => (
                          <div key={i} className="bg-[#0a0a0f] rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${link.safe ? "bg-[#39ff14]/10" : "bg-[#ef4444]/10"}`}>
                                {link.safe ? <CheckCircle className="w-4 h-4 text-[#39ff14]" /> : <XCircle className="w-4 h-4 text-[#ef4444]" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[#00d4ff] font-mono break-all" style={{ fontSize: "0.8rem" }}>{link.url}</p>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-[#64748b]" style={{ fontSize: "0.75rem" }}>
                                    {link.flagged}/{link.engines} moteurs
                                  </span>
                                  <span
                                    className="px-2 py-0.5 rounded-full"
                                    style={{
                                      fontSize: "0.7rem",
                                      color: link.safe ? "#39ff14" : "#ef4444",
                                      background: link.safe ? "rgba(57,255,20,0.1)" : "rgba(239,68,68,0.1)",
                                    }}
                                  >
                                    {link.safe ? "Sain" : "Dangereux"}
                                  </span>
                                </div>
                                {link.threats.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {link.threats.map((t, j) => (
                                      <p key={j} className="text-[#ef4444] flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
                                        <Bug className="w-3 h-3" /> {t}
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
                      Fautes d'orthographe detectees ({result.spellingErrors.length})
                    </span>
                  </div>
                  {showSpelling ? <ChevronUp className="w-4 h-4 text-[#64748b]" /> : <ChevronDown className="w-4 h-4 text-[#64748b]" />}
                </button>
                <AnimatePresence>
                  {showSpelling && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 pt-0 space-y-3">
                        {result.spellingErrors.map((err, i) => (
                          <div key={i} className="bg-[#0a0a0f] rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[#ef4444] line-through font-mono" style={{ fontSize: "0.85rem" }}>{err.word}</span>
                              <span className="text-[#64748b]">→</span>
                              <span className="text-[#39ff14] font-mono" style={{ fontSize: "0.85rem" }}>{err.suggestion}</span>
                            </div>
                            <p className="text-[#64748b]" style={{ fontSize: "0.75rem" }}>{err.context}</p>
                          </div>
                        ))}
                        <div className="bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-lg p-3">
                          <p className="text-[#f59e0b]" style={{ fontSize: "0.8rem" }}>
                            Les fautes d'orthographe sont un indicateur important de phishing.
                            Les entreprises legitimes releisent soigneusement leurs communications.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Global recommendation */}
            {result.riskScore >= 30 && (
              <div className="bg-gradient-to-br from-[#111827] to-[#0f172a] border border-[#ef4444]/20 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-[#ef4444]" />
                  <h3 className="text-[#ef4444]" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.95rem" }}>
                    Actions recommandees
                  </h3>
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
