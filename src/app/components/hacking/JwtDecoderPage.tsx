import { useState } from "react";
import { Key, AlertTriangle, CheckCircle, XCircle, Clock, Shield, Code, Lock, Eye, Cpu } from "lucide-react";
import { ToolPageLayout } from "./ToolPageLayout";
import type { GuiConfig } from "./zip-generator";

function decodeBase64Url(str: string): string {
  let s = str.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return atob(s);
}

interface JwtAnalysis {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  warnings: string[];
  info: string[];
}

function analyzeJwt(token: string): JwtAnalysis | null {
  const parts = token.trim().split(".");
  if (parts.length !== 3) return null;

  try {
    const header = JSON.parse(decodeBase64Url(parts[0]));
    const payload = JSON.parse(decodeBase64Url(parts[1]));
    const signature = parts[2];

    const warnings: string[] = [];
    const info: string[] = [];

    // Algorithm checks
    if (header.alg === "none") warnings.push("CRITIQUE: Algorithme 'none' — le token n'est pas signe, n'importe qui peut le forger.");
    if (header.alg === "HS256") warnings.push("HS256 utilise une cle secrete partagee. Preferez RS256/ES256 pour les architectures distribuees.");
    if (header.alg === "HS384") warnings.push("HS384 utilise une cle secrete partagee. Preferez RS384/ES384 pour les architectures distribuees.");
    if (header.alg === "HS512") warnings.push("HS512 utilise une cle secrete partagee. Preferez RS512/ES512 pour les architectures distribuees.");
    if (header.alg === "RS256") info.push("RS256: algorithme asymetrique recommande.");
    if (header.alg === "ES256") info.push("ES256: algorithme ECDSA performant et securise.");
    if (header.alg === "PS256") info.push("PS256: RSA-PSS, plus securise que RS256.");
    if (header.alg === "EdDSA") info.push("EdDSA: Edwards-curve, tres performant et securise.");

    // Header injection vectors
    if (header.jku) warnings.push(`CRITIQUE: Claim 'jku' present (${header.jku}). Un attaquant pourrait pointer vers son propre JWK Set URL pour forger des tokens.`);
    if (header.jwk) warnings.push("CRITIQUE: Claim 'jwk' embarque dans le header. La cle publique est dans le token — risque de key injection.");
    if (header.kid) {
      info.push(`Key ID (kid): ${header.kid}`);
      if (typeof header.kid === "string" && (header.kid.includes("..") || header.kid.includes("/") || header.kid.includes("'") || header.kid.includes("\""))) {
        warnings.push("CRITIQUE: kid contient des caracteres suspects (path traversal ou injection potentielle).");
      }
    }
    if (header.x5u) warnings.push("Claim 'x5u' present. URL de certificat X.509 — risque si non valide cote serveur.");
    if (header.x5c) warnings.push("Claim 'x5c' present. Chaine de certificats embarquee — verifiez que le serveur valide la chaine.");
    if (header.cty === "JWT") info.push("Token imbrique detecte (cty: JWT). Nested JWT — complexite accrue.");
    if (header.typ && header.typ !== "JWT") warnings.push(`Type inattendu: '${header.typ}' (attendu: 'JWT'). Verifiez la validation cote serveur.`);

    // Expiration
    if (payload.exp) {
      const expDate = new Date(payload.exp * 1000);
      if (expDate < new Date()) warnings.push(`Token expire depuis le ${expDate.toLocaleString("fr-FR")}`);
      else info.push(`Expire le ${expDate.toLocaleString("fr-FR")}`);

      if (payload.iat) {
        const lifetime = payload.exp - (payload.iat as number);
        if (lifetime > 86400 * 30) warnings.push(`Duree de vie tres longue: ${Math.round(lifetime / 86400)} jours. Preferez des tokens courts.`);
        else info.push(`Duree de vie: ${Math.round(lifetime / 3600)}h`);
      }
    } else {
      warnings.push("Pas de claim 'exp' — le token n'expire jamais. Risque de vol de session.");
    }

    // IAT
    if (payload.iat) info.push(`Emis le ${new Date((payload.iat as number) * 1000).toLocaleString("fr-FR")}`);

    // NBF
    if (payload.nbf) {
      const nbfDate = new Date((payload.nbf as number) * 1000);
      if (nbfDate > new Date()) info.push(`Pas valide avant le ${nbfDate.toLocaleString("fr-FR")}`);
    }

    // Issuer
    if (payload.iss) info.push(`Emetteur: ${payload.iss}`);
    if (payload.aud) info.push(`Audience: ${Array.isArray(payload.aud) ? payload.aud.join(", ") : payload.aud}`);
    if (payload.sub) info.push(`Sujet: ${payload.sub}`);

    // Sensitive data
    if (payload.password || payload.pwd || payload.secret) warnings.push("CRITIQUE: Le payload contient des donnees sensibles (password/secret) en clair!");
    if (payload.email) warnings.push("Le payload contient un email. Evitez de stocker des PII dans les JWT.");
    if (payload.phone || payload.phone_number) warnings.push("Le payload contient un numero de telephone. PII a eviter dans les JWT.");
    if (payload.address || payload.ssn || payload.date_of_birth) warnings.push("Le payload contient des donnees personnelles sensibles (adresse/SSN/date de naissance).");
    if (payload.credit_card || payload.cc || payload.card_number) warnings.push("CRITIQUE: Le payload contient des donnees de carte bancaire en clair!");
    if (payload.api_key || payload.apikey || payload.api_secret) warnings.push("CRITIQUE: Le payload contient une cle API. Les JWT sont decodables par quiconque!");
    if (payload.role === "admin" || payload.admin === true) warnings.push("Le token contient un role admin. Verifiez que le serveur valide bien la signature.");
    if (payload.scope) info.push(`Scopes: ${payload.scope}`);
    if (payload.permissions) info.push(`Permissions: ${Array.isArray(payload.permissions) ? payload.permissions.join(", ") : payload.permissions}`);

    // Token size analysis
    const tokenSize = token.trim().length;
    if (tokenSize > 4096) warnings.push(`Token tres volumineux (${tokenSize} chars). Risque de depassement des limites de headers HTTP (4096-8192 bytes).`);
    else if (tokenSize > 2048) info.push(`Token de taille importante (${tokenSize} chars). Surveillez la taille pour rester sous les limites de headers.`);

    if (!signature || signature.length < 10) warnings.push("Signature tres courte ou absente.");

    return { header, payload, signature, warnings, info };
  } catch {
    return null;
  }
}

function JwtDecoderTool() {
  const [token, setToken] = useState("");
  const [analysis, setAnalysis] = useState<JwtAnalysis | null>(null);
  const [error, setError] = useState("");

  const handleDecode = () => {
    setError("");
    const result = analyzeJwt(token);
    if (result) {
      setAnalysis(result);
    } else {
      setError("Token JWT invalide. Verifiez le format (3 parties separees par des points).");
      setAnalysis(null);
    }
  };

  return (
    <div>
      <textarea
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Collez votre token JWT ici (eyJhbGciOiJ...)"
        rows={4}
        className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#1e293b] rounded-lg text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#8b5cf6]/40 transition-colors mb-4 resize-none"
        style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem" }}
      />
      <button
        onClick={handleDecode}
        disabled={!token}
        className="px-6 py-3 rounded-lg transition-all flex items-center gap-2 disabled:opacity-40 mb-6"
        style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", color: "#fff", fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem" }}
      >
        <Key className="w-4 h-4" /> Decoder & Analyser
      </button>

      {error && (
        <div className="rounded-lg p-4 mb-4 flex items-start gap-3" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <XCircle className="w-4 h-4 text-[#ef4444] flex-shrink-0 mt-0.5" />
          <p className="text-[#ef4444]" style={{ fontSize: "0.82rem" }}>{error}</p>
        </div>
      )}

      {analysis && (
        <div className="space-y-4">
          {/* Warnings */}
          {analysis.warnings.length > 0 && (
            <div className="rounded-lg p-4 space-y-2" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)" }}>
              {analysis.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#f59e0b] flex-shrink-0 mt-0.5" />
                  <span className="text-[#f59e0b]" style={{ fontSize: "0.78rem" }}>{w}</span>
                </div>
              ))}
            </div>
          )}

          {/* Info */}
          {analysis.info.length > 0 && (
            <div className="rounded-lg p-4 space-y-2" style={{ background: "rgba(57,255,20,0.03)", border: "1px solid rgba(57,255,20,0.08)" }}>
              {analysis.info.map((info, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-[#39ff14] flex-shrink-0 mt-0.5" />
                  <span className="text-[#94a3b8]" style={{ fontSize: "0.78rem" }}>{info}</span>
                </div>
              ))}
            </div>
          )}

          {/* Header */}
          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(139,92,246,0.12)" }}>
            <div className="px-4 py-2 flex items-center gap-2" style={{ background: "rgba(139,92,246,0.08)", borderBottom: "1px solid rgba(139,92,246,0.1)" }}>
              <Code className="w-3.5 h-3.5 text-[#8b5cf6]" />
              <span className="text-[#8b5cf6]" style={{ fontSize: "0.78rem", fontFamily: "Orbitron, sans-serif" }}>Header</span>
            </div>
            <pre className="p-4 text-[#39ff14] overflow-x-auto" style={{ background: "rgba(10,10,15,0.8)", fontFamily: "JetBrains Mono, monospace", fontSize: "0.78rem", lineHeight: 1.6 }}>
              {JSON.stringify(analysis.header, null, 2)}
            </pre>
          </div>

          {/* Payload */}
          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(0,212,255,0.12)" }}>
            <div className="px-4 py-2 flex items-center gap-2" style={{ background: "rgba(0,212,255,0.08)", borderBottom: "1px solid rgba(0,212,255,0.1)" }}>
              <Code className="w-3.5 h-3.5 text-[#00d4ff]" />
              <span className="text-[#00d4ff]" style={{ fontSize: "0.78rem", fontFamily: "Orbitron, sans-serif" }}>Payload</span>
            </div>
            <pre className="p-4 text-[#00d4ff] overflow-x-auto" style={{ background: "rgba(10,10,15,0.8)", fontFamily: "JetBrains Mono, monospace", fontSize: "0.78rem", lineHeight: 1.6 }}>
              {JSON.stringify(analysis.payload, null, 2)}
            </pre>
          </div>

          {/* Signature */}
          <div className="rounded-lg p-4" style={{ background: "rgba(17,24,39,0.5)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-[#64748b] mb-1" style={{ fontSize: "0.72rem" }}>Signature (base64url)</p>
            <p className="text-[#94a3b8] break-all" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.72rem" }}>
              {analysis.signature}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

const PYTHON_SCRIPT = `#!/usr/bin/env python3
"""
JWT Decoder & Analyzer - CyberGuard
Decode et analyse la securite des tokens JWT. 100% offline, aucune API.

Usage:
    python jwt_decoder.py "eyJhbGciOiJ..."
    python jwt_decoder.py -f token.txt
    echo "eyJ..." | python jwt_decoder.py -
"""

import argparse
import base64
import json
import sys
from datetime import datetime

def decode_base64url(s):
    s = s.replace("-", "+").replace("_", "/")
    padding = 4 - len(s) % 4
    if padding != 4:
        s += "=" * padding
    return base64.b64decode(s)

def analyze_jwt(token):
    token = token.strip()
    parts = token.split(".")
    if len(parts) != 3:
        return {"error": "Format JWT invalide (3 parties attendues, {} trouvees)".format(len(parts))}

    try:
        header = json.loads(decode_base64url(parts[0]))
        payload = json.loads(decode_base64url(parts[1]))
    except Exception as e:
        return {"error": f"Decodage impossible: {e}"}

    warnings = []
    info = []

    # Algorithm
    alg = header.get("alg", "unknown")
    if alg == "none":
        warnings.append("CRITIQUE: Algorithme 'none' - token non signe, forgeable par quiconque")
    elif alg == "HS256":
        warnings.append("HS256 utilise une cle secrete partagee. Preferez RS256/ES256 pour les architectures distribuees")
    elif alg == "HS384":
        warnings.append("HS384 utilise une cle secrete partagee. Preferez RS384/ES384 pour les architectures distribuees")
    elif alg == "HS512":
        warnings.append("HS512 utilise une cle secrete partagee. Preferez RS512/ES512 pour les architectures distribuees")
    elif alg in ("RS256", "RS384", "RS512"):
        info.append(f"Algorithme asymetrique {alg} (recommande)")
    elif alg in ("ES256", "ES384", "ES512"):
        info.append(f"Algorithme ECDSA {alg} (performant et securise)")
    elif alg in ("PS256", "PS384", "PS512"):
        info.append(f"Algorithme RSA-PSS {alg} (plus securise que RS256)")
    elif alg in ("EdDSA"):
        info.append(f"Algorithme Edwards-curve {alg} (tres performant et securise)")

    # Header injection vectors
    if header.get("jku"):
        warnings.append(f"CRITIQUE: Claim 'jku' present ({header['jku']}). Un attaquant pourrait pointer vers son propre JWK Set URL pour forger des tokens.")
    if header.get("jwk"):
        warnings.append("CRITIQUE: Claim 'jwk' embarque dans le header. La cle publique est dans le token — risque de key injection.")
    if header.get("kid"):
        kid = header["kid"]
        info.append(f"Key ID (kid): {kid}")
        if isinstance(kid, str) and (kid.find("..") != -1 or kid.find("/") != -1 or kid.find("'") != -1 or kid.find("\"") != -1):
            warnings.append("CRITIQUE: kid contient des caracteres suspects (path traversal ou injection potentielle).")
    if header.get("x5u"):
        warnings.append("Claim 'x5u' present. URL de certificat X.509 — risque si non valide cote serveur.")
    if header.get("x5c"):
        warnings.append("Claim 'x5c' present. Chaine de certificats embarquee — verifiez que le serveur valide la chaine.")
    if header.get("cty") == "JWT":
        info.append("Token imbrique detecte (cty: JWT). Nested JWT — complexite accrue.")
    if header.get("typ") and header["typ"] != "JWT":
        warnings.append(f"Type inattendu: '{header['typ']}' (attendu: 'JWT'). Verifiez la validation cote serveur.")

    # Expiration
    if "exp" in payload:
        exp = datetime.utcfromtimestamp(payload["exp"])
        now = datetime.utcnow()
        if exp < now:
            warnings.append(f"Token EXPIRE depuis le {exp.strftime('%Y-%m-%d %H:%M:%S UTC')}")
        else:
            info.append(f"Expire le {exp.strftime('%Y-%m-%d %H:%M:%S UTC')}")

        if "iat" in payload:
            lifetime = payload["exp"] - payload["iat"]
            days = lifetime / 86400
            if days > 30:
                warnings.append(f"Duree de vie tres longue: {days:.0f} jours")
            else:
                info.append(f"Duree de vie: {lifetime/3600:.1f}h")
    else:
        warnings.append("Pas de claim 'exp' - le token n'expire jamais")

    if "iat" in payload:
        iat = datetime.utcfromtimestamp(payload["iat"])
        info.append(f"Emis le {iat.strftime('%Y-%m-%d %H:%M:%S UTC')}")

    if payload.get("iss"):
        info.append(f"Emetteur: {payload['iss']}")
    if payload.get("sub"):
        info.append(f"Sujet: {payload['sub']}")
    if payload.get("aud"):
        info.append(f"Audience: {payload['aud']}")

    # Sensitive data
    sensitive_keys = {"password", "pwd", "secret", "api_key", "apikey", "token", "credit_card"}
    found_sensitive = sensitive_keys & set(str(k).lower() for k in payload.keys())
    if found_sensitive:
        warnings.append(f"CRITIQUE: Donnees sensibles dans le payload: {', '.join(found_sensitive)}")

    pii_keys = {"email", "phone", "address", "ssn", "date_of_birth"}
    found_pii = pii_keys & set(str(k).lower() for k in payload.keys())
    if found_pii:
        warnings.append(f"PII detectees dans le payload: {', '.join(found_pii)}")

    if payload.get("role") == "admin" or payload.get("admin") is True:
        warnings.append("Token admin detecte. Verifiez la validation cote serveur")

    # Token size analysis
    token_size = len(token)
    if token_size > 4096:
        warnings.append(f"Token tres volumineux ({token_size} chars). Risque de depassement des limites de headers HTTP (4096-8192 bytes).")
    elif token_size > 2048:
        info.append(f"Token de taille importante ({token_size} chars). Surveillez la taille pour rester sous les limites de headers.")

    return {
        "header": header,
        "payload": payload,
        "signature": parts[2][:40] + "..." if len(parts[2]) > 40 else parts[2],
        "warnings": warnings,
        "info": info,
    }

def print_report(result):
    RED = "\\033[91m"
    GREEN = "\\033[92m"
    YELLOW = "\\033[93m"
    CYAN = "\\033[96m"
    PURPLE = "\\033[95m"
    RESET = "\\033[0m"

    if "error" in result:
        print(f"\\n  {RED}ERREUR: {result['error']}{RESET}")
        return

    print(f"\\n{'='*60}")
    print(f"  {PURPLE}=== HEADER ==={RESET}")
    print(json.dumps(result["header"], indent=4))

    print(f"\\n  {CYAN}=== PAYLOAD ==={RESET}")
    print(json.dumps(result["payload"], indent=4, default=str))

    print(f"\\n  Signature: {result['signature']}")

    if result["warnings"]:
        print(f"\\n  {RED}=== ALERTES ({len(result['warnings'])}) ==={RESET}")
        for w in result["warnings"]:
            print(f"  {YELLOW}[!] {w}{RESET}")

    if result["info"]:
        print(f"\\n  {GREEN}=== INFORMATIONS ==={RESET}")
        for i in result["info"]:
            print(f"  {GREEN}[+] {i}{RESET}")

    print(f"{'='*60}\\n")

def main():
    parser = argparse.ArgumentParser(description="JWT Decoder & Analyzer - CyberGuard")
    parser.add_argument("token", nargs="?", help="Token JWT a analyser (ou '-' pour stdin)")
    parser.add_argument("-f", "--file", help="Fichier contenant le token")
    parser.add_argument("-o", "--output", help="Sauvegarder en JSON")
    args = parser.parse_args()

    if args.file:
        with open(args.file) as f:
            token = f.read().strip()
    elif args.token == "-":
        token = sys.stdin.read().strip()
    elif args.token:
        token = args.token
    else:
        parser.print_help()
        sys.exit(1)

    result = analyze_jwt(token)
    print_report(result)

    if args.output:
        with open(args.output, "w") as f:
            json.dump(result, f, indent=2, default=str)
        print(f"  Rapport sauvegarde dans {args.output}")

if __name__ == "__main__":
    main()
`;

const README = `# JWT Decoder & Analyzer - CyberGuard

Decode et analyse la securite des tokens JWT. Detecte les vulnerabilites courantes.

## Installation
\`\`\`bash
# Aucune dependance - Python 3.7+ suffit
python jwt_decoder.py "eyJhbGciOiJIUzI1NiJ9..."
\`\`\`

## Analyses effectuees
- Algorithme (none, HS256, RS256, ES256...)
- Expiration et duree de vie
- Donnees sensibles dans le payload (PII, mots de passe)
- Claims standards (iss, sub, aud, iat, exp, nbf)
- Roles admin

## API requise
Aucune. 100% offline.
`;

const GUI_CONFIG: GuiConfig = {
  title: "JWT Decoder & Analyzer",
  inputType: "text",
  inputPlaceholder: "Collez votre token JWT ici (eyJhbGciOiJ...)",
  buttonText: "Decoder",
  importLine: "from jwt_decoder import analyze_jwt",
  processCode: `            return analyze_jwt(inp)`,
};

export function JwtDecoderPage() {
  return (
    <ToolPageLayout
      title="JWT Decoder"
      subtitle="& Analyzer"
      description="Decodez et analysez la securite de vos tokens JWT. Detection des algorithmes faibles, tokens expires, donnees sensibles et plus."
      toolSlug="jwt_decoder"
      icon={Key}
      color="#8b5cf6"
      hubAnchor="jwt-decoder"
      features={[
        { icon: Key, title: "Decodage complet", desc: "Header, payload et signature decodes et affiches en clair." },
        { icon: AlertTriangle, title: "Detection de failles", desc: "Algorithme 'none', HS256, tokens expires, duree de vie excessive." },
        { icon: Eye, title: "Detection PII", desc: "Alerte si le payload contient des emails, mots de passe ou donnees sensibles." },
        { icon: Shield, title: "100% offline", desc: "Tout est decode localement. Votre token ne quitte jamais votre machine." },
        { icon: Clock, title: "Analyse temporelle", desc: "Verification exp, iat, nbf avec calcul de la duree de vie." },
        { icon: Cpu, title: "Claims standards", desc: "Analyse iss, sub, aud, roles et permissions." },
      ]}
      requirements={["Python 3.7+", "Aucune dependance externe", "Fonctionne 100% offline", "Compatible Linux/Mac/Windows"]}
      pythonScript={PYTHON_SCRIPT}
      readmeContent={README}
      guiConfig={GUI_CONFIG}
    >
      <JwtDecoderTool />
    </ToolPageLayout>
  );
}

export { JwtDecoderTool };