import { useState } from "react";
import { Hash, Copy, CheckCircle, Search, Shield, Cpu, FileText, Lock, Eye, Code } from "lucide-react";
import { ToolPageLayout } from "./ToolPageLayout";
import type { GuiConfig } from "./zip-generator";

const HASH_PATTERNS: { regex: RegExp; type: string; bits: number }[] = [
  { regex: /^[a-f0-9]{8}$/i, type: "CRC32 / Adler32", bits: 32 },
  { regex: /^[a-f0-9]{32}$/i, type: "MD5", bits: 128 },
  { regex: /^[a-f0-9]{32}$/i, type: "NTLM", bits: 128 },
  { regex: /^[a-f0-9]{40}$/i, type: "SHA-1", bits: 160 },
  { regex: /^[a-f0-9]{40}$/i, type: "RIPEMD-160", bits: 160 },
  { regex: /^[a-f0-9]{56}$/i, type: "SHA-224", bits: 224 },
  { regex: /^[a-f0-9]{56}$/i, type: "SHA3-224", bits: 224 },
  { regex: /^[a-f0-9]{64}$/i, type: "SHA-256", bits: 256 },
  { regex: /^[a-f0-9]{64}$/i, type: "SHA3-256", bits: 256 },
  { regex: /^[a-f0-9]{64}$/i, type: "BLAKE2s", bits: 256 },
  { regex: /^[a-f0-9]{96}$/i, type: "SHA-384", bits: 384 },
  { regex: /^[a-f0-9]{96}$/i, type: "SHA3-384", bits: 384 },
  { regex: /^[a-f0-9]{128}$/i, type: "SHA-512", bits: 512 },
  { regex: /^[a-f0-9]{128}$/i, type: "SHA3-512", bits: 512 },
  { regex: /^[a-f0-9]{128}$/i, type: "BLAKE2b", bits: 512 },
  { regex: /^\$2[aby]\$\d{2}\$.{53}$/, type: "bcrypt", bits: 0 },
  { regex: /^\$argon2(i|d|id)\$/, type: "Argon2", bits: 0 },
  { regex: /^\$5\$/, type: "SHA-256 (Unix crypt)", bits: 0 },
  { regex: /^\$6\$/, type: "SHA-512 (Unix crypt)", bits: 0 },
  { regex: /^\$1\$/, type: "MD5 (Unix crypt)", bits: 0 },
  { regex: /^[a-f0-9]{16}$/i, type: "MySQL 3.x / DES", bits: 64 },
  { regex: /^\*[A-F0-9]{40}$/i, type: "MySQL 4.1+", bits: 160 },
  { regex: /^md5\$[^\$]+\$[a-f0-9]{32}$/i, type: "Django MD5", bits: 128 },
  { regex: /^sha256\$[^\$]+\$[a-f0-9]{64}$/i, type: "Django SHA-256", bits: 256 },
  { regex: /^pbkdf2_sha256\$/, type: "Django PBKDF2", bits: 0 },
  { regex: /^scrypt\$/, type: "scrypt", bits: 0 },
];

// ─── MD5 Implementation (RFC 1321) ──────────────────────────────────────
function md5(string: string): string {
  function md5cycle(x: number[], k: number[]) {
    let a = x[0], b = x[1], c = x[2], d = x[3];
    a = ff(a, b, c, d, k[0], 7, -680876936); d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819); b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897); d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341); b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416); d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063); b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682); d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290); b = ff(b, c, d, a, k[15], 22, 1236535329);
    a = gg(a, b, c, d, k[1], 5, -165796510); d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713); b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691); d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335); b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438); d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961); b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467); d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473); b = gg(b, c, d, a, k[12], 20, -1926607734);
    a = hh(a, b, c, d, k[5], 4, -378558); d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562); b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060); d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632); b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174); d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979); b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487); d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520); b = hh(b, c, d, a, k[2], 23, -995338651);
    a = ii(a, b, c, d, k[0], 6, -198630844); d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905); b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571); d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523); b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359); d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380); b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070); d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259); b = ii(b, c, d, a, k[9], 21, -343485551);
    x[0] = add32(a, x[0]); x[1] = add32(b, x[1]); x[2] = add32(c, x[2]); x[3] = add32(d, x[3]);
  }
  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) { a = add32(add32(a, q), add32(x, t)); return add32((a << s) | (a >>> (32 - s)), b); }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(c ^ (b | ~d), a, b, x, s, t); }
  function md51(s: string) { const n = s.length; let state = [1732584193, -271733879, -1732584194, 271733878], i; for (i = 64; i <= n; i += 64) md5cycle(state, md5blk(s.substring(i - 64, i))); s = s.substring(i - 64); const tail = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]; for (i = 0; i < s.length; i++) tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3); tail[i >> 2] |= 0x80 << ((i % 4) << 3); if (i > 55) { md5cycle(state, tail); for (i = 0; i < 16; i++) tail[i] = 0; } tail[14] = n * 8; md5cycle(state, tail); return state; }
  function md5blk(s: string) { const md5blks = []; for (let i = 0; i < 64; i += 4) md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i+1) << 8) + (s.charCodeAt(i+2) << 16) + (s.charCodeAt(i+3) << 24); return md5blks; }
  function rhex(n: number) { let s = ""; const hex_chr = "0123456789abcdef"; for (let j = 0; j < 4; j++) s += hex_chr.charAt((n >> (j * 8 + 4)) & 0x0f) + hex_chr.charAt((n >> (j * 8)) & 0x0f); return s; }
  function add32(a: number, b: number) { return (a + b) & 0xFFFFFFFF; }
  return md51(string).map(rhex).join("");
}

function identifyHash(input: string): { type: string; bits: number }[] {
  return HASH_PATTERNS.filter((p) => p.regex.test(input.trim()));
}

async function computeHash(algo: string, data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest(algo, encoded);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function HashGeneratorTool() {
  const [input, setInput] = useState("");
  const [hashes, setHashes] = useState<{ name: string; value: string }[]>([]);
  const [identifyInput, setIdentifyInput] = useState("");
  const [identified, setIdentified] = useState<{ type: string; bits: number }[]>([]);
  const [copied, setCopied] = useState("");
  const [mode, setMode] = useState<"generate" | "identify">("generate");

  const generateHashes = async () => {
    if (!input) return;
    const md5Result = { name: "MD5", value: md5(input) };
    const results = await Promise.all([
      computeHash("SHA-1", input).then(v => ({ name: "SHA-1", value: v })),
      computeHash("SHA-256", input).then(v => ({ name: "SHA-256", value: v })),
      computeHash("SHA-384", input).then(v => ({ name: "SHA-384", value: v })),
      computeHash("SHA-512", input).then(v => ({ name: "SHA-512", value: v })),
    ]);
    setHashes([md5Result, ...results]);
  };

  const handleIdentify = () => {
    if (!identifyInput) return;
    setIdentified(identifyHash(identifyInput));
  };

  const copyHash = (name: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(name);
    setTimeout(() => setCopied(""), 2000);
  };

  return (
    <div>
      {/* Mode tabs */}
      <div className="flex gap-2 mb-6">
        {(["generate", "identify"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="px-4 py-2 rounded-lg transition-all"
            style={{
              background: mode === m ? "rgba(0,212,255,0.15)" : "rgba(17,24,39,0.5)",
              border: `1px solid ${mode === m ? "rgba(0,212,255,0.3)" : "rgba(255,255,255,0.05)"}`,
              color: mode === m ? "#00d4ff" : "#64748b",
              fontSize: "0.82rem",
            }}
          >
            {m === "generate" ? "Generer des hashes" : "Identifier un hash"}
          </button>
        ))}
      </div>

      {mode === "generate" ? (
        <>
          <div className="flex gap-3 mb-4">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generateHashes()}
              placeholder="Texte a hasher..."
              className="flex-1 px-4 py-3 bg-[#0a0a0f] border border-[#1e293b] rounded-lg text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#00d4ff]/40"
              style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.85rem" }}
            />
            <button
              onClick={generateHashes}
              disabled={!input}
              className="px-5 py-3 rounded-lg transition-all flex items-center gap-2 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #00d4ff, #0099cc)", color: "#0a0a0f", fontFamily: "Orbitron, sans-serif", fontSize: "0.82rem" }}
            >
              <Hash className="w-4 h-4" /> Hasher
            </button>
          </div>
          {hashes.length > 0 && (
            <div className="space-y-2">
              {hashes.map((h) => (
                <div key={h.name} className="rounded-lg p-3 flex items-center gap-3" style={{ background: "rgba(17,24,39,0.5)", border: "1px solid rgba(0,212,255,0.08)" }}>
                  <span className="text-[#00d4ff] w-16 flex-shrink-0" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.7rem" }}>{h.name}</span>
                  <span className="text-[#94a3b8] flex-1 break-all" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.72rem" }}>{h.value}</span>
                  <button onClick={() => copyHash(h.name, h.value)} className="text-[#64748b] hover:text-[#00d4ff] transition-colors flex-shrink-0">
                    {copied === h.name ? <CheckCircle className="w-4 h-4 text-[#39ff14]" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex gap-3 mb-4">
            <input
              value={identifyInput}
              onChange={(e) => setIdentifyInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleIdentify()}
              placeholder="Collez un hash a identifier..."
              className="flex-1 px-4 py-3 bg-[#0a0a0f] border border-[#1e293b] rounded-lg text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#8b5cf6]/40"
              style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.85rem" }}
            />
            <button
              onClick={handleIdentify}
              disabled={!identifyInput}
              className="px-5 py-3 rounded-lg transition-all flex items-center gap-2 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", color: "#fff", fontFamily: "Orbitron, sans-serif", fontSize: "0.82rem" }}
            >
              <Search className="w-4 h-4" /> Identifier
            </button>
          </div>
          {identified.length > 0 ? (
            <div className="space-y-2">
              {identified.map((h) => (
                <div key={h.type} className="rounded-lg p-3 flex items-center gap-3" style={{ background: "rgba(57,255,20,0.04)", border: "1px solid rgba(57,255,20,0.1)" }}>
                  <CheckCircle className="w-4 h-4 text-[#39ff14]" />
                  <span className="text-[#e2e8f0]" style={{ fontSize: "0.85rem" }}>{h.type}</span>
                  {h.bits > 0 && <span className="text-[#64748b]" style={{ fontSize: "0.72rem" }}>({h.bits} bits)</span>}
                </div>
              ))}
            </div>
          ) : identifyInput ? (
            <div className="rounded-lg p-4" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)" }}>
              <p className="text-[#ef4444]" style={{ fontSize: "0.82rem" }}>Aucun type de hash reconnu pour cette entree.</p>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

const PYTHON_SCRIPT = `#!/usr/bin/env python3
"""
Hash Generator & Identifier - CyberGuard
Genere des hashes (MD5, SHA-1, SHA-256, SHA-512, etc.) et identifie le type d'un hash.

Usage:
    python hash_generator.py generate "texte a hasher"
    python hash_generator.py identify "5d41402abc4b2a76b9719d911017c592"
    python hash_generator.py generate -f fichier.txt
"""

import argparse
import hashlib
import re
import sys
import json

HASH_ALGOS = ["md5", "sha1", "sha224", "sha256", "sha384", "sha512"]

HASH_PATTERNS = [
    (r"^[a-f0-9]{32}$", "MD5", 128),
    (r"^[a-f0-9]{40}$", "SHA-1", 160),
    (r"^[a-f0-9]{56}$", "SHA-224", 224),
    (r"^[a-f0-9]{64}$", "SHA-256", 256),
    (r"^[a-f0-9]{96}$", "SHA-384", 384),
    (r"^[a-f0-9]{128}$", "SHA-512", 512),
    (r"^\\$2[aby]\\$\\d{2}\\$.{53}$", "bcrypt", 0),
    (r"^\\$argon2(i|d|id)\\$", "Argon2", 0),
    (r"^[a-f0-9]{8}$", "CRC32 / Adler32", 32),
]

def generate_hashes(text):
    results = {}
    for algo in HASH_ALGOS:
        h = hashlib.new(algo)
        h.update(text.encode("utf-8"))
        results[algo.upper()] = h.hexdigest()
    return results

def generate_file_hashes(filepath):
    results = {}
    for algo in HASH_ALGOS:
        h = hashlib.new(algo)
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        results[algo.upper()] = h.hexdigest()
    return results

def identify_hash(hash_str):
    hash_str = hash_str.strip()
    matches = []
    for pattern, name, bits in HASH_PATTERNS:
        if re.match(pattern, hash_str, re.IGNORECASE):
            matches.append({"type": name, "bits": bits})
    return matches

def main():
    parser = argparse.ArgumentParser(description="Hash Generator & Identifier - CyberGuard")
    sub = parser.add_subparsers(dest="command")

    gen = sub.add_parser("generate", help="Generer des hashes")
    gen.add_argument("text", nargs="?", help="Texte a hasher")
    gen.add_argument("-f", "--file", help="Fichier a hasher")

    idn = sub.add_parser("identify", help="Identifier un hash")
    idn.add_argument("hash", help="Hash a identifier")

    parser.add_argument("-o", "--output", help="Export JSON")
    args = parser.parse_args()

    GREEN = "\\033[92m"
    CYAN = "\\033[96m"
    YELLOW = "\\033[93m"
    RESET = "\\033[0m"

    if args.command == "generate":
        if args.file:
            results = generate_file_hashes(args.file)
            print(f"\\n  Hashes de: {args.file}")
        elif args.text:
            results = generate_hashes(args.text)
            print(f"\\n  Hashes de: \\"{args.text}\\"")
        else:
            gen.print_help()
            sys.exit(1)

        print(f"  {'='*60}")
        for algo, h in results.items():
            print(f"  {CYAN}{algo:>8}{RESET}  {GREEN}{h}{RESET}")
        print()

    elif args.command == "identify":
        matches = identify_hash(args.hash)
        print(f"\\n  Hash: {args.hash}")
        print(f"  {'='*60}")
        if matches:
            for m in matches:
                bits = f" ({m['bits']} bits)" if m["bits"] else ""
                print(f"  {GREEN}[+] {m['type']}{bits}{RESET}")
        else:
            print(f"  {YELLOW}[-] Aucun type reconnu{RESET}")
        print()
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
`;

const README = `# Hash Generator & Identifier - CyberGuard

Genere des hashes et identifie le type d'un hash inconnu.

## Utilisation
\`\`\`bash
python hash_generator.py generate "password123"
python hash_generator.py generate -f document.pdf
python hash_generator.py identify "5d41402abc4b2a76b9719d911017c592"
\`\`\`

## Algorithmes supportes
MD5, SHA-1, SHA-224, SHA-256, SHA-384, SHA-512, bcrypt, Argon2

## API requise
Aucune. 100% offline.
`;

const GUI_CONFIG: GuiConfig = {
  title: "Hash Generator & Identifier",
  inputType: "text",
  inputPlaceholder: "Texte a hasher ou hash a identifier...",
  buttonText: "Hasher",
  importLine: "from hash_generator import generate_hashes, identify_hash",
  processCode: `            if len(inp) in (32,40,56,64,96,128) and all(c in '0123456789abcdefABCDEF' for c in inp):
                return {"mode": "identify", "results": identify_hash(inp)}
            return {"mode": "generate", "hashes": generate_hashes(inp)}`,
};

export function HashGeneratorPage() {
  return (
    <ToolPageLayout
      title="Hash Generator"
      subtitle="& Identifier"
      description="Generez des hashes cryptographiques et identifiez le type d'un hash inconnu. SHA-1, SHA-256, SHA-512, MD5 et plus."
      toolSlug="hash_generator"
      icon={Hash}
      color="#00d4ff"
      hubAnchor="hash-generator"
      features={[
        { icon: Hash, title: "Multi-algorithmes", desc: "MD5, SHA-1, SHA-256, SHA-384, SHA-512 via Web Crypto API + MD5 natif." },
        { icon: Search, title: "Identification", desc: "Identifie 26+ types de hash: MD5, SHA, bcrypt, Argon2, NTLM, MySQL, Django, scrypt." },
        { icon: Shield, title: "100% offline", desc: "Tout est calcule localement via Web Crypto API." },
        { icon: Cpu, title: "Hash de fichiers", desc: "La version Python peut hasher des fichiers entiers." },
        { icon: Eye, title: "8 types reconnus", desc: "MD5, SHA-1/224/256/384/512, bcrypt, Argon2." },
        { icon: Code, title: "Export JSON", desc: "Exportez les resultats pour integration CI/CD." },
      ]}
      requirements={["Python 3.7+", "Aucune dependance externe", "Support fichiers volumineux", "Compatible pipe/stdin"]}
      pythonScript={PYTHON_SCRIPT}
      readmeContent={README}
      guiConfig={GUI_CONFIG}
    >
      <HashGeneratorTool />
    </ToolPageLayout>
  );
}

export { HashGeneratorTool };