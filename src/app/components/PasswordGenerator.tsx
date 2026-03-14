import { useState, useCallback, useEffect } from "react";
import { Key, Copy, RefreshCw, Check, Eye, EyeOff, Shield, AlertTriangle, CheckCircle, XCircle, Search } from "lucide-react";
import { motion } from "motion/react";

const CHARSETS = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:',.<>?/~`",
};

function estimateCrackTime(password: string): { label: string; color: string } {
  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 33;

  const entropy = password.length * Math.log2(poolSize || 1);

  if (entropy < 28) return { label: "Instantane", color: "#ef4444" };
  if (entropy < 36) return { label: "Quelques minutes", color: "#ef4444" };
  if (entropy < 50) return { label: "Quelques heures", color: "#f59e0b" };
  if (entropy < 60) return { label: "Quelques jours", color: "#f59e0b" };
  if (entropy < 70) return { label: "Quelques annees", color: "#00d4ff" };
  if (entropy < 80) return { label: "Milliers d'annees", color: "#39ff14" };
  return { label: "Incrackable", color: "#39ff14" };
}

function getStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  if (password.length >= 20) score += 1;

  if (score <= 2) return { score, label: "Tres faible", color: "#ef4444" };
  if (score <= 3) return { score, label: "Faible", color: "#f97316" };
  if (score <= 5) return { score, label: "Moyen", color: "#f59e0b" };
  if (score <= 6) return { score, label: "Fort", color: "#00d4ff" };
  return { score, label: "Tres fort", color: "#39ff14" };
}

export function PasswordGenerator() {
  const [length, setLength] = useState(20);
  const [options, setOptions] = useState({
    lowercase: true,
    uppercase: true,
    numbers: true,
    symbols: true,
  });
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(true);

  // Breach check
  const [checkPassword, setCheckPassword] = useState("");
  const [breachResult, setBreachResult] = useState<{ found: boolean; count: number } | null>(null);
  const [checking, setChecking] = useState(false);

  const generatePassword = useCallback(() => {
    let charset = "";
    if (options.lowercase) charset += CHARSETS.lowercase;
    if (options.uppercase) charset += CHARSETS.uppercase;
    if (options.numbers) charset += CHARSETS.numbers;
    if (options.symbols) charset += CHARSETS.symbols;

    if (!charset) {
      setPassword("");
      return;
    }

    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    let result = "";
    for (let i = 0; i < length; i++) {
      result += charset[array[i] % charset.length];
    }
    setPassword(result);
    setCopied(false);
  }, [length, options]);

  useEffect(() => {
    generatePassword();
  }, [generatePassword]);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const checkBreach = async () => {
    if (!checkPassword) return;
    setChecking(true);
    setBreachResult(null);

    try {
      // Use Web Crypto API to hash the password with SHA-1
      const encoder = new TextEncoder();
      const data = encoder.encode(checkPassword);
      const hashBuffer = await crypto.subtle.digest("SHA-1", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();

      const prefix = hashHex.slice(0, 5);
      const suffix = hashHex.slice(5);

      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
      const text = await response.text();

      const lines = text.split("\n");
      const match = lines.find((line) => line.startsWith(suffix));

      if (match) {
        const count = parseInt(match.split(":")[1].trim(), 10);
        setBreachResult({ found: true, count });
      } else {
        setBreachResult({ found: false, count: 0 });
      }
    } catch {
      // Fallback if API is unreachable
      setBreachResult({ found: false, count: 0 });
    } finally {
      setChecking(false);
    }
  };

  const strength = getStrength(password);
  const crackTime = estimateCrackTime(password);

  return (
    <div className="min-h-screen py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
            <Key className="w-3.5 h-3.5 text-[#f59e0b]" />
            <span className="text-[#f59e0b]" style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace" }}>Web Crypto API</span>
          </div>
          <h1 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.8rem, 3vw, 2.2rem)" }} className="text-[#e2e8f0] mb-4">
            Generateur de{" "}
            <span style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Mots de Passe</span>
          </h1>
          <p className="text-[#94a3b8] max-w-xl mx-auto" style={{ lineHeight: 1.7 }}>
            Generez des mots de passe cryptographiquement securises avec l'API Web Crypto.
            Verifiez aussi si vos mots de passe ont fuite via HaveIBeenPwned.
          </p>
        </motion.div>

        {/* Generated Password */}
        <div className="bg-[#111827] border border-[#f59e0b]/20 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 bg-[#0a0a0f] border border-[#f59e0b]/20 rounded-lg px-4 py-3 font-mono overflow-x-auto">
              <span className="text-[#e2e8f0] whitespace-nowrap" style={{ fontSize: "1.1rem", letterSpacing: "1px" }}>
                {showPassword ? password : "•".repeat(password.length)}
              </span>
            </div>
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="p-2.5 bg-[#1e293b] rounded-lg text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            <button
              onClick={copyToClipboard}
              className="p-2.5 bg-[#1e293b] rounded-lg text-[#94a3b8] hover:text-[#39ff14] transition-colors"
            >
              {copied ? <Check className="w-5 h-5 text-[#39ff14]" /> : <Copy className="w-5 h-5" />}
            </button>
            <button
              onClick={generatePassword}
              className="p-2.5 bg-[#f59e0b] rounded-lg text-[#0a0a0f] hover:bg-[#d97706] transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {/* Strength bar */}
          <div className="mb-3">
            <div className="flex justify-between mb-1.5">
              <span className="text-[#94a3b8]" style={{ fontSize: "0.8rem" }}>Force</span>
              <span style={{ fontSize: "0.8rem", color: strength.color }}>{strength.label}</span>
            </div>
            <div className="w-full h-2 bg-[#1e293b] rounded-full overflow-hidden flex gap-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-full transition-all"
                  style={{
                    backgroundColor: i < strength.score ? strength.color : "#1e293b",
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" style={{ color: crackTime.color }} />
            <span className="text-[#94a3b8]" style={{ fontSize: "0.8rem" }}>
              Temps de crack estime : <span style={{ color: crackTime.color }}>{crackTime.label}</span>
            </span>
          </div>
        </div>

        {/* Options */}
        <div className="bg-[#111827] border border-[#00d4ff]/10 rounded-xl p-6 mb-6">
          <h3 className="text-[#e2e8f0] mb-4">Options</h3>

          {/* Length slider */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-[#94a3b8]" style={{ fontSize: "0.85rem" }}>Longueur</span>
              <span className="text-[#f59e0b]" style={{ fontFamily: "Orbitron, sans-serif" }}>{length}</span>
            </div>
            <input
              type="range"
              min={4}
              max={64}
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
              className="w-full accent-[#f59e0b] h-2 bg-[#1e293b] rounded-full appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[#64748b] mt-1" style={{ fontSize: "0.7rem" }}>
              <span>4</span>
              <span>16</span>
              <span>32</span>
              <span>48</span>
              <span>64</span>
            </div>
          </div>

          {/* Character options */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "lowercase" as const, label: "Minuscules (a-z)", example: "abc" },
              { key: "uppercase" as const, label: "Majuscules (A-Z)", example: "ABC" },
              { key: "numbers" as const, label: "Chiffres (0-9)", example: "123" },
              { key: "symbols" as const, label: "Symboles (!@#)", example: "!@#" },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setOptions((prev) => ({ ...prev, [opt.key]: !prev[opt.key] }))}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  options[opt.key]
                    ? "bg-[#f59e0b]/10 border-[#f59e0b]/40 text-[#e2e8f0]"
                    : "bg-[#0a0a0f] border-[#1e293b] text-[#64748b]"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                    options[opt.key] ? "bg-[#f59e0b]" : "bg-[#1e293b]"
                  }`}
                >
                  {options[opt.key] && <Check className="w-3 h-3 text-[#0a0a0f]" />}
                </div>
                <div className="text-left">
                  <p style={{ fontSize: "0.85rem" }}>{opt.label}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Breach Check */}
        <div className="bg-[#111827] border border-[#ef4444]/20 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-[#ef4444]" />
            <h3 className="text-[#e2e8f0]">Verifier une fuite de mot de passe</h3>
          </div>
          <p className="text-[#94a3b8] mb-4" style={{ fontSize: "0.85rem" }}>
            Verifiez si un mot de passe a ete compromis dans une fuite de donnees via l'API{" "}
            <a href="https://haveibeenpwned.com" target="_blank" rel="noopener noreferrer" className="text-[#00d4ff] hover:underline">
              HaveIBeenPwned
            </a>
            . Votre mot de passe n'est jamais envoye en clair — seuls les 5 premiers caracteres du hash SHA-1 sont transmis (k-anonymity).
          </p>

          <div className="flex gap-3 mb-4">
            <input
              type="password"
              value={checkPassword}
              onChange={(e) => { setCheckPassword(e.target.value); setBreachResult(null); }}
              placeholder="Entrez un mot de passe a verifier..."
              className="flex-1 px-4 py-3 bg-[#0a0a0f] border border-[#ef4444]/20 rounded-lg text-[#e2e8f0] placeholder-[#64748b] focus:outline-none focus:border-[#ef4444]/50"
            />
            <button
              onClick={checkBreach}
              disabled={checking || !checkPassword}
              className="px-5 py-3 bg-[#ef4444] text-white rounded-lg hover:bg-[#dc2626] transition-all disabled:opacity-50 flex items-center gap-2"
              style={{ fontSize: "0.85rem" }}
            >
              {checking ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Verifier
            </button>
          </div>

          {breachResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-lg border ${
                breachResult.found
                  ? "bg-[#ef4444]/10 border-[#ef4444]/30"
                  : "bg-[#39ff14]/10 border-[#39ff14]/30"
              }`}
            >
              <div className="flex items-center gap-2">
                {breachResult.found ? (
                  <>
                    <XCircle className="w-5 h-5 text-[#ef4444]" />
                    <div>
                      <p className="text-[#ef4444]">Mot de passe compromis !</p>
                      <p className="text-[#94a3b8]" style={{ fontSize: "0.8rem" }}>
                        Ce mot de passe a ete trouve {breachResult.count.toLocaleString()} fois dans des fuites de donnees. Changez-le immediatement.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 text-[#39ff14]" />
                    <div>
                      <p className="text-[#39ff14]">Aucune fuite detectee</p>
                      <p className="text-[#94a3b8]" style={{ fontSize: "0.8rem" }}>
                        Ce mot de passe n'a pas ete trouve dans les bases de donnees de fuites connues.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}