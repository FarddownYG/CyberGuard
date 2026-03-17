import { useState } from "react";
import { Globe, Search, CheckCircle, XCircle, AlertTriangle, Shield, Server, Loader2, Info, ChevronDown, ChevronUp, Lightbulb, Network, Layers } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DNSCheck {
  name: string;
  status: "pass" | "fail" | "warn" | "info";
  value: string;
  detail: string;
  fix?: string;
}

interface DNSResult {
  domain: string;
  isSubdomain: boolean;
  parentDomain: string | null;
  platform: string | null;
  checks: DNSCheck[];
  overallScore: number;
  recommendations: string[];
  aRecords: string[];
  aaaaRecords: string[];
  nsRecords: string[];
}

// ─── Real DNS-over-HTTPS queries via Google Public DNS ──────────────────

async function queryDNS(name: string, type: string): Promise<any> {
  try {
    const res = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
      { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function isSubdomain(domain: string): boolean {
  const parts = domain.split(".");
  // example.com = 2 parts (not subdomain), sub.example.com = 3+ parts
  // Special cases: co.uk, com.br etc. handled simply
  const knownTwoPartTLDs = ["co.uk", "com.br", "com.au", "co.jp", "co.kr", "org.uk", "net.au", "ac.uk"];
  const lower = domain.toLowerCase();
  for (const tld of knownTwoPartTLDs) {
    if (lower.endsWith(`.${tld}`)) return parts.length > 3;
  }
  return parts.length > 2;
}

function getParentDomain(domain: string): string | null {
  const parts = domain.split(".");
  if (parts.length <= 2) return null;
  return parts.slice(-2).join(".");
}

// Known managed hosting platforms where users don't control DNS
const MANAGED_PLATFORMS: Record<string, string> = {
  "vercel.app": "Vercel",
  "netlify.app": "Netlify",
  "github.io": "GitHub Pages",
  "pages.dev": "Cloudflare Pages",
  "herokuapp.com": "Heroku",
  "fly.dev": "Fly.io",
  "railway.app": "Railway",
  "render.com": "Render",
  "surge.sh": "Surge",
  "web.app": "Firebase Hosting",
  "firebaseapp.com": "Firebase Hosting",
  "azurestaticapps.net": "Azure Static Web Apps",
  "amplifyapp.com": "AWS Amplify",
};

function getManagedPlatform(domain: string): string | null {
  const lower = domain.toLowerCase();
  for (const [suffix, name] of Object.entries(MANAGED_PLATFORMS)) {
    if (lower.endsWith(`.${suffix}`)) return name;
  }
  return null;
}

// ─── DNS Checks ─────────────────────────────────────────────────────────

async function checkA(domain: string): Promise<{ check: DNSCheck; records: string[] }> {
  const data = await queryDNS(domain, "A");
  const answers = data?.Answer || [];
  const records = answers.filter((a: any) => a.type === 1).map((a: any) => a.data || "");

  if (records.length > 0) {
    return {
      check: {
        name: "Enregistrements A (IPv4)",
        status: "pass",
        value: records.join(", "),
        detail: `${records.length} adresse(s) IPv4 trouvée(s). Le domaine résout correctement.`,
      },
      records,
    };
  }

  return {
    check: {
      name: "Enregistrements A (IPv4)",
      status: "warn",
      value: "Aucun enregistrement A",
      detail: "Aucune adresse IPv4 trouvée. Le domaine ne résout peut-être que via IPv6 (AAAA) ou CNAME.",
    },
    records: [],
  };
}

async function checkAAAA(domain: string): Promise<{ check: DNSCheck; records: string[] }> {
  const data = await queryDNS(domain, "AAAA");
  const answers = data?.Answer || [];
  const records = answers.filter((a: any) => a.type === 28).map((a: any) => a.data || "");

  return {
    check: {
      name: "Enregistrements AAAA (IPv6)",
      status: records.length > 0 ? "pass" : "info",
      value: records.length > 0 ? records.join(", ") : "Aucun enregistrement AAAA",
      detail: records.length > 0
        ? `${records.length} adresse(s) IPv6 trouvée(s). Le domaine supporte le dual-stack IPv4/IPv6.`
        : "Pas d'IPv6 configuré. Non bloquant mais recommandé pour la compatibilité future.",
    },
    records,
  };
}

async function checkNS(domain: string): Promise<{ check: DNSCheck; records: string[] }> {
  const data = await queryDNS(domain, "NS");
  const answers = data?.Answer || [];
  const records = answers.filter((a: any) => a.type === 2).map((a: any) => a.data?.replace(/\.$/, "") || "");

  if (records.length > 0) {
    return {
      check: {
        name: "Serveurs de noms (NS)",
        status: records.length >= 2 ? "pass" : "warn",
        value: records.join(", "),
        detail: records.length >= 2
          ? `${records.length} serveurs NS détectés. Redondance DNS adéquate.`
          : `Un seul serveur NS détecté. Ajoutez un serveur secondaire pour la redondance.`,
        fix: records.length < 2 ? "Un seul serveur DNS est un point de défaillance unique (SPOF). Configurez au moins 2 serveurs NS chez votre registrar." : undefined,
      },
      records,
    };
  }

  return {
    check: {
      name: "Serveurs de noms (NS)",
      status: "info",
      value: "Pas d'enregistrements NS directs",
      detail: "Aucun enregistrement NS trouvé à ce niveau. Si c'est un sous-domaine, les NS sont gérés par le domaine parent.",
    },
    records: [],
  };
}

async function checkSPF(domain: string): Promise<DNSCheck> {
  const data = await queryDNS(domain, "TXT");
  const answers = data?.Answer || [];
  const txtRecords: string[] = answers
    .filter((a: any) => a.type === 16)
    .map((a: any) => a.data?.replace(/^"|"$/g, "") || "");

  const spfRecord = txtRecords.find((r) => r.toLowerCase().startsWith("v=spf1"));

  if (spfRecord) {
    const hasStrictAll = spfRecord.includes("-all");
    const hasSoftAll = spfRecord.includes("~all");
    return {
      name: "SPF (Sender Policy Framework)",
      status: hasStrictAll ? "pass" : hasSoftAll ? "pass" : "warn",
      value: spfRecord,
      detail: hasStrictAll
        ? "SPF strict (-all) détecté. Seuls les serveurs déclarés peuvent envoyer des emails pour ce domaine."
        : hasSoftAll
          ? "SPF avec soft fail (~all) détecté. Les serveurs non autorisés sont signalés mais pas rejetés."
          : "SPF détecté mais sans politique stricte. Ajoutez '-all' ou '~all' à la fin.",
      fix: !hasStrictAll && !hasSoftAll ? "Modifiez votre enregistrement SPF pour terminer par '-all' (strict) ou '~all' (soft fail)." : undefined,
    };
  }

  return {
    name: "SPF (Sender Policy Framework)",
    status: "fail",
    value: "Aucun enregistrement SPF détecté",
    detail: "Aucun enregistrement SPF. Les emails de ce domaine pourraient être usurpés (spoofing).",
    fix: "Ajoutez un enregistrement DNS TXT commençant par 'v=spf1' pour déclarer les serveurs autorisés à envoyer des emails.",
  };
}

async function checkDMARC(domain: string): Promise<DNSCheck> {
  const data = await queryDNS(`_dmarc.${domain}`, "TXT");
  const answers = data?.Answer || [];
  const txtRecords: string[] = answers
    .filter((a: any) => a.type === 16)
    .map((a: any) => a.data?.replace(/^"|"$/g, "") || "");

  const dmarcRecord = txtRecords.find((r) => r.toLowerCase().startsWith("v=dmarc1"));

  if (dmarcRecord) {
    const policy = dmarcRecord.match(/p=(none|quarantine|reject)/i);
    const policyValue = policy?.[1]?.toLowerCase() || "none";

    if (policyValue === "reject") {
      return {
        name: "DMARC (Domain-based Message Authentication)",
        status: "pass",
        value: dmarcRecord,
        detail: "Politique DMARC stricte (reject). Les emails non authentifiés sont rejetés.",
      };
    } else if (policyValue === "quarantine") {
      return {
        name: "DMARC (Domain-based Message Authentication)",
        status: "pass",
        value: dmarcRecord,
        detail: "DMARC en mode quarantine. Les emails suspects sont mis en quarantaine.",
      };
    } else {
      return {
        name: "DMARC (Domain-based Message Authentication)",
        status: "warn",
        value: dmarcRecord,
        detail: "DMARC en mode 'none' (monitoring uniquement). Les emails non authentifiés passent quand même.",
        fix: "Passez progressivement de p=none à p=quarantine puis p=reject une fois que vos flux email sont validés.",
      };
    }
  }

  return {
    name: "DMARC (Domain-based Message Authentication)",
    status: "fail",
    value: "Aucune politique DMARC détectée",
    detail: `Aucun enregistrement DMARC sur _dmarc.${domain}. Le domaine est vulnérable au spoofing.`,
    fix: "Ajoutez un enregistrement TXT sur _dmarc.votre-domaine.com avec la valeur 'v=DMARC1; p=none; rua=mailto:dmarc@votre-domaine.com' pour commencer le monitoring.",
  };
}

async function checkDKIM(domain: string): Promise<DNSCheck> {
  const selectors = ["default", "google", "selector1", "selector2", "dkim", "mail", "k1", "s1", "s2", "mandrill", "amazonses", "cm", "mxvault"];
  const found: string[] = [];

  for (const sel of selectors) {
    const data = await queryDNS(`${sel}._domainkey.${domain}`, "TXT");
    const answers = data?.Answer || [];
    const txt = answers
      .filter((a: any) => a.type === 16 || a.type === 5)
      .map((a: any) => a.data?.replace(/^"|"$/g, "") || "");

    if (txt.length > 0 && txt.some((t: string) => t.includes("v=DKIM1") || t.includes("_domainkey") || t.length > 20)) {
      found.push(sel);
      break;
    }
  }

  if (found.length > 0) {
    return {
      name: "DKIM (DomainKeys Identified Mail)",
      status: "pass",
      value: `DKIM actif (sélecteur: ${found[0]})`,
      detail: `Enregistrement DKIM détecté via le sélecteur '${found[0]}'. L'authenticité des emails sortants est vérifiable cryptographiquement.`,
    };
  }

  return {
    name: "DKIM (DomainKeys Identified Mail)",
    status: "info",
    value: "Aucun DKIM détecté (sélecteurs standards)",
    detail: `Testé avec ${selectors.length} sélecteurs (${selectors.slice(0, 5).join(", ")}...). Le DKIM peut utiliser un sélecteur personnalisé non testable depuis l'extérieur.`,
  };
}

async function checkDNSSEC(domain: string): Promise<DNSCheck> {
  const data = await queryDNS(domain, "A");

  if (data?.AD === true) {
    return {
      name: "DNSSEC",
      status: "pass",
      value: "DNSSEC activé et validé (AD flag)",
      detail: "DNSSEC est activé. Les réponses DNS sont signées et protégées contre le DNS spoofing et le cache poisoning.",
    };
  }

  const dsData = await queryDNS(domain, "DS");
  const hasDS = dsData?.Answer && dsData.Answer.length > 0;

  if (hasDS) {
    return {
      name: "DNSSEC",
      status: "pass",
      value: "DNSSEC activé (DS records)",
      detail: "Des enregistrements DS existent, indiquant que DNSSEC est déployé.",
    };
  }

  return {
    name: "DNSSEC",
    status: "warn",
    value: "DNSSEC non détecté",
    detail: "DNSSEC ne semble pas activé. Les réponses DNS pourraient être falsifiées.",
    fix: "Contactez votre registrar ou hébergeur DNS pour activer DNSSEC. C'est souvent un bouton dans le panel d'administration.",
  };
}

async function checkMX(domain: string): Promise<DNSCheck> {
  const data = await queryDNS(domain, "MX");
  const answers = data?.Answer || [];
  const mxRecords = answers
    .filter((a: any) => a.type === 15)
    .map((a: any) => a.data || "");

  if (mxRecords.length > 0) {
    return {
      name: "Enregistrements MX",
      status: "pass",
      value: mxRecords.slice(0, 3).join(", "),
      detail: `${mxRecords.length} enregistrement(s) MX détecté(s). La réception d'emails est configurée.`,
    };
  }

  return {
    name: "Enregistrements MX",
    status: "info",
    value: "Aucun enregistrement MX",
    detail: "Aucun MX configuré. Ce domaine ne reçoit pas d'emails, ou utilise un service externe configuré au niveau du domaine parent.",
  };
}

async function checkCAA(domain: string): Promise<DNSCheck> {
  const data = await queryDNS(domain, "CAA");
  const answers = data?.Answer || [];
  const caaRecords = answers
    .filter((a: any) => a.type === 257)
    .map((a: any) => a.data || "");

  if (caaRecords.length > 0) {
    return {
      name: "CAA (Certificate Authority Authorization)",
      status: "pass",
      value: caaRecords.slice(0, 3).join(", "),
      detail: "Les autorités de certification autorisées sont restreintes par CAA.",
    };
  }

  return {
    name: "CAA (Certificate Authority Authorization)",
    status: "warn",
    value: "Aucun enregistrement CAA",
    detail: "Sans CAA, n'importe quelle autorité de certification peut émettre un certificat pour votre domaine.",
    fix: "Ajoutez un enregistrement CAA DNS pour limiter les CA autorisées. Ex: 0 issue \"letsencrypt.org\"",
  };
}

async function checkHTTPS(domain: string): Promise<{ ssl: DNSCheck; hsts: DNSCheck }> {
  let sslCheck: DNSCheck;
  let hstsCheck: DNSCheck;

  try {
    await fetch(`https://${domain}`, {
      method: "HEAD",
      mode: "no-cors",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    sslCheck = {
      name: "Certificat SSL/TLS",
      status: "pass",
      value: "HTTPS accessible",
      detail: "Le domaine répond sur HTTPS. Le certificat SSL/TLS est actif. Pour un audit détaillé, utilisez SSL Labs.",
    };
  } catch {
    sslCheck = {
      name: "Certificat SSL/TLS",
      status: "warn",
      value: "Vérification HTTPS non concluante",
      detail: "Impossible de vérifier HTTPS depuis le navigateur (CORS). Pour un test précis, utilisez un outil externe comme SSL Labs.",
    };
  }

  hstsCheck = {
    name: "HSTS (HTTP Strict Transport Security)",
    status: "info",
    value: "Non vérifiable depuis le navigateur",
    detail: `Le header HSTS ne peut pas être lu cross-origin (CORS). Vérifiez avec : curl -sI https://${domain} | grep -i strict`,
  };

  return { ssl: sslCheck, hsts: hstsCheck };
}

// ─── Main check orchestrator ─────────────────────────────────────────────

async function performDNSCheck(domain: string, onProgress?: (step: string) => void): Promise<DNSResult> {
  const clean = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "").toLowerCase();
  const isSub = isSubdomain(clean);
  const parent = getParentDomain(clean);
  const platform = getManagedPlatform(clean);

  onProgress?.("Résolution A/AAAA et NS...");
  const [aResult, aaaaResult, nsResult] = await Promise.all([
    checkA(clean),
    checkAAAA(clean),
    checkNS(clean),
  ]);

  onProgress?.("Vérification SPF, DKIM, DMARC...");
  const [spf, dmarc, dkim] = await Promise.all([
    checkSPF(clean),
    checkDMARC(clean),
    checkDKIM(clean),
  ]);

  onProgress?.("DNSSEC, MX, CAA, SSL...");
  const [dnssec, mx, caa, httpsResult] = await Promise.all([
    checkDNSSEC(clean),
    checkMX(clean),
    checkCAA(clean),
    checkHTTPS(clean),
  ]);

  let checks = [
    aResult.check,
    aaaaResult.check,
    nsResult.check,
    httpsResult.ssl,
    spf,
    dkim,
    dmarc,
    dnssec,
    mx,
    caa,
    httpsResult.hsts,
  ];

  // If on a managed platform subdomain, downgrade unfixable DNS checks to "info"
  // because the user does NOT control the DNS zone
  if (platform) {
    const unfixableOnPlatform = ["SPF", "DMARC", "DNSSEC", "CAA", "MX"];
    checks = checks.map((c) => {
      const isUnfixable = unfixableOnPlatform.some((name) => c.name.includes(name));
      if (isUnfixable && (c.status === "fail" || c.status === "warn")) {
        return {
          ...c,
          status: "info" as const,
          detail: c.detail + ` (Sous-domaine ${platform} : vous n'avez pas accès à la zone DNS, cet élément n'est pas modifiable de votre côté.)`,
          fix: undefined,
        };
      }
      return c;
    });
  }

  // Sort: fail first, then warn, then pass, then info
  const statusOrder = { fail: 0, warn: 1, pass: 2, info: 3 };
  checks.sort((a, b) => (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4));

  // Score: only count pass/fail/warn (not info)
  const scorableChecks = checks.filter((c) => c.status !== "info");
  const passCount = scorableChecks.filter((c) => c.status === "pass").length;
  const overallScore = scorableChecks.length > 0 ? Math.round((passCount / scorableChecks.length) * 100) : 0;

  // Generate recommendations
  const recommendations: string[] = [];
  const fails = checks.filter((c) => c.status === "fail");
  const warns = checks.filter((c) => c.status === "warn");
  if (platform) {
    recommendations.push(
      `Ce site est hébergé sur ${platform} (sous-domaine ${parent || ""}). Vous ne contrôlez PAS la zone DNS — les éléments SPF, DMARC, DNSSEC, CAA et MX ne sont pas modifiables de votre côté et ont été reclassés en "info". En revanche, vous pouvez sécuriser votre site via les headers HTTP (HSTS, CSP, X-Frame-Options) dans votre fichier de configuration ${platform === "Vercel" ? "vercel.json" : platform === "Netlify" ? "netlify.toml" : "de déploiement"}.`
    );
  } else if (isSub) {
    recommendations.push(
      `"${clean}" est un sous-domaine. Les enregistrements email (SPF, DKIM, DMARC, MX) sont généralement configurés sur le domaine parent (${parent || "domaine.com"}), pas sur les sous-domaines. Leur absence ici est normale.`
    );
  }
  if (fails.length === 0 && warns.length === 0) {
    recommendations.push("La configuration DNS de ce domaine est bien sécurisée. Aucun problème critique détecté.");
  }
  if (platform) {
    recommendations.push(
      `Pour améliorer la sécurité de votre site ${platform}, concentrez-vous sur : les headers de sécurité HTTP (HSTS, CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy), la configuration HTTPS (automatique sur ${platform}), et la sécurité applicative (XSS, CSRF, etc.).`
    );
  }
  if (fails.some((c) => c.name.includes("SPF"))) {
    recommendations.push("Priorité haute : ajoutez un enregistrement SPF pour empêcher l'usurpation d'email.");
  }
  if (fails.some((c) => c.name.includes("DMARC"))) {
    recommendations.push("Priorité haute : déployez DMARC pour protéger contre le phishing utilisant votre domaine.");
  }
  if (warns.some((c) => c.name.includes("DNSSEC"))) {
    recommendations.push("Recommandé : activez DNSSEC pour protéger contre le DNS spoofing.");
  }
  if (warns.some((c) => c.name.includes("CAA"))) {
    recommendations.push("Recommandé : ajoutez des enregistrements CAA pour restreindre les autorités de certification.");
  }
  if (!isSub && checks.some((c) => c.name.includes("MX") && c.status === "info")) {
    recommendations.push("Ce domaine n'a pas d'enregistrements MX. Si vous prévoyez d'envoyer/recevoir des emails, configurez-les.");
  }

  return {
    domain: clean,
    isSubdomain: isSub,
    parentDomain: parent,
    platform: platform,
    checks,
    overallScore,
    recommendations,
    aRecords: aResult.records,
    aaaaRecords: aaaaResult.records,
    nsRecords: nsResult.records,
  };
}

// ─── Component ────────────────────────────────────────────────────────────

export function DNSChecker() {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<DNSResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [progressMsg, setProgressMsg] = useState("");
  const [showRecommendations, setShowRecommendations] = useState(true);

  const handleCheck = async () => {
    if (!domain.trim()) return;
    setChecking(true);
    setResult(null);
    setError("");
    setProgressMsg("Démarrage des vérifications...");

    try {
      const res = await performDNSCheck(domain.trim(), setProgressMsg);
      setResult(res);
    } catch {
      setError("Erreur lors de la vérification DNS. Vérifiez le nom de domaine et réessayez.");
    } finally {
      setChecking(false);
      setProgressMsg("");
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#39ff14";
    if (score >= 50) return "#f59e0b";
    return "#ef4444";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass": return <CheckCircle className="w-4 h-4 text-[#39ff14]" />;
      case "warn": return <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />;
      case "fail": return <XCircle className="w-4 h-4 text-[#ef4444]" />;
      case "info": return <Info className="w-4 h-4 text-[#00d4ff]" />;
      default: return null;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "pass": return "rgba(57,255,20,0.1)";
      case "warn": return "rgba(245,158,11,0.1)";
      case "fail": return "rgba(239,68,68,0.1)";
      case "info": return "rgba(0,212,255,0.1)";
      default: return "rgba(255,255,255,0.05)";
    }
  };

  const getStatusBorder = (status: string) => {
    switch (status) {
      case "pass": return "rgba(57,255,20,0.15)";
      case "warn": return "rgba(245,158,11,0.15)";
      case "fail": return "rgba(239,68,68,0.15)";
      case "info": return "rgba(0,212,255,0.1)";
      default: return "rgba(255,255,255,0.05)";
    }
  };

  return (
    <div className="min-h-screen py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6" style={{ background: "rgba(236,72,153,0.06)", border: "1px solid rgba(236,72,153,0.12)" }}>
            <Globe className="w-3.5 h-3.5 text-[#ec4899]" />
            <span className="text-[#ec4899]" style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace" }}>DNS-over-HTTPS — Requêtes réelles</span>
          </div>
          <h1 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.8rem, 3vw, 2.2rem)" }} className="text-[#e2e8f0] mb-4">
            DNS{" "}
            <span style={{ background: "linear-gradient(135deg, #ec4899, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Security Check</span>
          </h1>
          <p className="text-[#94a3b8] max-w-xl mx-auto" style={{ lineHeight: 1.7 }}>
            Vérifiez la configuration DNS complète de votre domaine via DNS-over-HTTPS (Google Public DNS).
            A, AAAA, NS, SPF, DKIM, DMARC, DNSSEC, MX, CAA, SSL et HSTS.
          </p>
        </motion.div>

        <div className="bg-[#111827] border border-[#ec4899]/20 rounded-xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748b]" />
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCheck()}
                placeholder="votre-domaine.com"
                className="w-full pl-10 pr-4 py-3 bg-[#0a0a0f] border border-[#ec4899]/20 rounded-lg text-[#e2e8f0] placeholder-[#64748b] focus:outline-none focus:border-[#ec4899]/60 transition-colors"
                disabled={checking}
              />
            </div>
            <button
              onClick={handleCheck}
              disabled={checking || !domain.trim()}
              className="px-6 py-3 bg-[#ec4899] text-white rounded-lg hover:bg-[#db2777] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem" }}
            >
              {checking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              {checking ? "Vérification..." : "Vérifier DNS"}
            </button>
          </div>

          <div className="mt-3 flex items-start gap-2 text-[#64748b]" style={{ fontSize: "0.72rem" }}>
            <Shield className="w-3.5 h-3.5 text-[#ec4899] flex-shrink-0 mt-0.5" />
            <span>
              Requêtes DNS réelles via dns.google (DoH). Résultats en temps réel. DKIM testé avec {13} sélecteurs courants.
            </span>
          </div>
        </div>

        {/* Loading */}
        {checking && (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-2 border-[#ec4899]/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#ec4899] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Server className="w-8 h-8 text-[#ec4899] animate-pulse" />
              </div>
            </div>
            <p className="text-[#ec4899]" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem" }}>
              Interrogation DNS en cours...
            </p>
            <p className="text-[#64748b]" style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace" }}>
              {progressMsg}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-xl p-4 mb-8 flex items-start gap-3"
          >
            <XCircle className="w-5 h-5 text-[#ef4444] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[#ef4444]" style={{ fontSize: "0.85rem" }}>{error}</p>
              <p className="text-[#94a3b8] mt-1" style={{ fontSize: "0.75rem" }}>
                Vérifiez que le domaine existe et que vous avez une connexion internet. Le format attendu est : domaine.com (sans https://).
              </p>
            </div>
          </motion.div>
        )}

        {/* Results */}
        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Subdomain notice */}
            {result.isSubdomain && (
              <div className="bg-[#8b5cf6]/5 border border-[#8b5cf6]/20 rounded-xl p-4 flex items-start gap-3">
                <Layers className="w-5 h-5 text-[#8b5cf6] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[#8b5cf6]" style={{ fontSize: "0.9rem" }}>Sous-domaine détecté</p>
                  <p className="text-[#94a3b8]" style={{ fontSize: "0.8rem" }}>
                    <strong className="text-[#e2e8f0]">{result.domain}</strong> est un sous-domaine de <strong className="text-[#e2e8f0]">{result.parentDomain}</strong>.
                    Les enregistrements email (SPF, DKIM, DMARC, MX) sont généralement configurés sur le domaine parent, pas sur les sous-domaines. Leur absence ici est normale.
                  </p>
                </div>
              </div>
            )}

            {/* Score + summary */}
            <div className="bg-[#111827] border border-[#ec4899]/20 rounded-xl p-8">
              <div className="text-center mb-6">
                <p className="text-[#94a3b8] mb-2" style={{ fontSize: "0.85rem" }}>Score DNS Security — {result.domain}</p>
                <div
                  className="mb-2"
                  style={{
                    fontFamily: "Orbitron, sans-serif",
                    fontSize: "4rem",
                    color: getScoreColor(result.overallScore),
                  }}
                >
                  {result.overallScore}%
                </div>
                <div className="w-full max-w-xs mx-auto h-3 bg-[#1e293b] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${getScoreColor(result.overallScore)}, #00d4ff)`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${result.overallScore}%` }}
                    transition={{ duration: 1 }}
                  />
                </div>
                <p className="text-[#64748b] mt-3" style={{ fontSize: "0.72rem" }}>
                  Score basé sur {result.checks.filter((c) => c.status !== "info").length} vérifications (les "info" ne comptent pas)
                </p>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Critique", count: result.checks.filter((c) => c.status === "fail").length, color: "#ef4444", icon: XCircle },
                  { label: "Alerte", count: result.checks.filter((c) => c.status === "warn").length, color: "#f59e0b", icon: AlertTriangle },
                  { label: "OK", count: result.checks.filter((c) => c.status === "pass").length, color: "#39ff14", icon: CheckCircle },
                  { label: "Info", count: result.checks.filter((c) => c.status === "info").length, color: "#00d4ff", icon: Info },
                ].map((s) => (
                  <div key={s.label} className="text-center p-3 rounded-lg" style={{ background: `${s.color}08`, border: `1px solid ${s.color}15` }}>
                    <s.icon className="w-4 h-4 mx-auto mb-1" style={{ color: s.color }} />
                    <div style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1.3rem", color: s.color }}>{s.count}</div>
                    <div className="text-[#64748b]" style={{ fontSize: "0.65rem" }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* IP / NS summary */}
              {(result.aRecords.length > 0 || result.nsRecords.length > 0) && (
                <div className="mt-4 pt-4 grid sm:grid-cols-2 gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  {result.aRecords.length > 0 && (
                    <div className="flex items-center gap-2 bg-[#0a0a0f] rounded-lg px-3 py-2">
                      <Network className="w-3.5 h-3.5 text-[#00d4ff]" />
                      <span className="text-[#64748b]" style={{ fontSize: "0.7rem" }}>IPv4:</span>
                      <span className="text-[#e2e8f0] font-mono" style={{ fontSize: "0.7rem" }}>{result.aRecords.slice(0, 2).join(", ")}</span>
                    </div>
                  )}
                  {result.nsRecords.length > 0 && (
                    <div className="flex items-center gap-2 bg-[#0a0a0f] rounded-lg px-3 py-2">
                      <Server className="w-3.5 h-3.5 text-[#ec4899]" />
                      <span className="text-[#64748b]" style={{ fontSize: "0.7rem" }}>NS:</span>
                      <span className="text-[#e2e8f0] font-mono" style={{ fontSize: "0.7rem" }}>{result.nsRecords.slice(0, 2).join(", ")}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div className="bg-[#111827] border border-[#f59e0b]/15 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowRecommendations(!showRecommendations)}
                  className="w-full p-4 flex items-center justify-between hover:bg-[#1e293b]/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-[#f59e0b]" />
                    <span className="text-[#e2e8f0]" style={{ fontSize: "0.9rem" }}>
                      Recommandations ({result.recommendations.length})
                    </span>
                  </div>
                  {showRecommendations ? <ChevronUp className="w-4 h-4 text-[#64748b]" /> : <ChevronDown className="w-4 h-4 text-[#64748b]" />}
                </button>
                <AnimatePresence>
                  {showRecommendations && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-4 pb-4 space-y-2">
                        {result.recommendations.map((rec, i) => (
                          <div key={i} className="flex items-start gap-2 bg-[#0a0a0f] rounded-lg p-3">
                            <span className="text-[#f59e0b] mt-0.5" style={{ fontSize: "0.7rem" }}>▸</span>
                            <p className="text-[#94a3b8]" style={{ fontSize: "0.8rem", lineHeight: 1.6 }}>{rec}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Checks */}
            <div className="space-y-3">
              {result.checks.map((check, i) => (
                <motion.div
                  key={check.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-[#111827] rounded-xl p-5"
                  style={{ border: `1px solid ${getStatusBorder(check.status)}` }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: getStatusBg(check.status) }}
                    >
                      {getStatusIcon(check.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#e2e8f0] mb-1">{check.name}</p>
                      <p className="font-mono text-[#00d4ff] bg-[#0a0a0f] rounded px-3 py-1.5 mb-2 break-all" style={{ fontSize: "0.75rem" }}>
                        {check.value}
                      </p>
                      <p className="text-[#94a3b8]" style={{ fontSize: "0.8rem" }}>{check.detail}</p>
                      {check.fix && (
                        <div className="mt-2 bg-[#0a0a0f] rounded-lg p-3 border-l-2" style={{ borderColor: check.status === "fail" ? "#ef4444" : "#f59e0b" }}>
                          <p className="text-[#e2e8f0]" style={{ fontSize: "0.78rem" }}>
                            <span style={{ color: check.status === "fail" ? "#ef4444" : "#f59e0b" }}>Correction : </span>
                            {check.fix}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Technical note */}
            <div className="bg-[#39ff14]/3 border border-[#39ff14]/10 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-[#39ff14] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[#39ff14]" style={{ fontSize: "0.85rem" }}>Résultats DNS réels</p>
                <p className="text-[#94a3b8]" style={{ fontSize: "0.75rem" }}>
                  Toutes les requêtes sont effectuées en temps réel via DNS-over-HTTPS (Google Public DNS).
                  {result.checks.length} vérifications effectuées. Aucune donnée simulée ou cachée.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}