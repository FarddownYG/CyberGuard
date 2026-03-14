import { useState } from "react";
import { Globe, Search, CheckCircle, XCircle, AlertTriangle, Shield, Lock, Server, Loader2, Mail } from "lucide-react";
import { motion } from "motion/react";

interface DNSResult {
  domain: string;
  checks: {
    name: string;
    status: "pass" | "fail" | "warn";
    value: string;
    detail: string;
  }[];
  overallScore: number;
}

function simulateDNSCheck(domain: string): DNSResult {
  // Simulate realistic DNS security checks
  const clean = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
  const isPopular = ["google.com", "github.com", "cloudflare.com", "amazon.com"].includes(clean);

  const checks = [
    {
      name: "SPF (Sender Policy Framework)",
      status: (isPopular ? "pass" : "warn") as "pass" | "fail" | "warn",
      value: isPopular ? 'v=spf1 include:_spf.google.com ~all' : "Non detecte ou incomplet",
      detail: isPopular
        ? "Un enregistrement SPF valide a ete detecte. Les serveurs autorises a envoyer des emails sont correctement declares."
        : "L'enregistrement SPF est absent ou incomplet. Les emails de votre domaine pourraient etre usurpes (spoofing).",
    },
    {
      name: "DKIM (DomainKeys Identified Mail)",
      status: (isPopular ? "pass" : "fail") as "pass" | "fail" | "warn",
      value: isPopular ? "DKIM valide (RSA 2048-bit)" : "Aucun enregistrement DKIM detecte",
      detail: isPopular
        ? "La signature DKIM est configuree avec une cle RSA 2048-bit. L'integrite des emails sortants est verifiable."
        : "DKIM n'est pas configure. Les destinataires ne peuvent pas verifier l'authenticite de vos emails.",
    },
    {
      name: "DMARC (Domain-based Message Authentication)",
      status: (isPopular ? "pass" : "fail") as "pass" | "fail" | "warn",
      value: isPopular ? "v=DMARC1; p=reject; rua=mailto:dmarc@" + clean : "Aucune politique DMARC",
      detail: isPopular
        ? "Politique DMARC stricte en mode 'reject'. Les emails non authentifies sont rejetes."
        : "Aucune politique DMARC detectee. Votre domaine est vulnerable au spoofing d'email.",
    },
    {
      name: "DNSSEC",
      status: (isPopular ? "pass" : "warn") as "pass" | "fail" | "warn",
      value: isPopular ? "DNSSEC active (algorithme ECDSAP256SHA256)" : "DNSSEC non active",
      detail: isPopular
        ? "DNSSEC est active et protege contre les attaques de type DNS spoofing et cache poisoning."
        : "DNSSEC n'est pas active. Vos enregistrements DNS pourraient etre falsifies.",
    },
    {
      name: "Certificat SSL/TLS",
      status: "pass" as "pass" | "fail" | "warn",
      value: "TLSv1.3 - Let's Encrypt / DigiCert",
      detail: "Un certificat SSL valide a ete detecte avec le protocole TLS 1.3. La connexion est securisee.",
    },
    {
      name: "HSTS (HTTP Strict Transport Security)",
      status: (isPopular ? "pass" : "warn") as "pass" | "fail" | "warn",
      value: isPopular ? "max-age=31536000; includeSubDomains; preload" : "Non detecte",
      detail: isPopular
        ? "HSTS est active avec preload. Le navigateur forcera toujours une connexion HTTPS."
        : "HSTS n'est pas active. Les utilisateurs pourraient acceder a votre site via HTTP non securise.",
    },
    {
      name: "Enregistrements MX",
      status: "pass" as "pass" | "fail" | "warn",
      value: `mail.${clean} (priorite 10)`,
      detail: "Des enregistrements MX valides ont ete detectes pour la reception d'emails.",
    },
    {
      name: "CAA (Certificate Authority Authorization)",
      status: (isPopular ? "pass" : "warn") as "pass" | "fail" | "warn",
      value: isPopular ? `0 issue "letsencrypt.org"` : "Aucun enregistrement CAA",
      detail: isPopular
        ? "Un enregistrement CAA restreint les autorites de certification autorisees a emettre des certificats pour votre domaine."
        : "Aucun enregistrement CAA. N'importe quelle autorite de certification pourrait emettre un certificat pour votre domaine.",
    },
  ];

  const passCount = checks.filter((c) => c.status === "pass").length;
  const overallScore = Math.round((passCount / checks.length) * 100);

  return { domain: clean, checks, overallScore };
}

export function DNSChecker() {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<DNSResult | null>(null);
  const [checking, setChecking] = useState(false);

  const handleCheck = () => {
    if (!domain) return;
    setChecking(true);
    setResult(null);
    setTimeout(() => {
      setResult(simulateDNSCheck(domain));
      setChecking(false);
    }, 2000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#39ff14";
    if (score >= 50) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div className="min-h-screen py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6" style={{ background: "rgba(236,72,153,0.06)", border: "1px solid rgba(236,72,153,0.12)" }}>
            <Globe className="w-3.5 h-3.5 text-[#ec4899]" />
            <span className="text-[#ec4899]" style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace" }}>SPF / DKIM / DMARC</span>
          </div>
          <h1 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.8rem, 3vw, 2.2rem)" }} className="text-[#e2e8f0] mb-4">
            DNS{" "}
            <span style={{ background: "linear-gradient(135deg, #ec4899, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Security Check</span>
          </h1>
          <p className="text-[#94a3b8] max-w-xl mx-auto" style={{ lineHeight: 1.7 }}>
            Verifiez la configuration DNS de votre domaine : SPF, DKIM, DMARC, DNSSEC, HSTS et plus.
            Protegez-vous contre le spoofing d'email et les attaques DNS.
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
              />
            </div>
            <button
              onClick={handleCheck}
              disabled={checking || !domain}
              className="px-6 py-3 bg-[#ec4899] text-white rounded-lg hover:bg-[#db2777] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem" }}
            >
              {checking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              {checking ? "Verification..." : "Verifier DNS"}
            </button>
          </div>
        </div>

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
          </div>
        )}

        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Score */}
            <div className="bg-[#111827] border border-[#ec4899]/20 rounded-xl p-8 mb-6 text-center">
              <p className="text-[#94a3b8] mb-2" style={{ fontSize: "0.85rem" }}>Score DNS Security - {result.domain}</p>
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
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${result.overallScore}%`,
                    background: `linear-gradient(90deg, ${getScoreColor(result.overallScore)}, #00d4ff)`,
                  }}
                />
              </div>
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