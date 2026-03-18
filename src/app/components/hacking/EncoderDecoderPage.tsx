import { useState } from "react";
import { RefreshCw, ArrowDownUp, Copy, CheckCircle, Code, Binary, Globe, Lock, Hash, FileText } from "lucide-react";
import { ToolPageLayout } from "./ToolPageLayout";
import type { GuiConfig } from "./zip-generator";

type Mode = "base64" | "hex" | "url" | "html" | "binary" | "rot13" | "unicode" | "decimal" | "octal" | "morse";

const MODES: { key: Mode; label: string; color: string }[] = [
  { key: "base64", label: "Base64", color: "#00d4ff" },
  { key: "hex", label: "Hex", color: "#39ff14" },
  { key: "url", label: "URL", color: "#f59e0b" },
  { key: "html", label: "HTML", color: "#8b5cf6" },
  { key: "binary", label: "Binaire", color: "#ef4444" },
  { key: "rot13", label: "ROT13", color: "#f97316" },
  { key: "unicode", label: "Unicode", color: "#06b6d4" },
  { key: "decimal", label: "Decimal", color: "#10b981" },
  { key: "octal", label: "Octal", color: "#a855f7" },
  { key: "morse", label: "Morse", color: "#ec4899" },
];

const MORSE_MAP: Record<string, string> = {
  "A":".-","B":"-...","C":"-.-.","D":"-..","E":".","F":"..-.","G":"--.","H":"....","I":"..","J":".---",
  "K":"-.-","L":".-..","M":"--","N":"-.","O":"---","P":".--.","Q":"--.-","R":".-.","S":"...","T":"-",
  "U":"..-","V":"...-","W":".--","X":"-..-","Y":"-.--","Z":"--..","0":"-----","1":".----","2":"..---",
  "3":"...--","4":"....-","5":".....","6":"-....","7":"--...","8":"---..","9":"----.",".":" .-.-.-",",":" --..--",
  "?":"..--..","!":"-.-.--","/":"-..-.",  "@":".--.-.","(":"-.--.",")":"-.--.-"," ":"/",
};
const MORSE_REV = Object.fromEntries(Object.entries(MORSE_MAP).map(([k, v]) => [v, k]));

function encode(mode: Mode, input: string): string {
  try {
    switch (mode) {
      case "base64": return btoa(unescape(encodeURIComponent(input)));
      case "hex": return Array.from(new TextEncoder().encode(input)).map(b => b.toString(16).padStart(2, "0")).join(" ");
      case "url": return encodeURIComponent(input);
      case "html": return input.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));
      case "binary": return Array.from(new TextEncoder().encode(input)).map(b => b.toString(2).padStart(8, "0")).join(" ");
      case "rot13": return input.replace(/[a-zA-Z]/g, c => String.fromCharCode(c.charCodeAt(0) + (c.toLowerCase() < "n" ? 13 : -13)));
      case "unicode": return Array.from(input).map(c => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0")).join("");
      case "decimal": return Array.from(new TextEncoder().encode(input)).map(b => b.toString(10)).join(" ");
      case "octal": return Array.from(new TextEncoder().encode(input)).map(b => "\\" + b.toString(8).padStart(3, "0")).join("");
      case "morse": return input.toUpperCase().split("").map(c => MORSE_MAP[c] || c).join(" ");
      default: return input;
    }
  } catch { return "Erreur d'encodage"; }
}

function decode(mode: Mode, input: string): string {
  try {
    switch (mode) {
      case "base64": return decodeURIComponent(escape(atob(input.trim())));
      case "hex": return new TextDecoder().decode(new Uint8Array(input.trim().split(/\s+/).map(h => parseInt(h, 16))));
      case "url": return decodeURIComponent(input);
      case "html": { const el = document.createElement("textarea"); el.innerHTML = input; return el.value; }
      case "binary": return new TextDecoder().decode(new Uint8Array(input.trim().split(/\s+/).map(b => parseInt(b, 2))));
      case "rot13": return input.replace(/[a-zA-Z]/g, c => String.fromCharCode(c.charCodeAt(0) + (c.toLowerCase() < "n" ? 13 : -13)));
      case "unicode": return input.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
      case "decimal": return new TextDecoder().decode(new Uint8Array(input.trim().split(/\s+/).map(d => parseInt(d, 10))));
      case "octal": return new TextDecoder().decode(new Uint8Array(input.replace(/\\/g, " ").trim().split(/\s+/).filter(Boolean).map(o => parseInt(o, 8))));
      case "morse": return input.trim().split(" ").map(c => c === "/" ? " " : MORSE_REV[c] || c).join("");
      default: return input;
    }
  } catch { return "Erreur de decodage"; }
}

function EncoderDecoderTool() {
  const [mode, setMode] = useState<Mode>("base64");
  const [input, setInput] = useState("");
  const [direction, setDirection] = useState<"encode" | "decode">("encode");
  const [copied, setCopied] = useState(false);

  const output = input ? (direction === "encode" ? encode(mode, input) : decode(mode, input)) : "";

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      {/* Mode selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className="px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: mode === m.key ? `${m.color}20` : "rgba(17,24,39,0.5)",
              border: `1px solid ${mode === m.key ? `${m.color}40` : "rgba(255,255,255,0.05)"}`,
              color: mode === m.key ? m.color : "#64748b",
              fontSize: "0.78rem",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Direction toggle */}
      <button
        onClick={() => setDirection(d => d === "encode" ? "decode" : "encode")}
        className="flex items-center gap-2 px-4 py-2 rounded-lg mb-4 transition-all hover:bg-white/5"
        style={{ border: "1px solid rgba(255,255,255,0.08)", fontSize: "0.8rem" }}
      >
        <ArrowDownUp className="w-4 h-4 text-[#00d4ff]" />
        <span className="text-[#e2e8f0]">{direction === "encode" ? "Encoder" : "Decoder"}</span>
      </button>

      {/* Input */}
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={direction === "encode" ? "Texte a encoder..." : "Texte encode a decoder..."}
        rows={4}
        className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#1e293b] rounded-lg text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#00d4ff]/40 transition-colors mb-4 resize-none"
        style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem" }}
      />

      {/* Output */}
      {output && (
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(57,255,20,0.12)" }}>
          <div className="flex items-center justify-between px-4 py-2" style={{ background: "rgba(57,255,20,0.06)", borderBottom: "1px solid rgba(57,255,20,0.08)" }}>
            <span className="text-[#39ff14]" style={{ fontSize: "0.75rem", fontFamily: "Orbitron, sans-serif" }}>
              Resultat ({mode.toUpperCase()} {direction === "encode" ? "encode" : "decode"})
            </span>
            <button onClick={copyOutput} className="flex items-center gap-1 text-[#39ff14] hover:text-white transition-colors" style={{ fontSize: "0.72rem" }}>
              {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copie!" : "Copier"}
            </button>
          </div>
          <pre className="p-4 text-[#39ff14] overflow-x-auto break-all whitespace-pre-wrap" style={{ background: "rgba(10,10,15,0.8)", fontFamily: "JetBrains Mono, monospace", fontSize: "0.78rem", lineHeight: 1.6 }}>
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}

const PYTHON_SCRIPT = `#!/usr/bin/env python3
"""
Encoder/Decoder Multi-Format - CyberGuard
Encode et decode en Base64, Hex, URL, HTML, Binaire, ROT13.
100% offline, aucune API.

Usage:
    python encoder_decoder.py encode base64 "Hello World"
    python encoder_decoder.py decode hex "48 65 6c 6c 6f"
    python encoder_decoder.py encode rot13 "Secret message"
    echo "data" | python encoder_decoder.py encode base64 -
"""

import argparse
import base64
import html
import sys
import urllib.parse

def encode_base64(text):
    return base64.b64encode(text.encode()).decode()

def decode_base64(text):
    return base64.b64decode(text).decode()

def encode_hex(text):
    return " ".join(f"{b:02x}" for b in text.encode())

def decode_hex(text):
    hex_bytes = text.replace(" ", "").replace("\\n", "")
    return bytes.fromhex(hex_bytes).decode()

def encode_url(text):
    return urllib.parse.quote(text, safe="")

def decode_url(text):
    return urllib.parse.unquote(text)

def encode_html(text):
    return html.escape(text)

def decode_html(text):
    return html.unescape(text)

def encode_binary(text):
    return " ".join(f"{b:08b}" for b in text.encode())

def decode_binary(text):
    bits = text.strip().split()
    return bytes(int(b, 2) for b in bits).decode()

def rot13(text):
    result = []
    for c in text:
        if "a" <= c <= "z":
            result.append(chr((ord(c) - ord("a") + 13) % 26 + ord("a")))
        elif "A" <= c <= "Z":
            result.append(chr((ord(c) - ord("A") + 13) % 26 + ord("A")))
        else:
            result.append(c)
    return "".join(result)

ENCODERS = {
    "base64": (encode_base64, decode_base64),
    "hex": (encode_hex, decode_hex),
    "url": (encode_url, decode_url),
    "html": (encode_html, decode_html),
    "binary": (encode_binary, decode_binary),
    "rot13": (rot13, rot13),
}

def main():
    parser = argparse.ArgumentParser(description="Encoder/Decoder Multi-Format - CyberGuard")
    parser.add_argument("action", choices=["encode", "decode"], help="Action a effectuer")
    parser.add_argument("format", choices=list(ENCODERS.keys()), help="Format d'encodage")
    parser.add_argument("text", nargs="?", default="-", help="Texte (ou '-' pour stdin)")
    parser.add_argument("-o", "--output", help="Fichier de sortie")
    args = parser.parse_args()

    if args.text == "-":
        text = sys.stdin.read().strip()
    else:
        text = args.text

    enc_fn, dec_fn = ENCODERS[args.format]
    try:
        result = enc_fn(text) if args.action == "encode" else dec_fn(text)
    except Exception as e:
        print(f"Erreur: {e}", file=sys.stderr)
        sys.exit(1)

    if args.output:
        with open(args.output, "w") as f:
            f.write(result)
        print(f"Resultat sauvegarde dans {args.output}")
    else:
        print(result)

if __name__ == "__main__":
    main()
`;

const README = `# Encoder/Decoder Multi-Format - CyberGuard

Encode et decode en 6 formats: Base64, Hex, URL, HTML, Binaire, ROT13.

## Utilisation
\`\`\`bash
python encoder_decoder.py encode base64 "Hello World"
python encoder_decoder.py decode hex "48 65 6c 6c 6f"
python encoder_decoder.py encode rot13 "Secret"
echo "data" | python encoder_decoder.py encode base64 -
\`\`\`

## API requise
Aucune. 100% offline.
`;

const GUI_CONFIG: GuiConfig = {
  title: "Encoder / Decoder Multi-Format",
  inputType: "text",
  inputPlaceholder: "Texte a encoder ou decoder...",
  buttonText: "Encoder",
  importLine: "from encoder_decoder import ENCODERS",
  processCode: `            results = {}
            for fmt, (enc_fn, dec_fn) in ENCODERS.items():
                try:
                    results[f"encode_{fmt}"] = enc_fn(inp)
                except: results[f"encode_{fmt}"] = "erreur"
            return results`,
  extraCombo: {
    label: "Format",
    options: [["base64","Base64"],["hex","Hex"],["url","URL"],["html","HTML"],["binary","Binaire"],["rot13","ROT13"]],
    varName: "fmt",
  },
};

export function EncoderDecoderPage() {
  return (
    <ToolPageLayout
      title="Encoder"
      subtitle="/ Decoder"
      description="Toolkit d'encodage et decodage multi-format. Base64, Hex, URL, HTML, Binaire et ROT13. Indispensable pour le pentest et les CTF."
      toolSlug="encoder_decoder"
      icon={RefreshCw}
      color="#f59e0b"
      hubAnchor="encoder-decoder"
      features={[
        { icon: Code, title: "10 formats", desc: "Base64, Hexadecimal, URL encoding, HTML entities, Binaire, ROT13, Unicode, Decimal, Octal, Morse." },
        { icon: ArrowDownUp, title: "Bidirectionnel", desc: "Encodez et decodez dans les deux sens instantanement." },
        { icon: Binary, title: "100% offline", desc: "Tout est calcule localement. Aucune donnee envoyee." },
        { icon: Globe, title: "Pipe-friendly", desc: "Compatible stdin/stdout pour l'integration en scripts." },
        { icon: Lock, title: "Payloads securite", desc: "Utile pour encoder/decoder des payloads XSS, SQLi, etc." },
        { icon: FileText, title: "Export fichier", desc: "Sauvegardez le resultat dans un fichier avec -o." },
      ]}
      requirements={["Python 3.7+", "Aucune dependance externe", "Fonctionne 100% offline", "Compatible pipe/stdin"]}
      pythonScript={PYTHON_SCRIPT}
      readmeContent={README}
      guiConfig={GUI_CONFIG}
    >
      <EncoderDecoderTool />
    </ToolPageLayout>
  );
}

export { EncoderDecoderTool };