import { useState } from "react";
import { Globe, Search, CheckCircle, XCircle, AlertTriangle, Shield, Server, Loader2, Info } from "lucide-react";
import { motion } from "motion/react";

interface DNSCheck {
  name: string;
  status: "pass" | "fail" | "warn" | "info";
  value: string;
  detail: string;
}

interface DNSResult {
  domain: string;
  checks: DNSCheck[];
  overallScore: number;
}

// ─── Real DNS-over-HTTPS queries via Google Public DNS ──────────────────

async function queryDNS(name: string, type: string): Promise<any> {
  try {
    const res = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
      { headers: { accept: "application/json" } }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function checkSPF(domain: string): Promise<DNSCheck> {
  const data = await queryDNS(domain, "TXT");
  const answers = data?.Answer || [];
  const txtRecords: string[] = answers
    .filter((a: any) => a.type === 16)
    .map((a: any) => a.data?.replace(/^"|"$/g, "") || "");

  const spfRecord = txtRecords.find((r) => r.toLowerCase().startsWith("v=spf1"));

  if (spfRecord) {
    const hasAll = spfRecord.includes("-all") || spfRecord.includes("~all");
    return {
      name: "SPF (Sender Policy Framework)",
      status: hasAll ? "pass" : "warn",
      value: spfRecord,
      detail: hasAll
        ? "Enregistrement SPF valide detecte. Les serveurs autorises a envoyer des emails sont declares."
        : "Enregistrement SPF detecte mais la politique n'est pas stricte. Ajoutez '-all' ou '~all' pour renforcer.",
    };
  }

  return {
    name: "SPF (Sender Policy Framework)",
    status: "fail",
    value: "Aucun enregistrement SPF detecte",
    detail: "Aucun enregistrement SPF n'a ete trouve. Les emails de votre domaine pourraient etre usurpes (spoofing). Ajoutez un enregistrement TXT commencant par 'v=spf1'.",
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
        detail: "Politique DMARC stricte en mode 'reject'. Les emails non authentifies sont rejetes.",
      };
    } else if (policyValue === "quarantine") {
      return {
        name: "DMARC (Domain-based Message Authentication)",
        status: "pass",
        value: dmarcRecord,
        detail: "Politique DMARC en mode 'quarantine'. Les emails non authentifies sont mis en quarantaine.",
      };
    } else {
      return {
        name: "DMARC (Domain-based Message Authentication)",
        status: "warn",
        value: dmarcRecord,
        detail: "DMARC est configure mais en mode 'none' (monitoring uniquement). Passez a 'quarantine' ou 'reject' pour proteger contre le spoofing.",
      };
    }
  }

  return {
    name: "DMARC (Domain-based Message Authentication)",
    status: "fail",
    value: "Aucune politique DMARC detectee",
    detail: "Aucun enregistrement DMARC detecte sur _dmarc." + domain + ". Votre domaine est vulnerable au spoofing d'email.",
  };
}

async function checkDKIM(domain: string): Promise<DNSCheck> {
  // Try common DKIM selectors
  const selectors = ["default", "google", "selector1", "selector2", "dkim", "mail", "k1", "s1", "s2"];
  const found: string[] = [];

  for (const sel of selectors) {
    const data = await queryDNS(`${sel}._domainkey.${domain}`, "TXT");
    const answers = data?.Answer || [];
    const txt = answers
      .filter((a: any) => a.type === 16 || a.type === 5) // TXT or CNAME
      .map((a: any) => a.data?.replace(/^"|"$/g, "") || "");

    if (txt.length > 0 && txt.some((t: string) => t.includes("v=DKIM1") || t.includes("_domainkey") || t.length > 20)) {
      found.push(sel);
      break; // Found one, that's enough to confirm DKIM
    }
  }

  if (found.length > 0) {
    return {
      name: "DKIM (DomainKeys Identified Mail)",
      status: "pass",
      value: `DKIM detecte (selecteur: ${found[0]})`,
      detail: `Un enregistrement DKIM a ete trouve avec le selecteur '${found[0]}'. L'authenticite des emails sortants est verifiable.`,
    };
  }

  return {
    name: "DKIM (DomainKeys Identified Mail)",
    status: "info",
    value: "Aucun DKIM detecte avec les selecteurs communs",
    detail: "Aucun enregistrement DKIM n'a ete trouve avec les selecteurs standards (default, google, selector1/2, dkim, mail, k1, s1, s2). Le DKIM peut etre configure avec un selecteur personnalise non testable depuis l'exterieur.",
  };
}

async function checkDNSSEC(domain: string): Promise<DNSCheck> {
  // Query with DNSSEC checking via Google DNS
  // The AD (Authenticated Data) flag indicates DNSSEC validation
  const data = await queryDNS(domain, "A");

  if (data?.AD === true) {
    return {
      name: "DNSSEC",
      status: "pass",
      value: "DNSSEC active et valide",
      detail: "DNSSEC est active. Les reponses DNS sont signees cryptographiquement et protegees contre le spoofing DNS.",
    };
  }

  // Also check for DS records
  const dsData = await queryDNS(domain, "DS");
  const hasDS = dsData?.Answer && dsData.Answer.length > 0;

  if (hasDS) {
    return {
      name: "DNSSEC",
      status: "pass",
      value: "DNSSEC active (DS records presents)",
      detail: "Des enregistrements DS ont ete trouves, indiquant que DNSSEC est deploye pour ce domaine.",
    };
  }

  return {
    name: "DNSSEC",
    status: "warn",
    value: "DNSSEC non detecte",
    detail: "DNSSEC ne semble pas etre active. Les reponses DNS pourraient etre falsifiees (DNS spoofing, cache poisoning). Contactez votre registrar pour l'activer.",
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
      detail: `${mxRecords.length} enregistrement(s) MX detecte(s) pour la reception d'emails.`,
    };
  }

  return {
    name: "Enregistrements MX",
    status: "info",
    value: "Aucun enregistrement MX",
    detail: "Aucun enregistrement MX n'a ete trouve. Ce domaine ne recoit peut-etre pas d'emails, ou utilise un service externe.",
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
      value: caaRecords.slice(0, 2).join(", "),
      detail: "Des enregistrements CAA restreignent les autorites de certification autorisees a emettre des certificats pour votre domaine.",
    };
  }

  return {
    name: "CAA (Certificate Authority Authorization)",
    status: "warn",
    value: "Aucun enregistrement CAA",
    detail: "Aucun enregistrement CAA detecte. N'importe quelle autorite de certification pourrait emettre un certificat pour votre domaine. Recommandation : ajoutez un enregistrement CAA.",
  };
}

async function checkHTTPS(domain: string): Promise<{ ssl: DNSCheck; hsts: DNSCheck }> {
  let sslCheck: DNSCheck;
  let hstsCheck: DNSCheck;

  try {
    // Use a public HTTPS check - attempt to fetch the domain
    // We can check if the site responds on HTTPS
    const res = await fetch(`https://${domain}`, {
      method: "HEAD",
      mode: "no-cors",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    sslCheck = {
      name: "Certificat SSL/TLS",
      status: "pass",
      value: "HTTPS accessible",
      detail: "Le domaine repond sur HTTPS. Le certificat SSL/TLS est actif. Pour un audit detaille du certificat, utilisez un outil specialise comme SSL Labs.",
    };
  } catch {
    sslCheck = {
      name: "Certificat SSL/TLS",
      status: "warn",
      value: "Verification HTTPS non concluante",
      detail: "Impossible de verifier HTTPS depuis le navigateur (CORS/politique de securite). Pour un audit detaille, utilisez SSL Labs ou notre futur SSL Checker.",
    };
  }

  // HSTS cannot be checked from browser due to CORS, be honest about it
  hstsCheck = {
    name: "HSTS (HTTP Strict Transport Security)",
    status: "info",
    value: "Non verifiable depuis le navigateur",
    detail: "Le header HSTS ne peut pas etre lu depuis une requete cross-origin (politique CORS). Pour verifier HSTS, utilisez curl ou un outil serveur : curl -sI https://" + domain + " | grep strict",
  };

  return { ssl: sslCheck, hsts: hstsCheck };
}

// ─── Main check orchestrator ─────────────────────────────────────────────

async function performDNSCheck(domain: string): Promise<DNSResult> {
  const clean = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "").toLowerCase();

  // Run all checks in parallel where possible
  const [spf, dmarc, dkim, dnssec, mx, caa, httpsResult] = await Promise.all([
    checkSPF(clean),
    checkDMARC(clean),
    checkDKIM(clean),
    checkDNSSEC(clean),
    checkMX(clean),
    checkCAA(clean),
    checkHTTPS(clean),
  ]);

  const checks = [spf, dkim, dmarc, dnssec, httpsResult.ssl, httpsResult.hsts, mx, caa];

  // Score: only count pass/fail/warn (not info)
  const scorableChecks = checks.filter((c) => c.status !== "info");
  const passCount = scorableChecks.filter((c) => c.status === "pass").length;
  const overallScore = scorableChecks.length > 0 ? Math.round((passCount / scorableChecks.length) * 100) : 0;

  return { domain: clean, checks, overallScore };
}

// ─── Component ────────────────────────────────────────────────────────────

export function DNSChecker() {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<DNSResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const handleCheck = async () => {
    if (!domain.trim()) return;
    setChecking(true);
    setResult(null);
    setError("");

    try {
      const res = await performDNSCheck(domain.trim());
      setResult(res);
    } catch (err) {
      setError("Erreur lors de la verification DNS. Verifiez le nom de domaine et reessayez.");
    } finally {
      setChecking(false);
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

  return (
    <div className="min-h-screen py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6" style={{ background: "rgba(236,72,153,0.06)", border: "1px solid rgba(236,72,153,0.12)" }}>
            <Globe className="w-3.5 h-3.5 text-[#ec4899]" />
            <span className="text-[#ec4899]" style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace" }}>DNS-over-HTTPS — Requetes reelles</span>
          </div>
          <h1 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.8rem, 3vw, 2.2rem)" }} className="text-[#e2e8f0] mb-4">
            DNS{" "}
            <span style={{ background: "linear-gradient(135deg, #ec4899, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Security Check</span>
          </h1>
          <p className="text-[#94a3b8] max-w-xl mx-auto" style={{ lineHeight: 1.7 }}>
            Verifiez la configuration DNS reelle de votre domaine via DNS-over-HTTPS (Google Public DNS).
            SPF, DKIM, DMARC, DNSSEC, MX, CAA et plus.
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
              {checking ? "Verification..." : "Verifier DNS"}
            </button>
          </div>

          {/* Info note about real queries */}
          <div className="mt-3 flex items-start gap-2 text-[#64748b]" style={{ fontSize: "0.72rem" }}>
            <Shield className="w-3.5 h-3.5 text-[#ec4899] flex-shrink-0 mt-0.5" />
            <span>
              Requetes DNS reelles via dns.google (DoH). Les resultats refletent la configuration DNS actuelle de votre domaine.
              DKIM est teste avec les selecteurs communs (default, google, selector1/2, etc.).
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
              Interrogation des serveurs DNS...
            </p>
            <p className="text-[#64748b]" style={{ fontSize: "0.75rem" }}>
              Requetes DNS-over-HTTPS en cours (SPF, DKIM, DMARC, DNSSEC, MX, CAA, SSL)
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
            <p className="text-[#ef4444]" style={{ fontSize: "0.85rem" }}>{error}</p>
          </motion.div>
        )}

        {/* Results */}
        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Score */}
            <div className="bg-[#111827] border border-[#ec4899]/20 rounded-xl p-8 mb-6 text-center">
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
                Score base sur les verifications DNS reelles (les elements "info" ne comptent pas dans le score)
              </p>
            </div>

            {/* Checks */}
            <div className="space-y-3">
              {result.checks.map((check, i) => (
                <motion.div
                  key={check.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-[#111827] border border-[#00d4ff]/10 rounded-xl p-5"
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
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
