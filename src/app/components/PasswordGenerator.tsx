import { useState, useCallback, useEffect, useMemo } from "react";
import { Key, Copy, RefreshCw, Check, Eye, EyeOff, Shield, AlertTriangle, CheckCircle, XCircle, Search, Loader2, Info, Lock, Hash, Type, Asterisk, ArrowRight, Clock, Zap, Wifi, WifiOff, Server } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import zxcvbn from "zxcvbn";

const CHARSETS = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:',.<>?/~`",
};

function translateCrackTime(display: string | number): string {
  const s = String(display);
  return s
    .replace(/less than a second/gi, "moins d'une seconde")
    .replace(/instant/gi, "instantané")
    .replace(/(\d+)\s*seconds?/gi, "$1 seconde(s)")
    .replace(/(\d+)\s*minutes?/gi, "$1 minute(s)")
    .replace(/(\d+)\s*hours?/gi, "$1 heure(s)")
    .replace(/(\d+)\s*days?/gi, "$1 jour(s)")
    .replace(/(\d+)\s*months?/gi, "$1 mois")
    .replace(/(\d+)\s*years?/gi, "$1 an(s)")
    .replace(/centuries/gi, "des siècles");
}

function translatePattern(pattern: string): string {
  const map: Record<string, string> = {
    dictionary: "Mot du dictionnaire",
    spatial: "Suite clavier (ex: qwerty)",
    repeat: "Caractères répétés",
    sequence: "Suite logique (abc, 123...)",
    regex: "Pattern détecté",
    date: "Date détectée",
    bruteforce: "Force brute",
  };
  return map[pattern] || pattern;
}

function translateDictName(name: string): string {
  const map: Record<string, string> = {
    passwords: "mots de passe courants",
    english_wikipedia: "Wikipedia anglais",
    female_names: "prénoms féminins",
    male_names: "prénoms masculins",
    surnames: "noms de famille",
    us_tv_and_film: "séries/films US",
  };
  return map[name] || name;
}

function getStrengthLabel(score: number): { label: string; color: string } {
  switch (score) {
    case 0: return { label: "Très faible", color: "#ef4444" };
    case 1: return { label: "Faible", color: "#f97316" };
    case 2: return { label: "Moyen", color: "#f59e0b" };
    case 3: return { label: "Fort", color: "#00d4ff" };
    case 4: return { label: "Très fort", color: "#39ff14" };
    default: return { label: "Inconnu", color: "#64748b" };
  }
}

export function PasswordGenerator() {
  const [checkPassword, setCheckPassword] = useState("");
  const [showCheck, setShowCheck] = useState(false);
  const [breachResult, setBreachResult] = useState<{ found: boolean; count: number } | null>(null);
  const [breachChecking, setBreachChecking] = useState(false);

  const [genLength, setGenLength] = useState(20);
  const [genOptions, setGenOptions] = useState({
    lowercase: true, uppercase: true, numbers: true, symbols: true,
  });
  const [generatedPw, setGeneratedPw] = useState("");
  const [showGen, setShowGen] = useState(true);
  const [copied, setCopied] = useState(false);

  const analysis = useMemo(() => {
    if (!checkPassword) return null;
    return zxcvbn(checkPassword);
  }, [checkPassword]);

  const strength = analysis ? getStrengthLabel(analysis.score) : null;

  const charBreakdown = useMemo(() => {
    if (!checkPassword) return null;
    const upper = (checkPassword.match(/[A-Z]/g) || []).length;
    const lower = (checkPassword.match(/[a-z]/g) || []).length;
    const digits = (checkPassword.match(/[0-9]/g) || []).length;
    const symbols = checkPassword.length - upper - lower - digits;
    return { length: checkPassword.length, upper, lower, digits, symbols };
  }, [checkPassword]);

  const recommendations = useMemo(() => {
    if (!checkPassword || !charBreakdown) return [];
    const recs: string[] = [];
    if (charBreakdown.length < 14) recs.push("Allongez votre mot de passe pour atteindre 14-16 caractères.");
    if (charBreakdown.upper === 0) recs.push("Ajoutez des lettres majuscules.");
    if (charBreakdown.lower === 0) recs.push("Ajoutez des lettres minuscules.");
    if (charBreakdown.digits === 0) recs.push("Ajoutez des chiffres.");
    if (charBreakdown.symbols === 0) recs.push("Ajoutez des symboles (!@#$%...).");
    if (charBreakdown.length >= 14 && charBreakdown.upper > 0 && charBreakdown.lower > 0 && charBreakdown.digits > 0 && charBreakdown.symbols > 0) {
      if (analysis && analysis.score < 4) {
        recs.push("Évitez les mots du dictionnaire, noms propres ou suites logiques.");
        recs.push("Utilisez une phrase de passe ou un générateur aléatoire.");
      }
    }
    if (charBreakdown.length < 8) recs.push("Un mot de passe de moins de 8 caractères est dangereusement court.");
    return recs;
  }, [checkPassword, charBreakdown, analysis]);

  useEffect(() => {
    if (!checkPassword || checkPassword.length < 3) { setBreachResult(null); return; }
    setBreachChecking(true);
    const timeout = setTimeout(async () => {
      try {
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
          setBreachResult({ found: true, count: parseInt(match.split(":")[1].trim(), 10) });
        } else {
          setBreachResult({ found: false, count: 0 });
        }
      } catch { setBreachResult(null); }
      finally { setBreachChecking(false); }
    }, 600);
    return () => clearTimeout(timeout);
  }, [checkPassword]);

  const generatePassword = useCallback(() => {
    let charset = "";
    if (genOptions.lowercase) charset += CHARSETS.lowercase;
    if (genOptions.uppercase) charset += CHARSETS.uppercase;
    if (genOptions.numbers) charset += CHARSETS.numbers;
    if (genOptions.symbols) charset += CHARSETS.symbols;
    if (!charset) { setGeneratedPw(""); return; }
    const array = new Uint32Array(genLength);
    crypto.getRandomValues(array);
    let result = "";
    for (let i = 0; i < genLength; i++) result += charset[array[i] % charset.length];
    setGeneratedPw(result);
    setCopied(false);
  }, [genLength, genOptions]);

  useEffect(() => { generatePassword(); }, [generatePassword]);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
            <Key className="w-3.5 h-3.5 text-[#f59e0b]" />
            <span className="text-[#f59e0b]" style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace" }}>zxcvbn + HaveIBeenPwned + Web Crypto</span>
          </div>
          <h1 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.8rem, 3vw, 2.2rem)" }} className="text-[#e2e8f0] mb-4">
            Mots de{" "}
            <span style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Passe</span>
          </h1>
          <p className="text-[#94a3b8] max-w-xl mx-auto" style={{ lineHeight: 1.7 }}>
            Analysez la robustesse de vos mots de passe ou générez-en de nouveaux, cryptographiquement sécurisés.
          </p>
        </motion.div>

        {/* ═══ SECTION 1: ANALYSEUR ═══ */}
        <div className="bg-[#111827] border border-[#f59e0b]/20 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-[#f59e0b]" />
            <h2 className="text-[#e2e8f0]" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.95rem" }}>Analyser un mot de passe</h2>
          </div>

          <div className="relative mb-4">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748b]" />
            <input
              type={showCheck ? "text" : "password"}
              value={checkPassword}
              onChange={(e) => setCheckPassword(e.target.value)}
              placeholder="Entrez un mot de passe"
              className="w-full pl-10 pr-12 py-3.5 bg-[#0a0a0f] border border-[#f59e0b]/20 rounded-lg text-[#e2e8f0] placeholder-[#64748b] focus:outline-none focus:border-[#f59e0b]/60 transition-colors"
              style={{ fontSize: "1rem", fontFamily: "JetBrains Mono, monospace" }}
              autoComplete="off"
              spellCheck={false}
            />
            <button onClick={() => setShowCheck(!showCheck)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#64748b] hover:text-[#e2e8f0] transition-colors">
              {showCheck ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {checkPassword && strength && analysis && (
            <AnimatePresence>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                {/* Strength bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[#94a3b8]" style={{ fontSize: "0.8rem" }}>Force</span>
                    <span style={{ fontSize: "0.85rem", color: strength.color, fontFamily: "Orbitron, sans-serif" }}>{strength.label}</span>
                  </div>
                  <div className="w-full h-2.5 bg-[#1e293b] rounded-full overflow-hidden flex gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex-1 rounded-full transition-all duration-500" style={{ backgroundColor: i <= analysis.score ? strength.color : "#1e293b" }} />
                    ))}
                  </div>
                </div>

                {/* Breach check */}
                <div
                  className="flex items-start gap-3 p-3 rounded-lg"
                  style={{
                    background: breachChecking ? "rgba(0,212,255,0.03)" : breachResult?.found ? "rgba(239,68,68,0.05)" : "rgba(57,255,20,0.05)",
                    border: `1px solid ${breachChecking ? "rgba(0,212,255,0.1)" : breachResult?.found ? "rgba(239,68,68,0.15)" : "rgba(57,255,20,0.15)"}`,
                  }}
                >
                  {breachChecking ? (
                    <Loader2 className="w-4 h-4 text-[#00d4ff] animate-spin flex-shrink-0 mt-0.5" />
                  ) : breachResult?.found ? (
                    <XCircle className="w-4 h-4 text-[#ef4444] flex-shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-[#39ff14] flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p style={{ fontSize: "0.8rem", color: breachChecking ? "#00d4ff" : breachResult?.found ? "#ef4444" : "#39ff14" }}>
                      Fuite connue (haveibeenpwned.com)
                    </p>
                    <p className="text-[#94a3b8]" style={{ fontSize: "0.75rem" }}>
                      {breachChecking
                        ? "Vérification en cours..."
                        : breachResult?.found
                          ? `Ce mot de passe a été trouvé ${breachResult.count.toLocaleString("fr-FR")} fois dans des fuites de données. Changez-le immédiatement.`
                          : "Aucune occurrence trouvée (cela ne garantit pas sa sécurité, mais il n'est pas listé)."}
                    </p>
                  </div>
                </div>

                {/* Recommendations */}
                {recommendations.length > 0 && (
                  <div className="p-3 rounded-lg" style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.12)" }}>
                    <p className="text-[#f59e0b] mb-2" style={{ fontSize: "0.8rem", fontFamily: "Orbitron, sans-serif" }}>Recommandations</p>
                    <ul className="space-y-1.5">
                      {recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <ArrowRight className="w-3 h-3 text-[#f59e0b] flex-shrink-0 mt-1" />
                          <span className="text-[#94a3b8]" style={{ fontSize: "0.8rem" }}>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Character breakdown */}
                {charBreakdown && (
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { label: "Longueur", value: charBreakdown.length, color: "#00d4ff" },
                      { label: "Majuscule(s)", value: charBreakdown.upper, color: charBreakdown.upper > 0 ? "#39ff14" : "#ef4444" },
                      { label: "Minuscule(s)", value: charBreakdown.lower, color: charBreakdown.lower > 0 ? "#39ff14" : "#ef4444" },
                      { label: "Chiffre(s)", value: charBreakdown.digits, color: charBreakdown.digits > 0 ? "#39ff14" : "#ef4444" },
                      { label: "Symbole(s)", value: charBreakdown.symbols, color: charBreakdown.symbols > 0 ? "#39ff14" : "#ef4444" },
                    ].map((item) => (
                      <div key={item.label} className="bg-[#0a0a0f] rounded-lg p-3 text-center">
                        <div style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1.3rem", color: item.color }}>{item.value}</div>
                        <p className="text-[#64748b] mt-1" style={{ fontSize: "0.65rem" }}>{item.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* ═══ CRACK TIME — 4 real zxcvbn scenarios ═══ */}
                <div className="bg-[#0a0a0f] rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="flex items-center gap-2 p-3">
                    <Clock className="w-4 h-4 flex-shrink-0" style={{ color: strength.color }} />
                    <p className="text-[#e2e8f0]" style={{ fontSize: "0.85rem" }}>
                      Ce mot de passe pourrait être craqué en{" "}
                      <span style={{ color: strength.color, fontFamily: "JetBrains Mono, monospace" }}>
                        ≈ {translateCrackTime(analysis.crack_times_display.offline_slow_hashing_1e4_per_second)}
                      </span>
                    </p>
                  </div>

                  <div className="border-t border-[#1e293b] px-3 py-2.5 space-y-2">
                    {([
                      {
                        icon: Wifi,
                        label: "Attaque en ligne (throttled)",
                        desc: "100 tentatives/heure — login web avec rate limiting",
                        display: analysis.crack_times_display.online_throttling_100_per_hour,
                        seconds: analysis.crack_times_seconds.online_throttling_100_per_hour,
                      },
                      {
                        icon: WifiOff,
                        label: "Attaque en ligne (no throttle)",
                        desc: "10 tentatives/seconde — API sans rate limiting",
                        display: analysis.crack_times_display.online_no_throttling_10_per_second,
                        seconds: analysis.crack_times_seconds.online_no_throttling_10_per_second,
                      },
                      {
                        icon: Server,
                        label: "Attaque offline (hash lent)",
                        desc: "10k tentatives/sec — bcrypt, scrypt, Argon2",
                        display: analysis.crack_times_display.offline_slow_hashing_1e4_per_second,
                        seconds: analysis.crack_times_seconds.offline_slow_hashing_1e4_per_second,
                      },
                      {
                        icon: Zap,
                        label: "Attaque offline (hash rapide)",
                        desc: "10B tentatives/sec — MD5, SHA1 sur GPU",
                        display: analysis.crack_times_display.offline_fast_hashing_1e10,
                        seconds: analysis.crack_times_seconds.offline_fast_hashing_1e10,
                      },
                    ] as const).map((sc) => {
                      const c = sc.seconds < 1 ? "#ef4444" : sc.seconds < 86400 ? "#f59e0b" : sc.seconds < 86400 * 365 * 100 ? "#00d4ff" : "#39ff14";
                      return (
                        <div key={sc.label} className="flex items-center gap-3 py-1.5">
                          <sc.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: c }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[#94a3b8] truncate" style={{ fontSize: "0.72rem" }}>{sc.label}</p>
                            <p className="text-[#4a5568] truncate" style={{ fontSize: "0.62rem" }}>{sc.desc}</p>
                          </div>
                          <span className="flex-shrink-0" style={{ fontSize: "0.75rem", color: c, fontFamily: "JetBrains Mono, monospace" }}>
                            ≈ {translateCrackTime(sc.display)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-[#1e293b] px-3 py-2 flex items-center gap-2">
                    <Hash className="w-3 h-3 text-[#4a5568]" />
                    <span className="text-[#4a5568]" style={{ fontSize: "0.7rem", fontFamily: "JetBrains Mono, monospace" }}>
                      {Number(analysis.guesses).toLocaleString("fr-FR")} combinaisons à tester (10^{analysis.guesses_log10.toFixed(1)})
                    </span>
                  </div>
                </div>

                {/* Pattern analysis from zxcvbn */}
                {analysis.sequence && analysis.sequence.length > 0 && (
                  <div className="bg-[#0a0a0f] rounded-lg p-3" style={{ border: "1px solid rgba(255,255,255,0.04)" }}>
                    <p className="text-[#94a3b8] mb-2" style={{ fontSize: "0.75rem", fontFamily: "Orbitron, sans-serif" }}>Patterns détectés par zxcvbn</p>
                    <div className="space-y-1.5">
                      {analysis.sequence.map((match: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 flex-wrap">
                          <span className="text-[#f59e0b] font-mono px-1.5 py-0.5 bg-[#f59e0b]/10 rounded" style={{ fontSize: "0.72rem" }}>
                            &quot;{match.token}&quot;
                          </span>
                          <span className="text-[#64748b]" style={{ fontSize: "0.7rem" }}>&rarr;</span>
                          <span className="text-[#94a3b8]" style={{ fontSize: "0.72rem" }}>
                            {translatePattern(match.pattern)}
                            {match.dictionary_name ? ` (${translateDictName(match.dictionary_name)})` : ""}
                            {match.pattern === "date" && match.year ? ` — année ${match.year}` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* zxcvbn feedback */}
                {analysis.feedback && (analysis.feedback.warning || (analysis.feedback.suggestions && analysis.feedback.suggestions.length > 0)) && (
                  <div className="p-3 rounded-lg" style={{ background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.12)" }}>
                    {analysis.feedback.warning && (
                      <div className="flex items-start gap-2 mb-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-[#f59e0b] flex-shrink-0 mt-0.5" />
                        <p className="text-[#f59e0b]" style={{ fontSize: "0.8rem" }}>{analysis.feedback.warning}</p>
                      </div>
                    )}
                    {analysis.feedback.suggestions?.map((s: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 mb-1">
                        <ArrowRight className="w-3 h-3 text-[#8b5cf6] flex-shrink-0 mt-0.5" />
                        <p className="text-[#94a3b8]" style={{ fontSize: "0.75rem" }}>{s}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Disclaimer */}
                <div className="flex items-start gap-2">
                  <Info className="w-3 h-3 text-[#4a5568] flex-shrink-0 mt-0.5" />
                  <p className="text-[#4a5568]" style={{ fontSize: "0.65rem", lineHeight: 1.5 }}>
                    Estimations basées sur l'algorithme open source <strong>zxcvbn</strong> (créé par Dropbox),
                    en supposant une attaque par force brute sans limitation de tentatives ni protections
                    supplémentaires (MFA, verrouillage de compte, etc.). Ces valeurs sont indicatives et ne
                    remplacent pas les politiques de sécurité de votre organisation.
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* ═══ SECTION 2: GENERATEUR ═══ */}
        <div className="bg-[#111827] border border-[#00d4ff]/10 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-5">
            <RefreshCw className="w-5 h-5 text-[#00d4ff]" />
            <h2 className="text-[#e2e8f0]" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.95rem" }}>Générer un mot de passe</h2>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1">
              <input
                type={showGen ? "text" : "password"}
                value={generatedPw}
                onChange={(e) => { setGeneratedPw(e.target.value); setCopied(false); }}
                className="w-full bg-[#0a0a0f] border border-[#00d4ff]/20 rounded-lg px-4 py-3 font-mono text-[#e2e8f0] focus:outline-none focus:border-[#00d4ff]/60 transition-colors"
                style={{ fontSize: "1rem", letterSpacing: "0.5px" }}
                spellCheck={false}
                autoComplete="off"
              />
            </div>
            <button onClick={() => setShowGen(!showGen)} className="p-2.5 bg-[#1e293b] rounded-lg text-[#94a3b8] hover:text-[#e2e8f0] transition-colors">
              {showGen ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            <button onClick={() => copyToClipboard(generatedPw)} className="p-2.5 bg-[#1e293b] rounded-lg text-[#94a3b8] hover:text-[#39ff14] transition-colors">
              {copied ? <Check className="w-5 h-5 text-[#39ff14]" /> : <Copy className="w-5 h-5" />}
            </button>
            <button onClick={generatePassword} className="p-2.5 bg-[#00d4ff] rounded-lg text-[#0a0a0f] hover:bg-[#00b8d9] transition-colors">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {generatedPw && (() => {
            const ga = zxcvbn(generatedPw);
            const gs = getStrengthLabel(ga.score);
            return (
              <div className="flex items-center gap-3 mb-5 px-1">
                <div className="flex-1 h-1.5 bg-[#1e293b] rounded-full overflow-hidden flex gap-0.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex-1 rounded-full transition-all" style={{ backgroundColor: i <= ga.score ? gs.color : "#1e293b" }} />
                  ))}
                </div>
                <span style={{ fontSize: "0.75rem", color: gs.color, fontFamily: "Orbitron, sans-serif" }}>{gs.label}</span>
              </div>
            );
          })()}

          <div className="mb-5">
            <div className="flex justify-between mb-2">
              <span className="text-[#94a3b8]" style={{ fontSize: "0.85rem" }}>Longueur</span>
              <span className="text-[#00d4ff]" style={{ fontFamily: "Orbitron, sans-serif" }}>{genLength}</span>
            </div>
            <input type="range" min={4} max={64} value={genLength} onChange={(e) => setGenLength(Number(e.target.value))} className="w-full accent-[#00d4ff] h-2 bg-[#1e293b] rounded-full appearance-none cursor-pointer" />
            <div className="flex justify-between text-[#64748b] mt-1" style={{ fontSize: "0.7rem" }}>
              <span>4</span><span>16</span><span>32</span><span>48</span><span>64</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {([
              { key: "lowercase" as const, label: "Minuscules (a-z)" },
              { key: "uppercase" as const, label: "Majuscules (A-Z)" },
              { key: "numbers" as const, label: "Chiffres (0-9)" },
              { key: "symbols" as const, label: "Symboles (!@#)" },
            ]).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setGenOptions((prev) => ({ ...prev, [opt.key]: !prev[opt.key] }))}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${genOptions[opt.key] ? "bg-[#00d4ff]/10 border-[#00d4ff]/40 text-[#e2e8f0]" : "bg-[#0a0a0f] border-[#1e293b] text-[#64748b]"}`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${genOptions[opt.key] ? "bg-[#00d4ff]" : "bg-[#1e293b]"}`}>
                  {genOptions[opt.key] && <Check className="w-3 h-3 text-[#0a0a0f]" />}
                </div>
                <p style={{ fontSize: "0.85rem" }}>{opt.label}</p>
              </button>
            ))}
          </div>

          {generatedPw && (
            <button
              onClick={() => { setCheckPassword(generatedPw); setShowCheck(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="mt-4 w-full py-2.5 rounded-lg text-[#00d4ff] hover:bg-[#00d4ff]/10 transition-colors flex items-center justify-center gap-2"
              style={{ fontSize: "0.8rem", border: "1px solid rgba(0,212,255,0.15)" }}
            >
              <Search className="w-3.5 h-3.5" />
              Analyser ce mot de passe en détail
            </button>
          )}
        </div>
      </div>
    </div>
  );
}