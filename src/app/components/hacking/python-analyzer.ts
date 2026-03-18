// ─── Python Code Analyzer ────────────────────────────────────────────────
// Analyzes a Python script to auto-detect metadata for tool generation.

export interface AnalyzedTool {
  name: string;
  slug: string;
  description: string;
  features: { title: string; desc: string }[];
  dependencies: string[];
  requirements: string[];
  needsApiKey: boolean;
  apiKeyName: string;
  inputType: "url" | "text";
  inputPlaceholder: string;
  functions: string[];
  mainFunction: string;
  category: "network" | "crypto" | "web" | "encoding" | "analysis" | "recon" | "exploit" | "misc";
  color: string;
  iconKey: string;
  guiImportLine: string;
  guiProcessCode: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  network: "#f43f5e",
  crypto: "#8b5cf6",
  web: "#00d4ff",
  encoding: "#f59e0b",
  analysis: "#22c55e",
  recon: "#f97316",
  exploit: "#ef4444",
  misc: "#06b6d4",
};

const CATEGORY_ICONS: Record<string, string> = {
  network: "Radio",
  crypto: "Lock",
  web: "Globe",
  encoding: "RefreshCw",
  analysis: "Search",
  recon: "Eye",
  exploit: "Zap",
  misc: "Code",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

function extractDocstring(code: string): { title: string; description: string } {
  // Triple-quoted docstring
  const tripleMatch = code.match(/^(?:#[^\n]*\n)*\s*(?:"""([\s\S]*?)"""|'''([\s\S]*?)''')/m);
  if (tripleMatch) {
    const doc = (tripleMatch[1] || tripleMatch[2] || "").trim();
    const lines = doc.split("\n").map((l) => l.trim()).filter(Boolean);
    const title = lines[0] || "Outil Python";
    const desc = lines.slice(1).join(" ").trim() || title;
    return { title, description: desc };
  }

  // Fallback: first comment block
  const commentLines: string[] = [];
  for (const line of code.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") && !trimmed.startsWith("#!")) {
      commentLines.push(trimmed.replace(/^#+\s*/, "").trim());
    } else if (commentLines.length > 0) break;
  }
  if (commentLines.length > 0) {
    const title = commentLines[0].replace(/^=+|=+$/g, "").trim() || "Outil Python";
    const desc = commentLines.slice(1).join(" ").trim() || title;
    return { title, description: desc };
  }

  return { title: "Outil Python", description: "Script Python personalise" };
}

function extractFunctions(code: string): string[] {
  const fns: string[] = [];
  const regex = /^def\s+(\w+)\s*\(/gm;
  let match;
  while ((match = regex.exec(code)) !== null) {
    const name = match[1];
    if (!name.startsWith("_") && name !== "main") {
      fns.push(name);
    }
  }
  return fns;
}

function extractImports(code: string): string[] {
  const deps: string[] = [];
  const lines = code.split("\n");
  const stdlib = new Set([
    "sys", "os", "json", "re", "hashlib", "base64", "urllib", "http", "html",
    "socket", "ssl", "argparse", "datetime", "time", "threading", "concurrent",
    "struct", "io", "math", "random", "string", "collections", "itertools",
    "functools", "pathlib", "subprocess", "shutil", "tempfile", "csv", "xml",
    "email", "logging", "unittest", "textwrap", "copy", "typing", "enum",
    "dataclasses", "abc", "contextlib", "traceback", "binascii", "codecs",
    "ipaddress", "uuid",
  ]);

  for (const line of lines) {
    const trimmed = line.trim();
    let mod = "";
    const m1 = trimmed.match(/^import\s+([\w.]+)/);
    const m2 = trimmed.match(/^from\s+([\w.]+)\s+import/);
    if (m1) mod = m1[1].split(".")[0];
    if (m2) mod = m2[1].split(".")[0];
    if (mod && !stdlib.has(mod) && !deps.includes(mod)) {
      deps.push(mod);
    }
  }
  return deps;
}

function detectCategory(code: string, fns: string[], deps: string[]): AnalyzedTool["category"] {
  const lc = code.toLowerCase();
  if (lc.includes("socket") || lc.includes("port") || lc.includes("tcp") || lc.includes("udp")) return "network";
  if (lc.includes("hashlib") || lc.includes("hmac") || lc.includes("encrypt") || lc.includes("decrypt") || lc.includes("cipher")) return "crypto";
  if (lc.includes("base64") || lc.includes("encode") || lc.includes("decode") || lc.includes("rot13")) return "encoding";
  if (lc.includes("subdomain") || lc.includes("whois") || lc.includes("dns") || lc.includes("nmap") || lc.includes("recon")) return "recon";
  if (lc.includes("exploit") || lc.includes("payload") || lc.includes("inject") || lc.includes("xss") || lc.includes("sqli")) return "exploit";
  if (lc.includes("http") || lc.includes("header") || lc.includes("url") || lc.includes("request") || lc.includes("csp") || lc.includes("cors")) return "web";
  if (deps.includes("requests") || deps.includes("beautifulsoup4") || deps.includes("scrapy")) return "web";
  if (lc.includes("analy") || lc.includes("scan") || lc.includes("check") || lc.includes("detect")) return "analysis";
  return "misc";
}

function detectInputType(code: string): { type: "url" | "text"; placeholder: string } {
  const lc = code.toLowerCase();
  if (lc.includes("url") || lc.includes("http") || lc.includes("domain") || lc.includes("host") || lc.includes("target")) {
    if (lc.includes("domain")) return { type: "url", placeholder: "exemple.com" };
    return { type: "url", placeholder: "https://exemple.com" };
  }
  if (lc.includes("hash") || lc.includes("token") || lc.includes("jwt")) {
    return { type: "text", placeholder: "Entrez votre texte ou hash..." };
  }
  if (lc.includes("regex") || lc.includes("pattern")) {
    return { type: "text", placeholder: "Entrez un pattern ou texte..." };
  }
  return { type: "text", placeholder: "Entrez votre input..." };
}

function detectApiKey(code: string): { needs: boolean; name: string } {
  const patterns = [
    /API_KEY/i, /api_key/i, /apikey/i, /os\.environ/i, /os\.getenv/i,
    /VITE_\w+_KEY/i, /SECRET/i, /TOKEN/i,
  ];
  for (const p of patterns) {
    if (p.test(code)) {
      const match = code.match(/["'](\w*(?:API|KEY|TOKEN|SECRET)\w*)["']/i);
      return { needs: true, name: match?.[1] || "API Key" };
    }
  }
  return { needs: false, name: "" };
}

function generateFeatures(fns: string[], code: string, category: string): { title: string; desc: string }[] {
  const features: { title: string; desc: string }[] = [];

  // From function names
  for (const fn of fns.slice(0, 4)) {
    const readable = fn
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    features.push({ title: readable, desc: `Fonction ${fn}() du script` });
  }

  // From code patterns
  const lc = code.toLowerCase();
  if (lc.includes("threading") || lc.includes("concurrent")) {
    features.push({ title: "Multi-thread", desc: "Execution parallele pour de meilleures performances" });
  }
  if (lc.includes("json.dump") || lc.includes("json.dumps")) {
    features.push({ title: "Export JSON", desc: "Exporte les resultats au format JSON" });
  }
  if (lc.includes("argparse")) {
    features.push({ title: "CLI complet", desc: "Interface en ligne de commande avec argparse" });
  }
  if (lc.includes("timeout") || lc.includes("try:") || lc.includes("except")) {
    features.push({ title: "Gestion d'erreurs", desc: "Timeouts et erreurs geres proprement" });
  }

  // Ensure at least 3 features
  while (features.length < 3) {
    features.push({ title: "Script Python", desc: "Compatible Python 3.7+" });
  }

  return features.slice(0, 6);
}

function guessMainFunction(fns: string[], code: string): string {
  // Priority: functions named "main", "run", "scan", "check", "analyze", "test"
  const priority = ["scan", "check", "analyze", "test", "run", "detect", "find", "lookup", "parse", "evaluate"];
  for (const p of priority) {
    const match = fns.find((f) => f.toLowerCase().includes(p));
    if (match) return match;
  }
  // First non-main, non-helper function
  return fns[0] || "main";
}

function generateGuiImport(slug: string, mainFn: string, fns: string[]): string {
  const imports = [mainFn, ...fns.filter((f) => f !== mainFn).slice(0, 3)];
  return `from ${slug} import ${[...new Set(imports)].join(", ")}`;
}

function generateGuiProcess(mainFn: string): string {
  return `            return ${mainFn}(inp)`;
}

function generateRequirements(deps: string[]): string[] {
  const reqs = ["Python 3.7+"];
  if (deps.length === 0) {
    reqs.push("Aucune dependance externe");
  } else {
    reqs.push(`pip install ${deps.join(" ")}`);
  }
  reqs.push("Connexion internet (si outil reseau)");
  reqs.push("Autorisation sur la cible");
  return reqs;
}

// ─── Language detection ──────────────────────────────────────────────────
function detectLanguage(code: string): "python" | "c" | "javascript" | "go" | "rust" | "other" {
  const lc = code.trim();
  if (lc.includes("#include") || lc.includes("int main(") || lc.includes("void ") && lc.includes("{")) return "c";
  if (lc.includes("function ") || lc.includes("const ") || lc.includes("=>") || lc.includes("require(")) return "javascript";
  if (lc.includes("package main") || lc.includes("func main()") || lc.includes("fmt.")) return "go";
  if (lc.includes("fn main()") || lc.includes("use std::") || lc.includes("let mut")) return "rust";
  if (lc.includes("def ") || lc.includes("import ") || lc.includes("print(") || lc.includes("class ")) return "python";
  return "other";
}

function extractFunctionsMultiLang(code: string, lang: string): string[] {
  const fns: string[] = [];
  let regex: RegExp;
  switch (lang) {
    case "c":
      regex = /^(?:int|void|char|float|double|static|unsigned)\s+(\w+)\s*\(/gm;
      break;
    case "javascript":
      regex = /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\()/gm;
      break;
    case "go":
      regex = /^func\s+(\w+)\s*\(/gm;
      break;
    case "rust":
      regex = /^(?:pub\s+)?fn\s+(\w+)\s*\(/gm;
      break;
    default:
      regex = /^def\s+(\w+)\s*\(/gm;
  }
  let match;
  while ((match = regex.exec(code)) !== null) {
    const name = match[1] || match[2];
    if (name && name !== "main" && !name.startsWith("_")) fns.push(name);
  }
  return fns;
}

// ─── Main analyzer ───────────────────────────────────────────────────────
export function analyzePythonCode(code: string): AnalyzedTool {
  const lang = detectLanguage(code);
  const { title, description } = extractDocstring(code);
  const functions = lang === "python" ? extractFunctions(code) : extractFunctionsMultiLang(code, lang);
  const dependencies = lang === "python" ? extractImports(code) : [];
  const category = detectCategory(code, functions, dependencies);
  const { type: inputType, placeholder: inputPlaceholder } = detectInputType(code);
  const { needs: needsApiKey, name: apiKeyName } = detectApiKey(code);
  const mainFunction = guessMainFunction(functions, code);
  const slug = slugify(title);
  const features = generateFeatures(functions, code, category);
  const requirements = lang === "python" ? generateRequirements(dependencies) : ["Compilateur C (gcc/clang)", "OpenSSL dev headers", "make (optionnel)"];

  return {
    name: title,
    slug,
    description,
    features,
    dependencies,
    requirements,
    needsApiKey,
    apiKeyName,
    inputType,
    inputPlaceholder,
    functions,
    mainFunction,
    category,
    color: CATEGORY_COLORS[category],
    iconKey: CATEGORY_ICONS[category],
    guiImportLine: generateGuiImport(slug, mainFunction, functions),
    guiProcessCode: generateGuiProcess(mainFunction),
  };
}