import { useState, useRef, useCallback, useEffect } from "react";
import {
  Zap, Shield, Lock, Cpu, Hash, Eye, Target, BookOpen, Gauge,
  Play, Square, RotateCcw, Copy, CheckCircle, AlertTriangle, Loader2,
  FileText, Settings, List, Crosshair, Info, XCircle,
} from "lucide-react";
import { ToolPageLayout } from "./ToolPageLayout";
import type { GuiConfig } from "./zip-generator";

// ─── MD5 Implementation (RFC 1321) ──────────────────────────────────────
function md5(input: string): string {
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
  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & c) | ((~b) & d), a, b, x, s, t);
  }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & d) | (c & (~d)), a, b, x, s, t);
  }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(c ^ (b | (~d)), a, b, x, s, t);
  }
  function add32(a: number, b: number) {
    return (a + b) & 0xFFFFFFFF;
  }
  function md5blk(s: string) {
    const md5blks: number[] = [];
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }
  const hex_chr = '0123456789abcdef'.split('');
  function rhex(n: number) {
    let s = '';
    for (let j = 0; j < 4; j++) s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F];
    return s;
  }
  function hex(x: number[]) {
    return x.map(rhex).join('');
  }
  let n = input.length;
  let state = [1732584193, -271733879, -1732584194, 271733878];
  let i;
  for (i = 64; i <= n; i += 64) {
    md5cycle(state, md5blk(input.substring(i - 64, i)));
  }
  let tail = input.substring(i - 64);
  let tmp = [];
  for (let j = 0; j < tail.length; j++) tmp.push(tail.charCodeAt(j));
  tmp.push(0x80);
  while (tmp.length < (tmp.length <= 56 ? 64 : 128)) tmp.push(0);
  // Length in bits (low 32)
  tmp[tmp.length <= 64 ? 56 : 120] = (n * 8) & 0xFF;
  tmp[tmp.length <= 64 ? 57 : 121] = ((n * 8) >> 8) & 0xFF;
  tmp[tmp.length <= 64 ? 58 : 122] = ((n * 8) >> 16) & 0xFF;
  tmp[tmp.length <= 64 ? 59 : 123] = ((n * 8) >> 24) & 0xFF;
  const blk: number[] = [];
  for (let j = 0; j < tmp.length; j += 4) {
    blk[j >> 2] = tmp[j] + (tmp[j + 1] << 8) + (tmp[j + 2] << 16) + (tmp[j + 3] << 24);
  }
  for (let j = 0; j < blk.length; j += 16) {
    md5cycle(state, blk.slice(j, j + 16));
  }
  return hex(state);
}

// ─── SHA via Web Crypto ─────────────────────────────────────────────────
async function sha(algo: string, input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest(algo, data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

type HashAlgo = "md5" | "sha1" | "sha256" | "sha512";

async function computeHash(algo: HashAlgo, input: string): Promise<string> {
  switch (algo) {
    case "md5": return md5(input);
    case "sha1": return sha("SHA-1", input);
    case "sha256": return sha("SHA-256", input);
    case "sha512": return sha("SHA-512", input);
  }
}

// ─── Hash Identifier ────────────────────────────────────────────────────
const HASH_SIGS: { regex: RegExp; name: string; algo: HashAlgo; bits: number }[] = [
  { regex: /^[a-f0-9]{32}$/i, name: "MD5", algo: "md5", bits: 128 },
  { regex: /^[a-f0-9]{40}$/i, name: "SHA-1", algo: "sha1", bits: 160 },
  { regex: /^[a-f0-9]{64}$/i, name: "SHA-256", algo: "sha256", bits: 256 },
  { regex: /^[a-f0-9]{128}$/i, name: "SHA-512", algo: "sha512", bits: 512 },
];

function identifyHash(h: string): { name: string; algo: HashAlgo; bits: number }[] {
  return HASH_SIGS.filter(s => s.regex.test(h.trim()));
}

// ─── Mutation Engine ────────────────────────────────────────────────────
function generateMutations(word: string): string[] {
  const mutations = new Set<string>();
  mutations.add(word);
  mutations.add(word.toLowerCase());
  mutations.add(word.toUpperCase());
  mutations.add(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  // Append numbers
  for (let i = 0; i <= 9; i++) mutations.add(word + i);
  for (const y of ["123", "1234", "!", "!!", "01", "00", "69", "666", "777", "2024", "2025", "2026"]) {
    mutations.add(word + y);
    mutations.add(word.charAt(0).toUpperCase() + word.slice(1) + y);
  }
  // L33t speak
  const l33t: Record<string, string> = { a: "4", e: "3", i: "1", o: "0", s: "5", t: "7", l: "1", b: "8" };
  let leetWord = "";
  for (const ch of word.toLowerCase()) leetWord += l33t[ch] || ch;
  mutations.add(leetWord);
  mutations.add(leetWord + "!");
  // Reverse
  mutations.add(word.split("").reverse().join(""));
  // Double
  mutations.add(word + word);
  // Surround
  mutations.add("!" + word + "!");
  mutations.add("@" + word);
  mutations.add(word + "@");
  return Array.from(mutations);
}

// ─── Common Passwords (Top 500) ─────────────────────────────────────────
const COMMON_PASSWORDS = [
  "123456","password","123456789","12345678","12345","1234567","1234567890",
  "qwerty","abc123","111111","123123","admin","letmein","welcome","monkey",
  "master","dragon","login","princess","football","shadow","sunshine",
  "trustno1","iloveyou","batman","access","hello","charlie","donald",
  "password1","qwerty123","654321","superman","qazwsx","michael","121212",
  "bailey","freedom","pass","baseball","buster","daniel","hannah","thomas",
  "summer","george","harley","222222","jessica","ginger","abcdef","jordan",
  "55555","tigger","joshua","pepper","sophie","1234","robert","matthew",
  "12341234","andrew","lakers","andrea","1qaz2wsx","starwars","jennifer",
  "samsung","dallas","passw0rd","austin","whatever","amanda","nicole",
  "test","test123","secret","root","toor","admin123","administrator",
  "changeme","default","guest","user","demo","oracle","mysql","postgres",
  "ftp","ssh","cisco","enable","system","manager","operator","monitor",
  "backup","service","support","maintenance","developer","staging","production",
  "pa$$w0rd","P@ssw0rd","P@ss1234","Passw0rd!","Admin123!","Welcome1",
  "Password1!","Qwerty123!","Abc123456","Test1234","Letmein123","Master123",
  "soccer","hockey","ranger","thomas","klaster","george","computer","mercedes",
  "hammer","helpme","gordon","cookie","eagles","samurai","genius","garcia",
  "gold","1234qwer","allison","smokey","angel","junior","peanut","morgan",
  "welcome1","hardcore","corvette","thunder","cowboys","wolves","matrix",
  "phoenix","1111","2222","3333","4444","5555","6666","7777","8888","9999","0000",
  "password123","admin1234","root123","letmein1","abc1234","test1","user123",
  "qwerty1","123abc","pass123","admin1","master1","login1","welcome123",
  "azerty","motdepasse","soleil","bonjour","chocolat","coucou","doudou",
  "loulou","nicolas","camille","france","amour","chouchou","nathalie",
  "marseille","pierre","marine","thomas","julien","louise","gabriel",
  "fuckyou","asshole","dickhead","bitchass","shithead","piss","damn",
  "alexander","victoria","elizabeth","benjamin","christopher","katherine",
  "jonathan","stephanie","christian","nicholas","samantha","patricia",
  "minecraft","fortnite","roblox","valorant","pokemon","naruto","onepiece",
  "league","gaming","twitch","discord","youtube","tiktok","instagram",
  "facebook","twitter","snapchat","linkedin","github","google","amazon",
  "apple","microsoft","netflix","spotify","tesla","bitcoin","crypto",
  "hacker","security","firewall","exploit","malware","virus","trojan",
  "phishing","breach","cyber","pentest","kali","linux","ubuntu","debian",
  "windows","macos","android","iphone","samsung","huawei","xiaomi",
  "internet","wifi","router","server","cloud","database","network",
  "python","javascript","java","ruby","golang","rust","swift","kotlin",
  "react","angular","vue","django","flask","spring","express","laravel",
  "zxcvbn","asdfgh","qwertyuiop","zaq1xsw2","1q2w3e4r","1q2w3e4r5t",
  "passpass","pass1234","12345a","123456a","abcd1234","aaaa1111","bbbb2222",
  "azertyuiop","azer1234","azerty123","soleil123","bonjour123","amour123",
  "iloveu","iloveyou1","iloveyou123","loveyou","love123","babe","baby",
  "honey","sweet","darling","angel1","angel123","star","lucky","happy",
  // Common first names (FR + EN)
  "yanis","yannis","adam","lucas","hugo","leo","louis","nathan","emma","jade",
  "liam","noah","ethan","arthur","raphael","paul","victor","mohamed","amine","karim",
  "sarah","lea","chloe","alice","manon","clara","ines","lina","mia","anna",
  "maxime","alexandre","antoine","baptiste","clement","theo","romain","kevin","dylan","killian",
  "john","james","david","william","richard","charles","joseph","mark","donald","steven",
  "mary","patricia","jennifer","linda","barbara","susan","margaret","dorothy","lisa","karen",
].filter((v, i, a) => a.indexOf(v) === i);

// ─── Brute Force Generator ─────────────────────────────────────────────
const CHARSETS = {
  digits: "0123456789",
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lower_digits: "abcdefghijklmnopqrstuvwxyz0123456789",
  alphanum: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  all: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*",
  custom: "",
};

type CharsetKey = keyof typeof CHARSETS;

function* bruteForceGenerator(charset: string, maxLen: number): Generator<string> {
  for (let len = 1; len <= maxLen; len++) {
    const indices = new Array(len).fill(0);
    while (true) {
      yield indices.map(i => charset[i]).join("");
      let carry = len - 1;
      while (carry >= 0) {
        indices[carry]++;
        if (indices[carry] < charset.length) break;
        indices[carry] = 0;
        carry--;
      }
      if (carry < 0) break;
    }
  }
}

function totalCombinations(charsetLen: number, maxLen: number): number {
  let total = 0;
  for (let i = 1; i <= maxLen; i++) total += Math.pow(charsetLen, i);
  return total;
}

// ─── Attack State ───────────────────────────────────────────────────────
interface AttackStats {
  tested: number;
  total: number;
  speed: number;
  found: string | null;
  elapsed: number;
  status: "idle" | "running" | "found" | "exhausted" | "stopped";
  currentWord: string;
}

const initialStats: AttackStats = {
  tested: 0, total: 0, speed: 0, found: null, elapsed: 0,
  status: "idle", currentWord: "",
};

// ─── Interactive Tool Component ─────────────────────────────────────────
function BruteForceTool() {
  const [mode, setMode] = useState<"dictionary" | "brute" | "identify" | "benchmark">("dictionary");
  const [targetHash, setTargetHash] = useState("");
  const [algo, setAlgo] = useState<HashAlgo>("md5");
  const [stats, setStats] = useState<AttackStats>(initialStats);
  const [customWordlist, setCustomWordlist] = useState("");
  const [useMutations, setUseMutations] = useState(true);
  const [charsetKey, setCharsetKey] = useState<CharsetKey>("lower_digits");
  const [customCharset, setCustomCharset] = useState("");
  const [maxLen, setMaxLen] = useState(5);
  const [identifyInput, setIdentifyInput] = useState("");
  const [identifyResult, setIdentifyResult] = useState<ReturnType<typeof identifyHash>>([]);
  const [benchResult, setBenchResult] = useState<{ algo: string; speed: number }[]>([]);
  const [copied, setCopied] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [testPassword, setTestPassword] = useState("");
  const [testResult, setTestResult] = useState<{ cracked: boolean; time: number; method: string; attempts: number; estimatedSeconds?: number; charsetSize?: number; pwLength?: number; browserSpeed?: number } | null>(null);
  const [testRunning, setTestRunning] = useState(false);
  const cancelRef = useRef(false);
  const runningRef = useRef(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((msg: string) => {
    setLog(prev => [...prev.slice(-200), `[${new Date().toLocaleTimeString("fr-FR")}] ${msg}`]);
  }, []);

  // Auto-detect algo from hash
  useEffect(() => {
    if (targetHash.trim()) {
      const matches = identifyHash(targetHash.trim());
      if (matches.length === 1) {
        setAlgo(matches[0].algo);
      }
    }
  }, [targetHash]);

  const copyResult = () => {
    if (stats.found) {
      navigator.clipboard.writeText(stats.found);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ─── Dictionary Attack ──────────────────────────────────────────────
  const runDictionary = async () => {
    if (!targetHash.trim() || runningRef.current) return;
    const hash = targetHash.trim().toLowerCase();
    cancelRef.current = false;
    runningRef.current = true;
    setLog([]);
    addLog(`Attaque dictionnaire demarree sur ${algo.toUpperCase()}`);
    addLog(`Hash cible: ${hash.slice(0, 20)}...${hash.slice(-10)}`);

    // Build wordlist
    let words: string[] = [];
    if (customWordlist.trim()) {
      words = customWordlist.split("\n").map(w => w.trim()).filter(Boolean);
      addLog(`Wordlist personnalisee: ${words.length} mots`);
    } else {
      words = [...COMMON_PASSWORDS];
      addLog(`Wordlist integree: ${words.length} mots`);
    }

    // Apply mutations
    if (useMutations) {
      const mutated: string[] = [];
      for (const w of words) {
        mutated.push(...generateMutations(w));
      }
      words = [...new Set(mutated)];
      addLog(`Avec mutations: ${words.length} candidats`);
    }

    const total = words.length;
    setStats({ tested: 0, total, speed: 0, found: null, elapsed: 0, status: "running", currentWord: "" });

    const start = performance.now();
    const BATCH = 100;

    for (let i = 0; i < words.length; i += BATCH) {
      if (cancelRef.current) {
        setStats(s => ({ ...s, status: "stopped" }));
        addLog(`[STOP] Arrete a ${i}/${total}`);
        runningRef.current = false;
        return;
      }

      const batch = words.slice(i, i + BATCH);
      for (const word of batch) {
        const h = await computeHash(algo, word);
        if (h === hash) {
          const elapsed = (performance.now() - start) / 1000;
          setStats({ tested: i + 1, total, speed: Math.round((i + 1) / elapsed), found: word, elapsed, status: "found", currentWord: word });
          addLog(`[FOUND] Mot de passe trouve: "${word}"`);
          addLog(`Teste ${i + 1} candidats en ${elapsed.toFixed(2)}s`);
          runningRef.current = false;
          return;
        }
      }

      const elapsed = (performance.now() - start) / 1000;
      const tested = Math.min(i + BATCH, total);
      setStats({
        tested, total,
        speed: elapsed > 0 ? Math.round(tested / elapsed) : 0,
        found: null, elapsed, status: "running",
        currentWord: batch[batch.length - 1] || "",
      });

      // Yield to UI
      await new Promise(r => setTimeout(r, 0));
    }

    const elapsed = (performance.now() - start) / 1000;
    setStats(s => ({ ...s, tested: total, elapsed, status: "exhausted", speed: Math.round(total / elapsed) }));
    addLog(`[DONE] Wordlist epuisee — mot de passe non trouve`);
    addLog(`${total} candidats testes en ${elapsed.toFixed(2)}s`);
    runningRef.current = false;
  };

  // ─── Brute Force Attack ─────────────────────────────────────────────
  const runBruteForce = async () => {
    if (!targetHash.trim() || runningRef.current) return;
    const hash = targetHash.trim().toLowerCase();
    cancelRef.current = false;
    runningRef.current = true;
    setLog([]);

    const cs = charsetKey === "custom" ? customCharset : CHARSETS[charsetKey];
    if (!cs) { addLog("[ERR] Charset vide"); runningRef.current = false; return; }

    const total = totalCombinations(cs.length, maxLen);
    addLog(`Brute force demarree sur ${algo.toUpperCase()}`);
    addLog(`Charset: "${cs.length > 20 ? cs.slice(0, 20) + "..." : cs}" (${cs.length} chars)`);
    addLog(`Longueur max: ${maxLen} — ${total.toLocaleString("fr-FR")} combinaisons`);
    if (total > 50_000_000) {
      addLog(`[WARN] ${(total / 1e6).toFixed(0)}M combinaisons — peut prendre du temps dans le navigateur`);
    }

    setStats({ tested: 0, total, speed: 0, found: null, elapsed: 0, status: "running", currentWord: "" });

    const gen = bruteForceGenerator(cs, maxLen);
    const start = performance.now();
    let tested = 0;
    const UPDATE_INTERVAL = 500;
    let lastUpdate = start;

    while (true) {
      if (cancelRef.current) {
        setStats(s => ({ ...s, status: "stopped" }));
        addLog(`[STOP] Arrete a ${tested.toLocaleString("fr-FR")}/${total.toLocaleString("fr-FR")}`);
        runningRef.current = false;
        return;
      }

      const { value: word, done } = gen.next();
      if (done) break;

      const h = await computeHash(algo, word);
      tested++;

      if (h === hash) {
        const elapsed = (performance.now() - start) / 1000;
        setStats({ tested, total, speed: Math.round(tested / elapsed), found: word, elapsed, status: "found", currentWord: word });
        addLog(`[FOUND] Mot de passe: "${word}"`);
        addLog(`${tested.toLocaleString("fr-FR")} essais en ${elapsed.toFixed(2)}s`);
        runningRef.current = false;
        return;
      }

      const now = performance.now();
      if (now - lastUpdate > UPDATE_INTERVAL) {
        const elapsed = (now - start) / 1000;
        setStats({
          tested, total,
          speed: Math.round(tested / elapsed),
          found: null, elapsed, status: "running",
          currentWord: word,
        });
        lastUpdate = now;
        await new Promise(r => setTimeout(r, 0));
      }
    }

    const elapsed = (performance.now() - start) / 1000;
    setStats(s => ({ ...s, tested, elapsed, status: "exhausted", speed: Math.round(tested / elapsed) }));
    addLog(`[DONE] Espace epuise — mot de passe non trouve`);
    runningRef.current = false;
  };

  // ─── Benchmark ──────────────────────────────────────────────────────
  const runBenchmark = async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setLog([]);
    setBenchResult([]);
    addLog("Benchmark de vitesse de hachage...");

    const results: { algo: string; speed: number }[] = [];
    const algos: { key: HashAlgo; name: string }[] = [
      { key: "md5", name: "MD5" },
      { key: "sha1", name: "SHA-1" },
      { key: "sha256", name: "SHA-256" },
      { key: "sha512", name: "SHA-512" },
    ];

    for (const a of algos) {
      const COUNT = 5000;
      const start = performance.now();
      for (let i = 0; i < COUNT; i++) {
        await computeHash(a.key, `benchmark_test_${i}`);
      }
      const elapsed = (performance.now() - start) / 1000;
      const speed = Math.round(COUNT / elapsed);
      results.push({ algo: a.name, speed });
      addLog(`${a.name}: ${speed.toLocaleString("fr-FR")} h/s`);
      await new Promise(r => setTimeout(r, 0));
    }

    setBenchResult(results);
    addLog("Benchmark termine");
    runningRef.current = false;
  };

  const handleStop = () => {
    cancelRef.current = true;
    addLog("[INFO] Arret demande...");
  };

  const handleReset = () => {
    cancelRef.current = true;
    runningRef.current = false;
    setStats(initialStats);
    setLog([]);
  };

  // ─── Smart Pattern Generators ────────────────────────────────────────
  const NAMES_DB = [
    "yanis","yannis","adam","lucas","hugo","leo","louis","nathan","emma","jade",
    "liam","noah","ethan","arthur","raphael","paul","victor","mohamed","amine","karim",
    "sarah","lea","chloe","alice","manon","clara","ines","lina","mia","anna",
    "maxime","alexandre","antoine","baptiste","clement","theo","romain","kevin","dylan","killian",
    "john","james","david","william","richard","charles","joseph","mark","donald","steven",
    "mary","patricia","jennifer","linda","barbara","susan","margaret","lisa","karen",
    "nicolas","julien","thomas","pierre","gabriel","marine","camille","louise","mathis","tom",
    "alex","max","sam","ben","chris","mike","dan","joe","matt","jake",
    "sofiane","bilal","youssef","omar","ali","mehdi","nour","fatima","amina","yasmine",
    "julien","florian","quentin","valentin","bastien","adrien","simon","tristan","robin","axel",
    "andrea","anna","elena","sophia","charlotte","laura","marie","elisa","noemie","aurelie",
  ].filter((v, i, a) => a.indexOf(v) === i);

  const SEPARATORS = ["", ".", "_", "-", "@", "#", "!", "*"];
  const COMMON_SUFFIXES = ["!", "!!", ".", "*", "#", "@", "$", "?", "!!!", "!?", "1!", "123!", ""];
  const YEARS_SHORT = Array.from({ length: 40 }, (_, i) => String(i + 85).padStart(2, "0"))
    .concat(Array.from({ length: 27 }, (_, i) => String(i).padStart(2, "0")));
  const YEARS_FULL = Array.from({ length: 40 }, (_, i) => String(1985 + i));

  function* generateDateCombos(): Generator<string> {
    // Generate DD/MM/YYYY, DDMM, DDMMYY, DDMMYYYY, MMDDYYYY, YYYYMMDD variations
    for (let d = 1; d <= 31; d++) {
      for (let m = 1; m <= 12; m++) {
        const dd = String(d).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        const dRaw = String(d);
        const mRaw = String(m);
        // Short forms
        yield `${dd}${mm}`;
        yield `${dRaw}${mRaw}`;
        yield `${dd}/${mm}`;
        yield `${dd}-${mm}`;
        // With years
        for (const y of YEARS_FULL) {
          const yy = y.slice(2);
          yield `${dd}${mm}${y}`;
          yield `${dRaw}${mRaw}${y}`;
          yield `${dd}${mm}${yy}`;
          yield `${mm}${dd}${y}`;
          yield `${y}${mm}${dd}`;
          yield `${dd}/${mm}/${y}`;
          yield `${dd}-${mm}-${y}`;
          yield `${dRaw}${mm}${y}`;
          yield `${dd}${mRaw}${y}`;
        }
      }
    }
  }

  function* generateSmartCandidates(): Generator<{ candidate: string; pattern: string }> {
    // Phase A: Name + Date + Suffix patterns (rockyou style)
    for (const name of NAMES_DB) {
      const nameVariants = [
        name,
        name.charAt(0).toUpperCase() + name.slice(1),
        name.toUpperCase(),
      ];
      // Name + year
      for (const nv of nameVariants) {
        for (const y of YEARS_FULL) {
          for (const suf of COMMON_SUFFIXES) {
            yield { candidate: `${nv}${y}${suf}`, pattern: `Prenom+Annee+Suffixe (${name}+${y})` };
          }
          yield { candidate: `${nv}${y.slice(2)}`, pattern: `Prenom+Annee courte (${name}+${y.slice(2)})` };
        }
        // Name + short numbers
        for (let n = 0; n <= 999; n++) {
          yield { candidate: `${nv}${n}`, pattern: `Prenom+Nombre (${name}+${n})` };
        }
        // Name + common suffixes
        for (const suf of ["123", "1234", "12345", "123456", "!", "!!", "!!!", "69", "666", "777", "007", "01", "10"]) {
          yield { candidate: `${nv}${suf}`, pattern: `Prenom+Suffixe courant (${name}+${suf})` };
        }
      }
    }

    // Phase B: Name + full date combos (DDMMYYYY style)
    for (const name of NAMES_DB) {
      const nameVariants = [
        name,
        name.charAt(0).toUpperCase() + name.slice(1),
        name.toUpperCase(),
      ];
      for (let d = 1; d <= 31; d++) {
        for (let m = 1; m <= 12; m++) {
          const dd = String(d).padStart(2, "0");
          const mm = String(m).padStart(2, "0");
          const dRaw = String(d);
          for (const y of YEARS_FULL) {
            for (const nv of nameVariants) {
              for (const suf of COMMON_SUFFIXES) {
                // Most common: Name + DDMMYYYY + !
                yield { candidate: `${nv}${dd}${mm}${y}${suf}`, pattern: `Prenom+DateNaissance DDMMYYYY (${name}+${dd}/${mm}/${y})` };
                yield { candidate: `${nv}${dRaw}${m}${y}${suf}`, pattern: `Prenom+DateNaissance DMYYYY (${name}+${dRaw}/${m}/${y})` };
                // MMDDYYYY
                yield { candidate: `${nv}${mm}${dd}${y}${suf}`, pattern: `Prenom+DateNaissance MMDDYYYY (${name}+${mm}/${dd}/${y})` };
                // Short year
                yield { candidate: `${nv}${dd}${mm}${y.slice(2)}${suf}`, pattern: `Prenom+DateNaissance DDMMYY (${name}+${dd}/${mm}/${y.slice(2)})` };
              }
            }
          }
        }
      }
    }

    // Phase C: Date-only passwords
    for (const item of generateDateCombos()) {
      for (const suf of COMMON_SUFFIXES) {
        yield { candidate: `${item}${suf}`, pattern: `Date seule (${item})` };
      }
    }

    // Phase D: Keyboard walks (AZERTY + QWERTY)
    const KEYBOARD_WALKS = [
      "azerty", "azertyuiop", "qwerty", "qwertyuiop", "qwert", "asdfgh", "asdfghjkl",
      "zxcvbn", "zxcvbnm", "1234azerty", "azerty123", "qwerty123", "azer1234",
      "1qaz2wsx", "1q2w3e4r", "1q2w3e4r5t", "zaq1xsw2", "!qaz2wsx",
      "aaaaaa", "bbbbbb", "111111", "000000", "abcdef", "abcdefgh", "abc123",
      "147258369", "159357", "951753", "321654987", "741852963",
    ];
    for (const walk of KEYBOARD_WALKS) {
      const variants = [walk, walk.toUpperCase(), walk.charAt(0).toUpperCase() + walk.slice(1)];
      for (const v of variants) {
        for (const suf of COMMON_SUFFIXES) {
          yield { candidate: `${v}${suf}`, pattern: `Suite clavier (${walk})` };
        }
      }
    }

    // Phase E: Repeated/mirror patterns
    for (const name of NAMES_DB.slice(0, 30)) {
      const cap = name.charAt(0).toUpperCase() + name.slice(1);
      yield { candidate: `${name}${name}`, pattern: `Double prenom` };
      yield { candidate: `${cap}${cap}`, pattern: `Double prenom` };
      yield { candidate: `${name}${name.split("").reverse().join("")}`, pattern: `Prenom+Miroir` };
      yield { candidate: `${cap}${name.split("").reverse().join("")}`, pattern: `Prenom+Miroir` };
      // ilovename
      for (const prefix of ["ilove", "ilov", "love", "je", "jetaime", "jaime", "mon", "ma"]) {
        yield { candidate: `${prefix}${name}`, pattern: `Sentiment+Prenom (${prefix}+${name})` };
        yield { candidate: `${prefix}${cap}`, pattern: `Sentiment+Prenom (${prefix}+${name})` };
      }
    }
  }

  // ─── Password Tester ────────────────────────────────────────────────
  const runPasswordTest = async () => {
    if (!testPassword || testRunning) return;
    setTestRunning(true);
    setTestResult(null);
    const pw = testPassword;
    const target = md5(pw);
    const start = performance.now();
    let attempts = 0;

    const check = (candidate: string): boolean => {
      attempts++;
      return md5(candidate) === target;
    };

    // ── Phase 1: Dictionary exact match ──
    for (const word of COMMON_PASSWORDS) {
      if (check(word)) {
        setTestResult({ cracked: true, time: (performance.now() - start) / 1000, method: "Dictionnaire — mot de passe present dans les listes les plus connues (rockyou, SecLists...)", attempts });
        setTestRunning(false);
        return;
      }
    }

    // ── Phase 2: Dictionary + full mutations ──
    for (const word of COMMON_PASSWORDS) {
      for (const m of generateMutations(word)) {
        if (check(m)) {
          setTestResult({ cracked: true, time: (performance.now() - start) / 1000, method: `Dictionnaire + mutations — variante du mot courant "${word}"`, attempts });
          setTestRunning(false);
          return;
        }
      }
      if (attempts % 5000 === 0) await new Promise(r => setTimeout(r, 0));
    }

    // ── Phase 3: Smart pattern attack (Prenom+Date, clavier, etc.) ──
    let smartCount = 0;
    for (const { candidate, pattern } of generateSmartCandidates()) {
      if (check(candidate)) {
        setTestResult({ cracked: true, time: (performance.now() - start) / 1000, method: `Analyse de patterns — ${pattern}`, attempts });
        setTestRunning(false);
        return;
      }
      smartCount++;
      if (smartCount % 20000 === 0) await new Promise(r => setTimeout(r, 0));
      // Cap at 15M smart attempts to avoid infinite loop
      if (smartCount >= 15_000_000) break;
    }

    // ── Phase 4: Brute force with detected charset ──
    const hasLower = /[a-z]/.test(pw);
    const hasUpper = /[A-Z]/.test(pw);
    const hasDigit = /\d/.test(pw);
    const hasSymbol = /[^a-zA-Z0-9]/.test(pw);

    let bruteCharset = "";
    if (hasLower) bruteCharset += "abcdefghijklmnopqrstuvwxyz";
    if (hasUpper) bruteCharset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (hasDigit) bruteCharset += "0123456789";
    if (hasSymbol) bruteCharset += "!@#$%^&*";
    if (!bruteCharset) bruteCharset = "abcdefghijklmnopqrstuvwxyz";

    const bruteMaxLen = Math.min(pw.length, 6);
    let bruteCount = 0;

    for (const candidate of bruteForceGenerator(bruteCharset, bruteMaxLen)) {
      if (check(candidate)) {
        setTestResult({ cracked: true, time: (performance.now() - start) / 1000, method: `Brute force — mot de passe trop court/simple (${pw.length} car., charset ${bruteCharset.length} chars)`, attempts });
        setTestRunning(false);
        return;
      }
      bruteCount++;
      if (bruteCount % 50000 === 0) await new Promise(r => setTimeout(r, 0));
      if (bruteCount >= 3_000_000) break;
    }

    // ── Phase 5: Not cracked — estimation ──
    const elapsed = (performance.now() - start) / 1000;
    const speed = Math.round(attempts / elapsed);
    const fullCharsetSize = (hasLower ? 26 : 0) + (hasUpper ? 26 : 0) + (hasDigit ? 10 : 0) + (hasSymbol ? 33 : 0) || 26;
    let totalSpace = 0;
    for (let i = 1; i <= pw.length; i++) totalSpace += Math.pow(fullCharsetSize, i);
    const estimatedSeconds = totalSpace / (speed || 1);

    setTestResult({ cracked: false, time: elapsed, method: "", attempts, estimatedSeconds, charsetSize: fullCharsetSize, pwLength: pw.length, browserSpeed: speed });
    setTestRunning(false);
  };

  const getPasswordStrength = (pw: string): { label: string; color: string; pct: number; detail: string } => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (pw.length >= 16) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    if (pw.length < 6) return { label: "Tres faible", color: "#ef4444", pct: 10, detail: "Moins de 6 caracteres : crackable en quelques secondes" };
    if (score <= 2) return { label: "Faible", color: "#f59e0b", pct: 30, detail: "Ajoutez des majuscules, chiffres et symboles" };
    if (score <= 3) return { label: "Moyen", color: "#eab308", pct: 50, detail: "Correct mais peut etre ameliore" };
    if (score <= 4) return { label: "Fort", color: "#22c55e", pct: 75, detail: "Bon mot de passe, difficile a cracker" };
    return { label: "Tres fort", color: "#39ff14", pct: 100, detail: "Excellent ! Quasiment impossible a cracker par brute force" };
  };

  const progress = stats.total > 0 ? (stats.tested / stats.total) * 100 : 0;

  // Auto-scroll logs
  useEffect(() => {
    const el = logEndRef.current;
    if (el?.parentElement) {
      el.parentElement.scrollTop = el.parentElement.scrollHeight;
    }
  }, [log]);

  return (
    <div className="space-y-6">

      {/* ── Mode Selector ─────────────────────────────────────── */}
      <div className="rounded-xl p-1.5" style={{ background: "rgba(10,10,15,0.6)", border: "1px solid #1e293b" }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {([
            { key: "dictionary" as const, label: "Dictionnaire", icon: BookOpen, desc: "Teste une liste de mots de passe courants" },
            { key: "brute" as const, label: "Brute Force", icon: Crosshair, desc: "Essaie toutes les combinaisons possibles" },
            { key: "identify" as const, label: "Identifier", icon: Eye, desc: "Reconnait le type de hash automatiquement" },
            { key: "benchmark" as const, label: "Benchmark", icon: Gauge, desc: "Mesure la vitesse de calcul (hash/seconde)" },
          ]).map(m => (
            <button
              key={m.key}
              onClick={() => { setMode(m.key); handleReset(); }}
              className="relative rounded-lg px-3 py-3 transition-all duration-300 text-center group"
              style={{
                background: mode === m.key
                  ? "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.08))"
                  : "transparent",
                border: mode === m.key ? "1px solid rgba(239,68,68,0.25)" : "1px solid transparent",
                boxShadow: mode === m.key ? "0 0 20px rgba(239,68,68,0.08), inset 0 1px 0 rgba(239,68,68,0.1)" : "none",
              }}
            >
              <m.icon
                className="w-4 h-4 mx-auto mb-1.5 transition-colors"
                style={{ color: mode === m.key ? "#ef4444" : "#4a5568" }}
              />
              <p className="transition-colors" style={{ color: mode === m.key ? "#ef4444" : "#94a3b8", fontSize: "0.78rem", fontFamily: "Orbitron, sans-serif" }}>
                {m.label}
              </p>
              <p style={{ color: "#4a5568", fontSize: "0.62rem" }}>{m.desc}</p>
              {mode === m.key && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#ef4444]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Hash Input (shared between dict & brute) ──────────── */}
      {(mode === "dictionary" || mode === "brute") && (
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1e293b" }}>
            <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "#0f172a", borderBottom: "1px solid #1e293b" }}>
              <Target className="w-3.5 h-3.5 text-[#ef4444]" />
              <span className="text-[#94a3b8]" style={{ fontSize: "0.75rem", fontFamily: "Orbitron, sans-serif" }}>Hash a cracker</span>
              {targetHash.trim() && (() => {
                const matches = identifyHash(targetHash.trim());
                return matches.length > 0 ? (
                  <span className="ml-auto px-2 py-0.5 rounded-full" style={{ background: "rgba(57,255,20,0.08)", fontSize: "0.65rem", color: "#39ff14", fontFamily: "JetBrains Mono, monospace" }}>
                    {matches[0].name} detecte
                  </span>
                ) : null;
              })()}
            </div>
            <div style={{ background: "#0a0a0f" }}>
              <input
                value={targetHash}
                onChange={e => setTargetHash(e.target.value)}
                placeholder="Collez le hash du mot de passe a retrouver (ex: 5f4dcc3b...)"
                className="w-full px-4 py-3.5 bg-transparent text-[#e2e8f0] placeholder-[#2a3441] focus:outline-none"
                style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.85rem", caretColor: "#ef4444" }}
              />
            </div>
          </div>

          {/* Explication : qu'est-ce qu'un hash ? */}
          <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg" style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.1)" }}>
            <Info className="w-3.5 h-3.5 text-[#3b82f6] flex-shrink-0 mt-0.5" />
            <p className="text-[#64748b]" style={{ fontSize: "0.7rem", lineHeight: 1.6 }}>
              <span className="text-[#94a3b8]">Un hash</span> est une empreinte numerique unique generee a partir d'un mot de passe.
              C'est comme une empreinte digitale : on ne peut pas remonter au mot de passe directement,
              mais on peut tester des mots de passe un par un jusqu'a trouver celui qui produit le meme hash.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[#4a5568]" style={{ fontSize: "0.72rem", fontFamily: "Orbitron, sans-serif" }}>ALGO</span>
              <span className="text-[#3d4f63]" style={{ fontSize: "0.62rem" }}>(algorithme de hachage utilise)</span>
            </div>
            <div className="flex gap-1">
              {(["md5", "sha1", "sha256", "sha512"] as HashAlgo[]).map(a => (
                <button key={a} onClick={() => setAlgo(a)}
                  className="relative px-4 py-2 rounded-lg transition-all duration-200"
                  style={{
                    background: algo === a ? "rgba(239,68,68,0.12)" : "rgba(17,24,39,0.5)",
                    border: `1px solid ${algo === a ? "rgba(239,68,68,0.3)" : "rgba(30,41,59,0.6)"}`,
                    color: algo === a ? "#ef4444" : "#64748b",
                    fontSize: "0.78rem", fontFamily: "JetBrains Mono, monospace",
                    boxShadow: algo === a ? "0 0 12px rgba(239,68,68,0.1)" : "none",
                  }}
                >
                  {a.toUpperCase()}
                </button>
              ))}
            </div>
            {/* Explication des algos */}
            <div className="w-full mt-1 flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(59,130,246,0.03)", border: "1px solid rgba(59,130,246,0.06)" }}>
              <Info className="w-3 h-3 text-[#3b82f6]/50 flex-shrink-0 mt-0.5" />
              <p className="text-[#4a5568]" style={{ fontSize: "0.62rem", lineHeight: 1.5 }}>
                <span className="text-[#64748b]">MD5</span> = ancien, rapide a cracker ·
                <span className="text-[#64748b]"> SHA-1</span> = obsolete, vulnerable ·
                <span className="text-[#64748b]"> SHA-256/512</span> = plus securises, plus lents a cracker
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Dictionary Mode ───────────────────────────────────── */}
      {mode === "dictionary" && (
        <div className="space-y-4">
          <div className="rounded-xl p-4" style={{ background: "rgba(17,24,39,0.3)", border: "1px solid #1e293b" }}>
            <div className="flex flex-col sm:flex-row gap-4">
              <label className="flex items-center gap-3 cursor-pointer group flex-1" onClick={() => setUseMutations(!useMutations)}>
                <div className="relative w-10 h-5 rounded-full transition-all duration-300 flex-shrink-0"
                  style={{ background: useMutations ? "rgba(239,68,68,0.3)" : "#1e293b", border: `1px solid ${useMutations ? "rgba(239,68,68,0.4)" : "#2d3a4f"}` }}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300"
                    style={{ background: useMutations ? "#ef4444" : "#4a5568", left: useMutations ? "calc(100% - 18px)" : "2px", boxShadow: useMutations ? "0 0 8px rgba(239,68,68,0.4)" : "none" }} />
                </div>
                <div>
                  <p className="text-[#e2e8f0]" style={{ fontSize: "0.8rem" }}>Mutations intelligentes</p>
                  <p className="text-[#4a5568]" style={{ fontSize: "0.68rem" }}>Variantes automatiques de chaque mot (ex: "password" → "p@ssw0rd", "Password1!", "drowssap"...)</p>
                </div>
              </label>
              <div className="flex items-center gap-3 px-4 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.08)" }}>
                <List className="w-4 h-4 text-[#ef4444]" />
                <div>
                  <p className="text-[#ef4444]" style={{ fontSize: "0.82rem", fontFamily: "JetBrains Mono, monospace" }}>
                    {customWordlist.trim() ? `${customWordlist.split("\n").filter(Boolean).length} mots` : `${COMMON_PASSWORDS.length} mots`}
                  </p>
                  <p className="text-[#4a5568]" style={{ fontSize: "0.62rem" }}>{useMutations ? "~x50 avec mutations" : "sans mutations"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1e293b" }}>
            <div className="flex items-center gap-2 px-4 py-2" style={{ background: "#0f172a", borderBottom: "1px solid #1e293b" }}>
              <BookOpen className="w-3.5 h-3.5 text-[#f59e0b]" />
              <span className="text-[#94a3b8]" style={{ fontSize: "0.72rem" }}>Wordlist personnalisee</span>
              <span className="text-[#2a3441]" style={{ fontSize: "0.65rem" }}>(optionnel — une wordlist est une liste de mots de passe a tester, un par ligne)</span>
            </div>
            <textarea
              value={customWordlist}
              onChange={e => setCustomWordlist(e.target.value)}
              rows={3}
              placeholder={"admin\npassword123\nmonSuperMotDePasse\n...ou laissez vide pour la wordlist integree"}
              className="w-full px-4 py-3 bg-[#0a0a0f] text-[#e2e8f0] placeholder-[#1e293b] focus:outline-none resize-none"
              style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.78rem", caretColor: "#ef4444" }}
            />
          </div>

          <button onClick={runDictionary} disabled={!targetHash.trim() || stats.status === "running"}
            className="w-full py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-30 group hover:scale-[1.005]"
            style={{
              background: stats.status === "running" ? "rgba(239,68,68,0.1)" : "linear-gradient(135deg, #ef4444, #b91c1c)",
              border: "1px solid rgba(239,68,68,0.3)", color: stats.status === "running" ? "#ef4444" : "#fff",
              fontFamily: "Orbitron, sans-serif", fontSize: "0.9rem",
              boxShadow: stats.status !== "running" ? "0 0 30px rgba(239,68,68,0.15)" : "none",
            }}>
            {stats.status === "running" ? <><Loader2 className="w-5 h-5 animate-spin" /> Attaque en cours...</> : <><Play className="w-5 h-5 group-hover:scale-110 transition-transform" /> Lancer l'attaque dictionnaire</>}
          </button>
        </div>
      )}

      {/* ── Brute Force Mode ──────────────────────────────────── */}
      {mode === "brute" && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl p-4" style={{ background: "rgba(17,24,39,0.3)", border: "1px solid #1e293b" }}>
              <label className="text-[#64748b] flex items-center gap-2 mb-1" style={{ fontSize: "0.72rem", fontFamily: "Orbitron, sans-serif" }}>
                <Settings className="w-3 h-3" /> CHARSET
              </label>
              <p className="text-[#3d4f63] mb-2.5" style={{ fontSize: "0.6rem" }}>Jeu de caracteres : quels caracteres seront utilises pour generer les combinaisons</p>
              <select value={charsetKey} onChange={e => setCharsetKey(e.target.value as CharsetKey)}
                className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-[#1e293b] rounded-lg text-[#e2e8f0] focus:outline-none focus:border-[#ef4444]/30 cursor-pointer"
                style={{ fontSize: "0.8rem" }}>
                <option value="digits">0-9 (chiffres)</option>
                <option value="lower">a-z (minuscules)</option>
                <option value="upper">A-Z (majuscules)</option>
                <option value="lower_digits">a-z + 0-9</option>
                <option value="alphanum">a-zA-Z0-9</option>
                <option value="all">Tout (+ symboles)</option>
                <option value="custom">Personnalise...</option>
              </select>
              {charsetKey === "custom" && (
                <input value={customCharset} onChange={e => setCustomCharset(e.target.value)} placeholder="abc123!@#"
                  className="w-full mt-2 px-3 py-2 bg-[#0a0a0f] border border-[#1e293b] rounded-lg text-[#e2e8f0] placeholder-[#2a3441] focus:outline-none"
                  style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.78rem" }} />
              )}
            </div>
            <div className="rounded-xl p-4" style={{ background: "rgba(17,24,39,0.3)", border: "1px solid #1e293b" }}>
              <label className="text-[#64748b] flex items-center gap-2 mb-1" style={{ fontSize: "0.72rem", fontFamily: "Orbitron, sans-serif" }}>
                <Hash className="w-3 h-3" /> LONGUEUR MAX
              </label>
              <p className="text-[#3d4f63] mb-2.5" style={{ fontSize: "0.6rem" }}>Nombre max de caracteres a tester (plus c'est long, plus c'est lent)</p>
              <div className="flex items-center gap-3">
                <input type="range" min={1} max={8} value={maxLen} onChange={e => setMaxLen(+e.target.value)} className="flex-1 accent-[#ef4444]" />
                <span className="text-[#ef4444] w-8 text-center" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "1.1rem" }}>{maxLen}</span>
              </div>
              <div className="mt-3 px-3 py-2 rounded-lg flex items-center gap-2" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.08)" }}>
                <Cpu className="w-3 h-3 text-[#ef4444]" />
                <span className="text-[#94a3b8]" style={{ fontSize: "0.72rem", fontFamily: "JetBrains Mono, monospace" }}>
                  {totalCombinations((charsetKey === "custom" ? customCharset : CHARSETS[charsetKey]).length, maxLen).toLocaleString("fr-FR")} combinaisons a tester
                </span>
              </div>
            </div>
          </div>

          <button onClick={runBruteForce} disabled={!targetHash.trim() || stats.status === "running"}
            className="w-full py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-30 group hover:scale-[1.005]"
            style={{
              background: stats.status === "running" ? "rgba(239,68,68,0.1)" : "linear-gradient(135deg, #ef4444, #b91c1c)",
              border: "1px solid rgba(239,68,68,0.3)", color: stats.status === "running" ? "#ef4444" : "#fff",
              fontFamily: "Orbitron, sans-serif", fontSize: "0.9rem",
              boxShadow: stats.status !== "running" ? "0 0 30px rgba(239,68,68,0.15)" : "none",
            }}>
            {stats.status === "running" ? <><Loader2 className="w-5 h-5 animate-spin" /> Force brute en cours...</> : <><Crosshair className="w-5 h-5 group-hover:scale-110 transition-transform" /> Lancer le brute force</>}
          </button>
        </div>
      )}

      {/* ── Identify Mode ─────────────────────────────────────── */}
      {mode === "identify" && (
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg" style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.1)" }}>
            <Info className="w-3.5 h-3.5 text-[#8b5cf6] flex-shrink-0 mt-0.5" />
            <p className="text-[#64748b]" style={{ fontSize: "0.7rem", lineHeight: 1.6 }}>
              Collez un hash et l'outil detectera automatiquement quel algorithme a ete utilise pour le generer, en analysant sa longueur et son format.
            </p>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1e293b" }}>
            <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "#0f172a", borderBottom: "1px solid #1e293b" }}>
              <Eye className="w-3.5 h-3.5 text-[#8b5cf6]" />
              <span className="text-[#94a3b8]" style={{ fontSize: "0.75rem", fontFamily: "Orbitron, sans-serif" }}>Identification de hash</span>
            </div>
            <div className="flex" style={{ background: "#0a0a0f" }}>
              <input value={identifyInput} onChange={e => setIdentifyInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") setIdentifyResult(identifyHash(identifyInput)); }}
                placeholder="Collez un hash pour identifier son type..."
                className="flex-1 px-4 py-3.5 bg-transparent text-[#e2e8f0] placeholder-[#2a3441] focus:outline-none"
                style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.85rem", caretColor: "#8b5cf6" }} />
              <button onClick={() => setIdentifyResult(identifyHash(identifyInput))} className="px-5 text-[#8b5cf6] hover:bg-[#8b5cf6]/10 transition-colors">
                <Eye className="w-5 h-5" />
              </button>
            </div>
          </div>
          {identifyResult.length > 0 && (
            <div className="space-y-2">
              {identifyResult.map(r => (
                <div key={r.name} className="rounded-xl p-4 flex items-center gap-4" style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.15)" }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(139,92,246,0.12)" }}>
                    <Hash className="w-5 h-5 text-[#8b5cf6]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[#e2e8f0]" style={{ fontSize: "0.9rem" }}>{r.name}</p>
                    <p className="text-[#64748b]" style={{ fontSize: "0.72rem" }}>
                      {r.bits} bits — {r.name === "MD5" ? "Faible, facilement crackable" : r.name === "SHA-1" ? "Deprecated, vulnerable aux collisions" : "Resistant mais crackable par dictionnaire"}
                    </p>
                  </div>
                  <button onClick={() => { setAlgo(r.algo); setTargetHash(identifyInput); setMode("dictionary"); }}
                    className="px-4 py-2 rounded-lg text-[#ef4444] hover:bg-[#ef4444]/10 transition-all"
                    style={{ fontSize: "0.78rem", border: "1px solid rgba(239,68,68,0.15)", fontFamily: "Orbitron, sans-serif" }}>
                    Attaquer
                  </button>
                </div>
              ))}
            </div>
          )}
          {identifyInput && identifyResult.length === 0 && (
            <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <AlertTriangle className="w-5 h-5 text-[#f59e0b]" />
              <p className="text-[#f59e0b]" style={{ fontSize: "0.82rem" }}>Type de hash non reconnu. Verifiez le format.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Benchmark Mode ────────────────────────────────────── */}
      {mode === "benchmark" && (
        <div className="space-y-4">
          <div className="rounded-xl p-5 text-center" style={{ background: "rgba(17,24,39,0.3)", border: "1px solid #1e293b" }}>
            <Gauge className="w-10 h-10 text-[#ef4444] mx-auto mb-3 opacity-60" />
            <p className="text-[#94a3b8] mb-4" style={{ fontSize: "0.85rem" }}>
              Mesure la vitesse de hachage de votre navigateur pour chaque algorithme (5 000 hash/algo).
            </p>
            <button onClick={runBenchmark} disabled={runningRef.current}
              className="px-8 py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-30 mx-auto hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, #ef4444, #b91c1c)", color: "#fff", fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem", boxShadow: "0 0 20px rgba(239,68,68,0.15)" }}>
              <Gauge className="w-4 h-4" /> Lancer le benchmark
            </button>
          </div>
          {benchResult.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-3">
              {benchResult.map((r, i) => (
                <div key={r.algo} className="rounded-xl p-4 flex items-center justify-between"
                  style={{ background: `rgba(239,68,68,${0.03 + i * 0.02})`, border: "1px solid rgba(239,68,68,0.1)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
                      <Hash className="w-4 h-4 text-[#ef4444]" />
                    </div>
                    <span className="text-[#e2e8f0]" style={{ fontSize: "0.88rem", fontFamily: "JetBrains Mono, monospace" }}>{r.algo}</span>
                  </div>
                  <span className="text-[#39ff14]" style={{ fontSize: "0.95rem", fontFamily: "JetBrains Mono, monospace" }}>
                    {r.speed.toLocaleString("fr-FR")} <span className="text-[#4a5568]" style={{ fontSize: "0.68rem" }}>h/s</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Controls (Stop / Reset) ───────────────────────────── */}
      {stats.status === "running" && (
        <div className="flex gap-2">
          <button onClick={handleStop}
            className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.005]"
            style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b", fontFamily: "Orbitron, sans-serif", fontSize: "0.82rem" }}>
            <Square className="w-4 h-4" /> Arreter
          </button>
          <button onClick={handleReset}
            className="px-5 py-3 rounded-xl flex items-center gap-2 transition-all"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1e293b", color: "#64748b", fontSize: "0.82rem" }}>
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      )}
      {(stats.status === "found" || stats.status === "exhausted" || stats.status === "stopped") && (
        <button onClick={handleReset}
          className="w-full py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:bg-white/5"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1e293b", color: "#94a3b8", fontFamily: "Orbitron, sans-serif", fontSize: "0.82rem" }}>
          <RotateCcw className="w-4 h-4" /> Nouvelle attaque
        </button>
      )}

      {/* ── Stats Dashboard ───────────────────────────────────── */}
      {stats.status !== "idle" && (mode === "dictionary" || mode === "brute") && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1e293b" }}>
          <div className="p-4" style={{ background: "#0f172a" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#94a3b8]" style={{ fontSize: "0.78rem" }}>
                {stats.tested.toLocaleString("fr-FR")} / {stats.total.toLocaleString("fr-FR")}
              </span>
              <span className="px-2.5 py-0.5 rounded-full" style={{
                background: stats.found ? "rgba(57,255,20,0.1)" : stats.status === "exhausted" ? "rgba(245,158,11,0.1)" : stats.status === "stopped" ? "rgba(148,163,184,0.1)" : "rgba(239,68,68,0.1)",
                color: stats.found ? "#39ff14" : stats.status === "exhausted" ? "#f59e0b" : stats.status === "stopped" ? "#94a3b8" : "#ef4444",
                fontSize: "0.68rem", fontFamily: "JetBrains Mono, monospace",
              }}>
                {stats.found ? "CRACKED" : stats.status === "running" ? `${progress.toFixed(1)}%` : stats.status === "exhausted" ? "EPUISE" : "STOP"}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[#1e293b] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{
                width: `${Math.min(progress, 100)}%`,
                background: stats.found ? "linear-gradient(90deg, #39ff14, #22c55e)" : stats.status === "exhausted" ? "linear-gradient(90deg, #f59e0b, #d97706)" : "linear-gradient(90deg, #ef4444, #dc2626)",
                boxShadow: stats.found ? "0 0 10px rgba(57,255,20,0.4)" : stats.status === "running" ? "0 0 10px rgba(239,68,68,0.3)" : "none",
              }} />
            </div>
          </div>

          <div className="grid grid-cols-4 divide-x divide-[#1e293b]" style={{ borderTop: "1px solid #1e293b" }}>
            {[
              { label: "VITESSE", value: `${stats.speed.toLocaleString("fr-FR")}`, unit: "h/s", color: "#00d4ff" },
              { label: "TEMPS", value: stats.elapsed < 60 ? `${stats.elapsed.toFixed(1)}` : `${(stats.elapsed / 60).toFixed(1)}`, unit: stats.elapsed < 60 ? "sec" : "min", color: "#8b5cf6" },
              { label: "TESTE", value: stats.tested > 1000 ? `${(stats.tested / 1000).toFixed(1)}K` : `${stats.tested}`, unit: "", color: "#f59e0b" },
              { label: "CANDIDAT", value: stats.currentWord || "\u2014", unit: "", color: "#64748b", isMono: true },
            ].map((s, i) => (
              <div key={i} className="px-3 py-3 text-center" style={{ background: "rgba(10,10,15,0.6)" }}>
                <p className="text-[#3a4553] mb-1" style={{ fontSize: "0.6rem", fontFamily: "Orbitron, sans-serif", letterSpacing: "0.05em" }}>{s.label}</p>
                <p className="text-[#e2e8f0] truncate" style={{ fontSize: s.isMono ? "0.72rem" : "0.95rem", fontFamily: "JetBrains Mono, monospace", color: s.isMono ? "#64748b" : s.color }}>
                  {s.value}{s.unit && <span className="text-[#3a4553]" style={{ fontSize: "0.55rem" }}> {s.unit}</span>}
                </p>
              </div>
            ))}
          </div>

          {stats.found && (
            <div className="p-5 flex items-center gap-4" style={{ background: "rgba(57,255,20,0.04)", borderTop: "1px solid rgba(57,255,20,0.15)" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(57,255,20,0.1)", boxShadow: "0 0 20px rgba(57,255,20,0.1)" }}>
                <CheckCircle className="w-6 h-6 text-[#39ff14]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#39ff14] mb-0.5" style={{ fontSize: "0.72rem", fontFamily: "Orbitron, sans-serif" }}>Mot de passe craque</p>
                <p className="text-[#e2e8f0] truncate" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "1.15rem" }}>{stats.found}</p>
              </div>
              <button onClick={copyResult} className="px-4 py-2.5 rounded-lg transition-all hover:scale-105 flex items-center gap-2"
                style={{ background: copied ? "rgba(57,255,20,0.15)" : "rgba(57,255,20,0.08)", border: "1px solid rgba(57,255,20,0.2)", color: "#39ff14", fontSize: "0.78rem" }}>
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copie" : "Copier"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Tester votre mot de passe ─────────────────────────── */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1e293b" }}>
        <div className="flex items-center gap-2 px-4 py-3" style={{ background: "#0f172a", borderBottom: "1px solid #1e293b" }}>
          <Shield className="w-4 h-4 text-[#00d4ff]" />
          <span className="text-[#e2e8f0]" style={{ fontSize: "0.82rem", fontFamily: "Orbitron, sans-serif" }}>Tester votre mot de passe</span>
        </div>
        <div className="p-4 space-y-4" style={{ background: "rgba(10,10,15,0.6)" }}>
          <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg" style={{ background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.1)" }}>
            <Info className="w-3.5 h-3.5 text-[#00d4ff] flex-shrink-0 mt-0.5" />
            <p className="text-[#64748b]" style={{ fontSize: "0.7rem", lineHeight: 1.6 }}>
              Entrez un mot de passe pour voir en combien de temps il serait cracke.
              L'outil le teste en temps reel avec les memes techniques (dictionnaire, mutations, brute force).
              <span className="text-[#4a5568]"> Votre mot de passe ne quitte jamais votre navigateur.</span>
            </p>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 rounded-xl overflow-hidden" style={{ border: "1px solid #1e293b" }}>
              <input
                type="text"
                value={testPassword}
                onChange={e => { setTestPassword(e.target.value); setTestResult(null); }}
                placeholder="Tapez un mot de passe a tester..."
                className="w-full px-4 py-3.5 bg-[#0a0a0f] text-[#e2e8f0] placeholder-[#2a3441] focus:outline-none"
                style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.85rem", caretColor: "#00d4ff" }}
                onKeyDown={e => { if (e.key === "Enter") runPasswordTest(); }}
              />
            </div>
            <button
              onClick={runPasswordTest}
              disabled={!testPassword.trim() || testRunning}
              className="px-6 py-3.5 rounded-xl transition-all flex items-center gap-2 disabled:opacity-30 hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, #00d4ff, #0284c7)", color: "#fff", fontFamily: "Orbitron, sans-serif", fontSize: "0.82rem", boxShadow: "0 0 15px rgba(0,212,255,0.15)" }}
            >
              {testRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Tester
            </button>
          </div>

          {/* Strength bar */}
          {testPassword.length > 0 && (() => {
            const s = getPasswordStrength(testPassword);
            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#64748b]" style={{ fontSize: "0.72rem" }}>Robustesse estimee</span>
                  <span style={{ color: s.color, fontSize: "0.75rem", fontFamily: "Orbitron, sans-serif" }}>{s.label}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#1e293b] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s.pct}%`, background: s.color, boxShadow: `0 0 8px ${s.color}40` }} />
                </div>
                <p className="text-[#4a5568]" style={{ fontSize: "0.65rem" }}>{s.detail}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {[
                    { test: testPassword.length >= 8, label: "8+ caracteres" },
                    { test: /[a-z]/.test(testPassword) && /[A-Z]/.test(testPassword), label: "Majuscules + minuscules" },
                    { test: /\d/.test(testPassword), label: "Chiffres" },
                    { test: /[^a-zA-Z0-9]/.test(testPassword), label: "Symboles (!@#...)" },
                    { test: testPassword.length >= 12, label: "12+ caracteres" },
                  ].map((c, i) => (
                    <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{
                      background: c.test ? "rgba(57,255,20,0.06)" : "rgba(239,68,68,0.06)",
                      border: `1px solid ${c.test ? "rgba(57,255,20,0.15)" : "rgba(239,68,68,0.1)"}`,
                      fontSize: "0.6rem", color: c.test ? "#39ff14" : "#ef4444",
                    }}>
                      {c.test ? <CheckCircle className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                      {c.label}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Test result */}
          {testResult && (
            <div className="rounded-xl p-4" style={{
              background: testResult.cracked ? "rgba(239,68,68,0.06)" : "rgba(57,255,20,0.06)",
              border: `1px solid ${testResult.cracked ? "rgba(239,68,68,0.2)" : "rgba(57,255,20,0.2)"}`,
            }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{
                  background: testResult.cracked ? "rgba(239,68,68,0.1)" : "rgba(57,255,20,0.1)",
                  boxShadow: `0 0 15px ${testResult.cracked ? "rgba(239,68,68,0.1)" : "rgba(57,255,20,0.1)"}`,
                }}>
                  {testResult.cracked
                    ? <AlertTriangle className="w-5 h-5 text-[#ef4444]" />
                    : <Shield className="w-5 h-5 text-[#39ff14]" />}
                </div>
                <div className="flex-1">
                  <p style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.82rem", color: testResult.cracked ? "#ef4444" : "#39ff14" }}>
                    {testResult.cracked ? "Mot de passe cracke !" : "Mot de passe resistant !"}
                  </p>
                  <p className="text-[#94a3b8] mt-1" style={{ fontSize: "0.78rem" }}>
                    {testResult.cracked
                      ? <>Cracke en <span className="text-[#ef4444]" style={{ fontFamily: "JetBrains Mono, monospace" }}>{testResult.time < 0.01 ? "< 0.01" : testResult.time.toFixed(2)}s</span> apres <span style={{ fontFamily: "JetBrains Mono, monospace" }}>{testResult.attempts.toLocaleString("fr-FR")}</span> tentatives</>
                      : <>Resiste a <span className="text-[#39ff14]" style={{ fontFamily: "JetBrains Mono, monospace" }}>{testResult.attempts.toLocaleString("fr-FR")}</span> tentatives en <span style={{ fontFamily: "JetBrains Mono, monospace" }}>{testResult.time.toFixed(2)}s</span></>
                    }
                  </p>
                  {testResult.cracked && (
                    <p className="text-[#f59e0b] mt-1.5" style={{ fontSize: "0.7rem" }}>
                      <span className="text-[#f59e0b]/80">Methode :</span> {testResult.method}
                    </p>
                  )}
                  {!testResult.cracked && testResult.estimatedSeconds != null && (() => {
                    const s = testResult.estimatedSeconds!;
                    const formatTime = (sec: number): string => {
                      if (sec < 60) return `${sec.toFixed(1)} secondes`;
                      if (sec < 3600) return `${(sec / 60).toFixed(0)} minutes`;
                      if (sec < 86400) return `${(sec / 3600).toFixed(1)} heures`;
                      if (sec < 86400 * 365) return `${(sec / 86400).toFixed(0)} jours`;
                      if (sec < 86400 * 365 * 1000) return `${(sec / (86400 * 365)).toFixed(0)} ans`;
                      if (sec < 86400 * 365 * 1e6) return `${(sec / (86400 * 365 * 1000)).toFixed(0)} milliers d'annees`;
                      if (sec < 86400 * 365 * 1e9) return `${(sec / (86400 * 365 * 1e6)).toFixed(0)} millions d'annees`;
                      return `${(sec / (86400 * 365 * 1e9)).toFixed(0)} milliards d'annees`;
                    };
                    const gpuSpeed = (testResult.browserSpeed || 1) * 10000;
                    const gpuTime = (testResult.estimatedSeconds! * (testResult.browserSpeed || 1)) / gpuSpeed;
                    return (
                      <div className="mt-2 space-y-1.5">
                        <p className="text-[#39ff14]/60" style={{ fontSize: "0.7rem" }}>
                          Resiste a {testResult.attempts.toLocaleString("fr-FR")} tentatives. Espace total : {testResult.charsetSize}<sup>{testResult.pwLength}</sup> combinaisons.
                        </p>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div className="px-3 py-2 rounded-lg" style={{ background: "rgba(57,255,20,0.04)", border: "1px solid rgba(57,255,20,0.1)" }}>
                            <p className="text-[#4a5568]" style={{ fontSize: "0.6rem" }}>Navigateur (~{(testResult.browserSpeed || 0).toLocaleString("fr-FR")} h/s)</p>
                            <p className="text-[#39ff14]" style={{ fontSize: "0.82rem", fontFamily: "JetBrains Mono, monospace" }}>{formatTime(s)}</p>
                          </div>
                          <div className="px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)" }}>
                            <p className="text-[#4a5568]" style={{ fontSize: "0.6rem" }}>GPU puissant (~{gpuSpeed.toLocaleString("fr-FR")} h/s)</p>
                            <p className="text-[#ef4444]" style={{ fontSize: "0.82rem", fontFamily: "JetBrains Mono, monospace" }}>{formatTime(gpuTime)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Log Terminal ──────────────────────────────────────── */}
      {log.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1e293b" }}>
          <div className="flex items-center gap-2 px-4 py-2" style={{ background: "#0f172a", borderBottom: "1px solid #1e293b" }}>
            <div className="w-2 h-2 rounded-full bg-[#ef4444]/70" />
            <div className="w-2 h-2 rounded-full bg-[#f59e0b]/70" />
            <div className="w-2 h-2 rounded-full bg-[#39ff14]/70" />
            <span className="ml-2 text-[#2a3441]" style={{ fontSize: "0.68rem", fontFamily: "JetBrains Mono, monospace" }}>
              brute@cyberguard — {stats.status === "running" ? "attacking" : stats.found ? "cracked" : stats.status}
            </span>
            {stats.status === "running" && <Loader2 className="w-3 h-3 text-[#ef4444] animate-spin ml-auto" />}
          </div>
          <div className="p-3 max-h-44 overflow-y-auto space-y-0.5" style={{ background: "#0a0a0f" }}>
            {log.map((l, i) => (
              <div key={i} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.72rem" }}
                className={l.includes("[FOUND]") ? "text-[#39ff14]" : l.includes("[ERR]") || l.includes("[STOP]") ? "text-[#ef4444]" : l.includes("[WARN]") ? "text-[#f59e0b]" : l.includes("[DONE]") ? "text-[#00d4ff]" : "text-[#4a5568]"}>
                <span className="text-[#2a3441] mr-2 select-none">$</span>{l}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Python Script ──────────────────────────────────────────────────────
const PYTHON_SCRIPT = `#!/usr/bin/env python3
"""
Brute Force Hash Cracker - CyberGuard
=====================================
Cracker de hash multi-algorithme avec attaque par dictionnaire, brute force,
mutations intelligentes, et support multi-processus.

Supporte : MD5, SHA-1, SHA-256, SHA-512, bcrypt, scrypt
Modes   : dictionary, brute, mask, benchmark, identify

Usage:
    python brute.py dict   <hash> -w /chemin/vers/wordlist.txt
    python brute.py brute  <hash> -c lower_digits -m 6
    python brute.py mask   <hash> --mask "?l?l?l?d?d?d"
    python brute.py id     <hash>
    python brute.py bench

IMPORTANT:
    - Fournissez le chemin COMPLET de votre wordlist avec -w
    - Wordlists recommandees : rockyou.txt, SecLists, CrackStation
    - Si pas de wordlist, la mini-liste integree (500 mots) est utilisee

Cree par CyberGuard — https://cyber-guard-dusky.vercel.app
"""

import argparse
import hashlib
import itertools
import json
import multiprocessing
import os
import signal
import sys
import time
import string
from concurrent.futures import ProcessPoolExecutor, as_completed
from typing import Optional, List, Tuple, Generator

# ── Configuration ────────────────────────────────────────────────────────
CHARSETS = {
    "digits":       string.digits,
    "lower":        string.ascii_lowercase,
    "upper":        string.ascii_uppercase,
    "lower_digits": string.ascii_lowercase + string.digits,
    "upper_digits": string.ascii_uppercase + string.digits,
    "alpha":        string.ascii_letters,
    "alphanum":     string.ascii_letters + string.digits,
    "all":          string.ascii_letters + string.digits + "!@#$%^&*()-_=+",
    "full":         string.printable.strip(),
}

MASK_TOKENS = {
    "?l": string.ascii_lowercase,
    "?u": string.ascii_uppercase,
    "?d": string.digits,
    "?s": "!@#$%^&*()-_=+[]{}|;:',.<>?/~\`",
    "?a": string.ascii_letters + string.digits + "!@#$%^&*",
}

# Top 500 built-in passwords (used when no wordlist is provided)
BUILTIN_WORDS = [
    "123456","password","123456789","12345678","12345","1234567","1234567890",
    "qwerty","abc123","111111","123123","admin","letmein","welcome","monkey",
    "master","dragon","login","princess","football","shadow","sunshine",
    "trustno1","iloveyou","batman","access","hello","charlie","donald",
    "password1","qwerty123","654321","superman","qazwsx","michael","121212",
    "bailey","freedom","pass","baseball","buster","daniel","hannah","thomas",
    "summer","george","harley","222222","jessica","ginger","abcdef","jordan",
    "55555","tigger","joshua","pepper","sophie","1234","robert","matthew",
    "12341234","andrew","lakers","andrea","1qaz2wsx","starwars","jennifer",
    "samsung","dallas","passw0rd","austin","whatever","amanda","nicole",
    "test","test123","secret","root","toor","admin123","administrator",
    "changeme","default","guest","user","demo","oracle","mysql","postgres",
    "pa$$w0rd","P@ssw0rd","P@ss1234","Passw0rd!","Admin123!","Welcome1",
    "Password1!","Qwerty123!","Abc123456","Test1234","Letmein123","Master123",
    "azerty","motdepasse","soleil","bonjour","chocolat","coucou","doudou",
    "loulou","nicolas","camille","france","amour","chouchou","marseille",
    "fuckyou","asshole","minecraft","fortnite","roblox","valorant","pokemon",
    "hacker","security","firewall","exploit","malware","virus","cyber",
    "pentest","kali","linux","ubuntu","windows","python","javascript",
    "zxcvbn","asdfgh","qwertyuiop","zaq1xsw2","1q2w3e4r","1q2w3e4r5t",
    "iloveu","love123","baby","honey","angel","lucky","happy","passpass",
]

# ── Hash Functions ───────────────────────────────────────────────────────
def hash_candidate(candidate: str, algo: str, salt: str = "") -> str:
    """Hash a candidate password with optional salt."""
    data = (salt + candidate).encode("utf-8")
    if algo == "md5":
        return hashlib.md5(data).hexdigest()
    elif algo == "sha1":
        return hashlib.sha1(data).hexdigest()
    elif algo == "sha256":
        return hashlib.sha256(data).hexdigest()
    elif algo == "sha512":
        return hashlib.sha512(data).hexdigest()
    elif algo == "bcrypt":
        try:
            import bcrypt as bc
            return "bcrypt_compare"  # bcrypt uses bcrypt.checkpw
        except ImportError:
            print("\\033[91m[!] pip install bcrypt requis pour le mode bcrypt\\033[0m")
            sys.exit(1)
    else:
        return hashlib.new(algo, data).hexdigest()


def check_bcrypt(candidate: str, target_hash: str) -> bool:
    """Check bcrypt hash (special case)."""
    try:
        import bcrypt as bc
        return bc.checkpw(candidate.encode("utf-8"), target_hash.encode("utf-8"))
    except Exception:
        return False


# ── Mutation Engine ──────────────────────────────────────────────────────
def mutate(word: str) -> List[str]:
    """Generate intelligent mutations of a word."""
    results = set()
    results.add(word)
    results.add(word.lower())
    results.add(word.upper())
    results.add(word.capitalize())
    results.add(word.swapcase())

    # Append numbers
    for n in ["0","1","2","3","4","5","6","7","8","9","00","01","11","12",
              "13","21","22","23","69","77","99","123","1234","12345",
              "321","666","777","888","999","2024","2025","2026"]:
        results.add(word + n)
        results.add(word.capitalize() + n)

    # Append symbols
    for s in ["!","!!","@","#","$","!@#","123!","1!","!1","*"]:
        results.add(word + s)
        results.add(word.capitalize() + s)

    # L33t speak
    leet = {"a":"4","e":"3","i":"1","o":"0","s":"5","t":"7","l":"1","b":"8","g":"9"}
    lw = ""
    for ch in word.lower():
        lw += leet.get(ch, ch)
    results.add(lw)
    results.add(lw + "!")
    results.add(lw.capitalize())

    # Reverse
    results.add(word[::-1])
    # Double
    results.add(word + word)
    results.add(word.capitalize() + word)
    # Surround
    results.add("!" + word + "!")
    results.add("@" + word + "@")
    results.add("_" + word + "_")

    return list(results)


# ── Wordlist Loader ──────────────────────────────────────────────────────
def load_wordlist(path: Optional[str], use_mutations: bool = True) -> Generator[str, None, None]:
    """Load wordlist from file or use built-in list. Yields candidates."""
    if path and os.path.isfile(path):
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                word = line.strip()
                if not word:
                    continue
                if use_mutations:
                    for m in mutate(word):
                        yield m
                else:
                    yield word
    else:
        if path:
            print(f"\\033[93m[!] Fichier introuvable: {path}\\033[0m")
            print(f"\\033[93m    Utilisation de la liste integree ({len(BUILTIN_WORDS)} mots)\\033[0m")
        else:
            print(f"\\033[94m[i] Pas de wordlist fournie — liste integree ({len(BUILTIN_WORDS)} mots)\\033[0m")
            print(f"\\033[94m    Pour de meilleurs resultats: -w /chemin/vers/rockyou.txt\\033[0m")
        for word in BUILTIN_WORDS:
            if use_mutations:
                for m in mutate(word):
                    yield m
            else:
                yield word


# ── Mask Attack Generator ────────────────────────────────────────────────
def mask_generator(mask: str) -> Generator[str, None, None]:
    """Generate candidates from a hashcat-style mask."""
    parts = []
    i = 0
    while i < len(mask):
        if i + 1 < len(mask) and mask[i:i+2] in MASK_TOKENS:
            parts.append(MASK_TOKENS[mask[i:i+2]])
            i += 2
        else:
            parts.append(mask[i])
            i += 1
    for combo in itertools.product(*parts):
        yield "".join(combo)

def mask_total(mask: str) -> int:
    """Calculate total combinations for a mask."""
    total = 1
    i = 0
    while i < len(mask):
        if i + 1 < len(mask) and mask[i:i+2] in MASK_TOKENS:
            total *= len(MASK_TOKENS[mask[i:i+2]])
            i += 2
        else:
            i += 1
    return total


# ── Brute Force Generator ───────────────────────────────────────────────
def brute_generator(charset: str, max_len: int) -> Generator[str, None, None]:
    """Generate all combinations up to max_len."""
    for length in range(1, max_len + 1):
        for combo in itertools.product(charset, repeat=length):
            yield "".join(combo)

def brute_total(charset_len: int, max_len: int) -> int:
    return sum(charset_len ** i for i in range(1, max_len + 1))


# ── Batch Worker (for multiprocessing) ───────────────────────────────────
def _worker_batch(args: Tuple[List[str], str, str, str]) -> Optional[str]:
    """Process a batch of candidates. Returns found password or None."""
    candidates, target_hash, algo, salt = args
    is_bcrypt = algo == "bcrypt"
    for c in candidates:
        if is_bcrypt:
            if check_bcrypt(c, target_hash):
                return c
        else:
            if hash_candidate(c, algo, salt) == target_hash:
                return c
    return None


# ── Hash Identifier ──────────────────────────────────────────────────────
HASH_PATTERNS = [
    (32,  "MD5"),
    (40,  "SHA-1"),
    (56,  "SHA-224"),
    (64,  "SHA-256"),
    (96,  "SHA-384"),
    (128, "SHA-512"),
]

def identify_hash(h: str) -> List[str]:
    """Identify hash type by length and format."""
    h = h.strip()
    results = []
    if h.startswith("$2") and len(h) == 60:
        results.append("bcrypt")
    elif h.startswith("$argon2"):
        results.append("Argon2")
    elif h.startswith("$scrypt$") or h.startswith("$7$"):
        results.append("scrypt")
    else:
        for length, name in HASH_PATTERNS:
            if len(h) == length and all(c in "0123456789abcdefABCDEF" for c in h):
                results.append(name)
    return results


# ── Progress Display ─────────────────────────────────────────────────────
class ProgressTracker:
    def __init__(self, total: int, label: str = ""):
        self.total = total
        self.tested = 0
        self.start = time.time()
        self.label = label
        self._last_print = 0

    def update(self, n: int = 1):
        self.tested += n
        now = time.time()
        if now - self._last_print >= 0.5 or self.tested >= self.total:
            elapsed = now - self.start
            speed = self.tested / elapsed if elapsed > 0 else 0
            pct = (self.tested / self.total * 100) if self.total > 0 else 0
            eta = (self.total - self.tested) / speed if speed > 0 else 0
            bar_len = 30
            filled = int(bar_len * self.tested / self.total) if self.total > 0 else 0
            bar = "\\033[91m" + "█" * filled + "\\033[90m" + "░" * (bar_len - filled) + "\\033[0m"
            sys.stdout.write(
                f"\\r  {bar} {pct:5.1f}% | "
                f"{speed:,.0f} h/s | "
                f"{self.tested:,}/{self.total:,} | "
                f"ETA {eta:.0f}s  "
            )
            sys.stdout.flush()
            self._last_print = now

    def finish(self):
        elapsed = time.time() - self.start
        speed = self.tested / elapsed if elapsed > 0 else 0
        print(f"\\n\\033[94m  [{self.label}] {self.tested:,} candidats en {elapsed:.2f}s ({speed:,.0f} h/s)\\033[0m")


# ── Main Attack Functions ────────────────────────────────────────────────
def attack_dictionary(target_hash: str, algo: str, wordlist_path: Optional[str],
                      salt: str = "", mutations: bool = True, workers: int = 0) -> Optional[str]:
    """Dictionary attack with optional mutations and multiprocessing."""
    print(f"\\n\\033[91m  ⚡ Attaque dictionnaire — {algo.upper()}\\033[0m")
    print(f"  Hash cible: {target_hash[:24]}...{target_hash[-12:]}")
    if salt:
        print(f"  Salt: {salt}")
    print(f"  Mutations: {'Oui (l33t, chiffres, symboles)' if mutations else 'Non'}")
    print()

    # Collect candidates
    candidates = list(load_wordlist(wordlist_path, mutations))
    unique = list(dict.fromkeys(candidates))  # preserve order, remove dupes
    print(f"\\033[94m  {len(unique):,} candidats uniques a tester\\033[0m\\n")

    tracker = ProgressTracker(len(unique), "DICT")

    num_workers = workers if workers > 0 else max(1, multiprocessing.cpu_count() - 1)

    if num_workers > 1 and len(unique) > 1000:
        # Multiprocessing batch attack
        batch_size = max(500, len(unique) // (num_workers * 4))
        batches = [unique[i:i+batch_size] for i in range(0, len(unique), batch_size)]
        print(f"  Multiprocessing: {num_workers} workers, {len(batches)} batches\\n")

        with ProcessPoolExecutor(max_workers=num_workers) as pool:
            futures = {pool.submit(_worker_batch, (batch, target_hash, algo, salt)): i
                       for i, batch in enumerate(batches)}
            for future in as_completed(futures):
                result = future.result()
                batch_idx = futures[future]
                tracker.update(len(batches[batch_idx]))
                if result:
                    pool.shutdown(wait=False, cancel_futures=True)
                    tracker.finish()
                    return result
    else:
        # Single-process
        for candidate in unique:
            if algo == "bcrypt":
                if check_bcrypt(candidate, target_hash):
                    tracker.finish()
                    return candidate
            else:
                if hash_candidate(candidate, algo, salt) == target_hash:
                    tracker.finish()
                    return candidate
            tracker.update()

    tracker.finish()
    return None


def attack_bruteforce(target_hash: str, algo: str, charset_key: str = "lower_digits",
                      max_len: int = 6, salt: str = "", custom_charset: str = "",
                      workers: int = 0) -> Optional[str]:
    """Brute force attack."""
    cs = custom_charset if custom_charset else CHARSETS.get(charset_key, CHARSETS["lower_digits"])
    total = brute_total(len(cs), max_len)
    print(f"\\n\\033[91m  ⚡ Brute Force — {algo.upper()}\\033[0m")
    print(f"  Hash cible: {target_hash[:24]}...{target_hash[-12:]}")
    print(f"  Charset: {cs[:30]}{'...' if len(cs)>30 else ''} ({len(cs)} chars)")
    print(f"  Longueur max: {max_len}")
    print(f"  Combinaisons: {total:,}")
    if total > 100_000_000:
        print(f"\\033[93m  [!] {total/1e6:.0f}M combinaisons — cela peut prendre du temps\\033[0m")
    print()

    tracker = ProgressTracker(total, "BRUTE")
    for candidate in brute_generator(cs, max_len):
        if algo == "bcrypt":
            if check_bcrypt(candidate, target_hash):
                tracker.finish()
                return candidate
        else:
            if hash_candidate(candidate, algo, salt) == target_hash:
                tracker.finish()
                return candidate
        tracker.update()
    tracker.finish()
    return None


def attack_mask(target_hash: str, algo: str, mask: str, salt: str = "") -> Optional[str]:
    """Mask attack (hashcat-style)."""
    total = mask_total(mask)
    print(f"\\n\\033[91m  ⚡ Mask Attack — {algo.upper()}\\033[0m")
    print(f"  Hash cible: {target_hash[:24]}...{target_hash[-12:]}")
    print(f"  Mask: {mask}")
    print(f"  Combinaisons: {total:,}")
    print(f"  Tokens: ?l=lower ?u=upper ?d=digit ?s=symbol ?a=all")
    print()

    tracker = ProgressTracker(total, "MASK")
    for candidate in mask_generator(mask):
        if hash_candidate(candidate, algo, salt) == target_hash:
            tracker.finish()
            return candidate
        tracker.update()
    tracker.finish()
    return None


def benchmark():
    """Benchmark hash speeds."""
    print(f"\\n\\033[91m  ⚡ Benchmark de vitesse\\033[0m\\n")
    COUNT = 100_000
    for algo in ["md5", "sha1", "sha256", "sha512"]:
        start = time.time()
        for i in range(COUNT):
            hash_candidate(f"bench_{i}", algo)
        elapsed = time.time() - start
        speed = COUNT / elapsed
        print(f"  {algo.upper():>8}: {speed:>12,.0f} h/s")
    print()
    # bcrypt
    try:
        import bcrypt as bc
        start = time.time()
        for i in range(10):
            bc.hashpw(f"bench_{i}".encode(), bc.gensalt(rounds=10))
        elapsed = time.time() - start
        speed = 10 / elapsed
        print(f"  {'bcrypt':>8}: {speed:>12,.1f} h/s  (rounds=10)")
    except ImportError:
        print(f"  {'bcrypt':>8}: non installe (pip install bcrypt)")
    print()


# ── CLI ──────────────────────────────────────────────────────────────────
def main():
    signal.signal(signal.SIGINT, lambda *_: (print("\\n\\033[93m  Arret...\\033[0m"), sys.exit(0)))

    parser = argparse.ArgumentParser(
        description="Brute Force Hash Cracker - CyberGuard",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=\"\"\"
Exemples:
  python brute.py dict  5f4dcc3b5aa765d61d8327deb882cf99 -w /path/to/rockyou.txt
  python brute.py dict  5f4dcc3b5aa765d61d8327deb882cf99 --algo md5
  python brute.py brute 5f4dcc3b5aa765d61d8327deb882cf99 -c lower -m 5
  python brute.py mask  5f4dcc3b5aa765d61d8327deb882cf99 --mask "?l?l?l?d?d"
  python brute.py id    5f4dcc3b5aa765d61d8327deb882cf99
  python brute.py bench

Wordlists recommandees:
  - rockyou.txt (14M mots) — https://github.com/brannondorsey/naive-hashcat
  - SecLists    (500+ listes) — https://github.com/danielmiessler/SecLists
  - CrackStation (1.4B mots) — https://crackstation.net/crackstation-wordlist-password-cracking-dictionary.htm

Cree par CyberGuard — https://cyber-guard-dusky.vercel.app
\"\"\"
    )

    sub = parser.add_subparsers(dest="mode", help="Mode d'attaque")

    # Dictionary
    p_dict = sub.add_parser("dict", help="Attaque par dictionnaire")
    p_dict.add_argument("hash", help="Hash cible")
    p_dict.add_argument("-w", "--wordlist", help="Chemin COMPLET vers votre wordlist (ex: /home/user/rockyou.txt)")
    p_dict.add_argument("-a", "--algo", default="auto", choices=["auto","md5","sha1","sha256","sha512","bcrypt"], help="Algorithme (defaut: auto-detect)")
    p_dict.add_argument("-s", "--salt", default="", help="Salt (prefixe au mot)")
    p_dict.add_argument("--no-mutations", action="store_true", help="Desactiver les mutations")
    p_dict.add_argument("--workers", type=int, default=0, help="Nombre de workers (0=auto)")
    p_dict.add_argument("-o", "--output", help="Export JSON")

    # Brute force
    p_brute = sub.add_parser("brute", help="Attaque brute force")
    p_brute.add_argument("hash", help="Hash cible")
    p_brute.add_argument("-c", "--charset", default="lower_digits", choices=list(CHARSETS.keys()), help="Charset")
    p_brute.add_argument("--custom-charset", default="", help="Charset personnalise")
    p_brute.add_argument("-m", "--max-len", type=int, default=6, help="Longueur max (defaut: 6)")
    p_brute.add_argument("-a", "--algo", default="auto", choices=["auto","md5","sha1","sha256","sha512","bcrypt"])
    p_brute.add_argument("-s", "--salt", default="")
    p_brute.add_argument("-o", "--output", help="Export JSON")

    # Mask
    p_mask = sub.add_parser("mask", help="Attaque par masque (style hashcat)")
    p_mask.add_argument("hash", help="Hash cible")
    p_mask.add_argument("--mask", required=True, help="Masque: ?l=lower ?u=upper ?d=digit ?s=symbol ?a=all")
    p_mask.add_argument("-a", "--algo", default="auto", choices=["auto","md5","sha1","sha256","sha512"])
    p_mask.add_argument("-s", "--salt", default="")
    p_mask.add_argument("-o", "--output", help="Export JSON")

    # Identify
    p_id = sub.add_parser("id", help="Identifier le type de hash")
    p_id.add_argument("hash", help="Hash a identifier")

    # Benchmark
    sub.add_parser("bench", help="Benchmark de vitesse")

    args = parser.parse_args()

    if not args.mode:
        parser.print_help()
        return

    print("\\033[91m")
    print("  ╔══════════════════════════════════════════╗")
    print("  ║   BRUTE FORCE HASH CRACKER — CyberGuard ║")
    print("  ╚══════════════════════════════════════════╝")
    print("\\033[0m")

    if args.mode == "bench":
        benchmark()
        return

    if args.mode == "id":
        types = identify_hash(args.hash)
        if types:
            print(f"\\n  Hash: {args.hash}")
            print(f"  Types possibles: {', '.join(types)}\\n")
        else:
            print(f"\\n  Hash: {args.hash}")
            print(f"  Type non reconnu\\n")
        return

    # Auto-detect algo
    target = args.hash.strip()
    algo = args.algo
    if algo == "auto":
        types = identify_hash(target)
        if types:
            algo_map = {"MD5":"md5","SHA-1":"sha1","SHA-256":"sha256","SHA-512":"sha512","bcrypt":"bcrypt"}
            algo = algo_map.get(types[0], "md5")
            print(f"  Auto-detect: {types[0]} -> {algo}")
        else:
            algo = "md5"
            print(f"  Auto-detect: inconnu, defaut md5")

    result = None
    start = time.time()

    if args.mode == "dict":
        result = attack_dictionary(target, algo, args.wordlist, args.salt,
                                   not args.no_mutations, args.workers)
    elif args.mode == "brute":
        result = attack_bruteforce(target, algo, args.charset, args.max_len,
                                   args.salt, args.custom_charset)
    elif args.mode == "mask":
        result = attack_mask(target, algo, args.mask, args.salt)

    elapsed = time.time() - start

    if result:
        print(f"\\n\\033[92m  ✅ MOT DE PASSE TROUVE: {result}\\033[0m")
        print(f"\\033[92m  Temps: {elapsed:.2f}s\\033[0m\\n")
    else:
        print(f"\\n\\033[93m  ❌ Non trouve (epuise en {elapsed:.2f}s)\\033[0m\\n")

    # Export
    if hasattr(args, "output") and args.output:
        report = {
            "tool": "Brute Force Hash Cracker - CyberGuard",
            "mode": args.mode,
            "algorithm": algo,
            "target_hash": target,
            "found": result,
            "elapsed_seconds": round(elapsed, 3),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        with open(args.output, "w") as f:
            json.dump(report, f, indent=2)
        print(f"  Rapport exporte: {args.output}\\n")


if __name__ == "__main__":
    main()
`;

const README_CONTENT = `# Brute Force Hash Cracker - CyberGuard

Cracker de hash multi-algorithme professionnel avec 4 modes d'attaque,
moteur de mutations intelligentes, et support multi-processus.

## Modes d'attaque

### 1. Dictionnaire (\`dict\`)
\`\`\`bash
python brute.py dict <hash> -w /chemin/vers/wordlist.txt
python brute.py dict <hash> -w /chemin/vers/rockyou.txt --algo sha256
python brute.py dict <hash>   # utilise la mini-liste integree
\`\`\`

### 2. Brute Force (\`brute\`)
\`\`\`bash
python brute.py brute <hash> -c lower_digits -m 6
python brute.py brute <hash> -c alphanum -m 4 --algo sha1
python brute.py brute <hash> --custom-charset "abc123!@#" -m 8
\`\`\`

### 3. Mask Attack (\`mask\`)
\`\`\`bash
python brute.py mask <hash> --mask "?l?l?l?d?d?d"     # 3 lettres + 3 chiffres
python brute.py mask <hash> --mask "?u?l?l?l?l?d?d?s"  # Majuscule + 4 lettres + 2 chiffres + symbole
\`\`\`

Tokens: \`?l\`=minuscule \`?u\`=majuscule \`?d\`=chiffre \`?s\`=symbole \`?a\`=tout

### 4. Identifier (\`id\`)
\`\`\`bash
python brute.py id 5f4dcc3b5aa765d61d8327deb882cf99
\`\`\`

### 5. Benchmark (\`bench\`)
\`\`\`bash
python brute.py bench
\`\`\`

## Mutations intelligentes

Le moteur de mutations genere automatiquement des variantes :
- Casse : password → PASSWORD, Password, pASSWORD
- Chiffres : password → password1, password123, password2026
- Symboles : password → password!, password!@#
- L33t speak : password → p455w0rd
- Reverse : password → drowssap
- Double : password → passwordpassword

## Wordlists recommandees

| Nom | Taille | Lien |
|-----|--------|------|
| rockyou.txt | 14M mots | github.com/brannondorsey/naive-hashcat |
| SecLists | 500+ listes | github.com/danielmiessler/SecLists |
| CrackStation | 1.4B mots | crackstation.net |

**IMPORTANT:** Fournissez le chemin COMPLET de votre fichier wordlist avec \`-w\`.
Exemple : \`-w /home/user/wordlists/rockyou.txt\`

## Algorithmes supportes

MD5, SHA-1, SHA-256, SHA-512, bcrypt (necessite \`pip install bcrypt\`)

## Export

Ajoutez \`-o rapport.json\` pour exporter les resultats.

Cree par CyberGuard — https://cyber-guard-dusky.vercel.app
`;

const guiConfig: GuiConfig = {
  title: "Brute Force Hash Cracker",
  inputType: "text",
  inputPlaceholder: "Hash a cracker (MD5/SHA1/SHA256/SHA512)...",
  buttonText: "Attaquer",
  importLine: "from brute import attack_dictionary, identify_hash",
  processCode: `            types = identify_hash(inp)
            algo = "md5"
            if types:
                algo_map = {"MD5":"md5","SHA-1":"sha1","SHA-256":"sha256","SHA-512":"sha512"}
                algo = algo_map.get(types[0], "md5")
            result = attack_dictionary(inp, algo, None, "", True, 0)
            if result:
                return f"MOT DE PASSE TROUVE: {result}"
            return "Non trouve avec la liste integree. Utilisez le CLI avec une wordlist."`,
  extraCombo: {
    label: "Algorithme",
    options: [["md5", "MD5"], ["sha1", "SHA-1"], ["sha256", "SHA-256"], ["sha512", "SHA-512"]],
    varName: "algo",
  },
};

// ─── Main Page ──────────────────────────────────────────────────────────
export function BruteForcePage() {
  return (
    <ToolPageLayout
      title="Brute Force"
      subtitle="Hash Cracker"
      description="Cracker de hash multi-algorithme avec attaque par dictionnaire (500+ mots + mutations intelligentes), brute force configurable, identification de hash et benchmark de vitesse. MD5, SHA-1, SHA-256, SHA-512 — 100% dans le navigateur."
      features={[
        { icon: BookOpen, title: "Attaque Dictionnaire", desc: "500+ mots communs avec moteur de mutations (l33t, chiffres, symboles, reverse)" },
        { icon: Crosshair, title: "Brute Force Pur", desc: "Tous les charsets (chiffres, alpha, symboles) avec longueur configurable jusqu'a 8" },
        { icon: Eye, title: "Identification Hash", desc: "Detecte automatiquement MD5, SHA-1, SHA-256, SHA-512, bcrypt, Argon2" },
        { icon: Zap, title: "Mutations Intelligentes", desc: "L33t speak, majuscules, suffixes, reverse, double — x50 candidats par mot" },
        { icon: Gauge, title: "Benchmark Integre", desc: "Mesurez la vitesse de hachage de votre navigateur en hash/seconde" },
        { icon: Cpu, title: "Multi-processus (Python)", desc: "Le script CLI utilise multiprocessing.Pool pour exploiter tous vos CPU" },
        { icon: Target, title: "Mask Attack (Python)", desc: "Masques style hashcat (?l?u?d?s) pour des attaques ultra-ciblees" },
        { icon: Shield, title: "Salt Support", desc: "Supporte le salting (prefixe) pour casser des hash sales" },
        { icon: FileText, title: "Export JSON", desc: "Exportez le mot de passe trouve, le temps d'execution, les stats" },
      ]}
      requirements={[
        "Python 3.7+",
        "Aucune dependance externe (stdlib uniquement)",
        "Optionnel: pip install bcrypt (pour bcrypt)",
        "Recommande: wordlist rockyou.txt ou SecLists",
        "Fournissez le chemin COMPLET de votre wordlist avec -w",
      ]}
      pythonScript={PYTHON_SCRIPT}
      readmeContent={README_CONTENT}
      toolSlug="brute"
      icon={Lock}
      color="#ef4444"
      guiConfig={guiConfig}
    >
      <BruteForceTool />
    </ToolPageLayout>
  );
}
