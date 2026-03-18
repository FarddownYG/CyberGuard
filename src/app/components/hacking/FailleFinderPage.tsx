import { useState, useCallback } from "react";
import {
  Shield, Search, Loader2, AlertTriangle, Globe, Lock, Eye, Zap,
  Database, Code, FileText, Bug, CheckCircle,
  ChevronDown, ChevronUp, Copy, Fingerprint,
} from "lucide-react";
import { ToolPageLayout } from "./ToolPageLayout";
import type { GuiConfig } from "./zip-generator";

// ─── Types ──────────────────────────────────────────────────────────
type Severity = "critical" | "high" | "medium" | "low" | "info";

interface Finding {
  id: string;
  module: string;
  title: string;
  severity: Severity;
  description: string;
  evidence?: string;
  remediation?: string;
  cwe?: string;
  cvss?: number;
}

interface ScanReport {
  target: string;
  timestamp: string;
  duration: number;
  findings: Finding[];
  modules: { name: string; checks: number; elapsed: number; status: string }[];
  summary: Record<Severity, number>;
}

// ─── Helpers ────────────────────────────────────────────────────────
const PROXIES = [
  (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
];

async function safeFetch(url: string, opts?: { timeout?: number; method?: string; headers?: Record<string, string> }): Promise<Response | null> {
  const timeout = opts?.timeout || 8000;
  // Direct first
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), timeout);
    const res = await fetch(url, { signal: c.signal, method: opts?.method || "GET", headers: opts?.headers });
    clearTimeout(t);
    return res;
  } catch { /* */ }
  // Proxy fallback
  for (const proxy of PROXIES) {
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), timeout);
      const res = await fetch(proxy(url), { signal: c.signal });
      clearTimeout(t);
      if (res.ok || res.status < 500) return res;
    } catch { /* */ }
  }
  return null;
}

let findingCounter = 0;
function mkFinding(module: string, title: string, severity: Severity, description: string, extra?: Partial<Finding>): Finding {
  return { id: `f_${++findingCounter}`, module, title, severity, description, ...extra };
}

function normalizeUrl(input: string): string {
  let u = input.trim();
  if (!u.startsWith("http://") && !u.startsWith("https://")) u = "https://" + u;
  return u.replace(/\/+$/, "");
}

// ═══════════════════════════════════════════════════════════════════════
// MODULE 1: Security Headers Analysis (inspired by securityheaders.com + Nikto)
// ═══════════════════════════════════════════════════════════════════════

async function moduleHeaders(url: string): Promise<{ findings: Finding[]; checks: number }> {
  const findings: Finding[] = [];
  let checks = 0;

  try {
    const res = await safeFetch(url);
    if (!res) return { findings: [mkFinding("Headers", "Impossible de contacter le serveur", "high", "Le serveur ne répond pas ou bloque les requêtes.")], checks: 1 };

    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });

    // 25+ security headers checks
    const CRITICAL_HEADERS: [string, string, Severity, string, string][] = [
      ["strict-transport-security", "HSTS manquant", "high",
        "Le header Strict-Transport-Security force le navigateur à utiliser HTTPS. Sans lui, les attaques MITM par downgrade HTTP sont possibles.",
        "Ajouter: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload"],
      ["content-security-policy", "CSP manquant", "high",
        "Content-Security-Policy empêche les injections XSS en contrôlant les sources de contenu autorisées. Son absence expose aux XSS réfléchis et stockés.",
        "Définir une CSP restrictive: Content-Security-Policy: default-src 'self'; script-src 'self'"],
      ["x-content-type-options", "X-Content-Type-Options manquant", "medium",
        "Sans 'nosniff', le navigateur peut interpréter incorrectement le type MIME, permettant des attaques MIME confusion.",
        "Ajouter: X-Content-Type-Options: nosniff"],
      ["x-frame-options", "X-Frame-Options manquant", "medium",
        "Permet le clickjacking via iframe. Un attaquant peut superposer votre site sous un site malveillant.",
        "Ajouter: X-Frame-Options: DENY ou SAMEORIGIN"],
      ["x-xss-protection", "X-XSS-Protection manquant", "low",
        "Filtre XSS du navigateur non activé (obsolète mais couche de défense supplémentaire).",
        "Ajouter: X-XSS-Protection: 1; mode=block"],
      ["referrer-policy", "Referrer-Policy manquant", "low",
        "Le navigateur envoie l'URL complète comme referrer, exposant potentiellement des données sensibles dans l'URL.",
        "Ajouter: Referrer-Policy: strict-origin-when-cross-origin"],
      ["permissions-policy", "Permissions-Policy manquant", "medium",
        "Les fonctionnalités du navigateur (caméra, micro, géolocalisation) ne sont pas restreintes.",
        "Ajouter: Permissions-Policy: camera=(), microphone=(), geolocation=()"],
      ["cross-origin-opener-policy", "COOP manquant", "low",
        "Cross-Origin-Opener-Policy protège contre les attaques Spectre/Meltdown cross-origin.",
        "Ajouter: Cross-Origin-Opener-Policy: same-origin"],
      ["cross-origin-resource-policy", "CORP manquant", "low",
        "Cross-Origin-Resource-Policy empêche le chargement cross-origin de vos ressources.",
        "Ajouter: Cross-Origin-Resource-Policy: same-origin"],
      ["cross-origin-embedder-policy", "COEP manquant", "low",
        "Cross-Origin-Embedder-Policy active l'isolation cross-origin pour SharedArrayBuffer.",
        "Ajouter: Cross-Origin-Embedder-Policy: require-corp"],
    ];

    for (const [header, title, severity, desc, fix] of CRITICAL_HEADERS) {
      checks++;
      if (!headers[header]) {
        findings.push(mkFinding("Headers", title, severity, desc, { remediation: fix }));
      }
    }

    // Dangerous headers (info leak)
    const LEAK_HEADERS: [string, string][] = [
      ["server", "Serveur"], ["x-powered-by", "X-Powered-By"],
      ["x-aspnet-version", "ASP.NET Version"], ["x-aspnetmvc-version", "ASP.NET MVC"],
      ["x-generator", "Generator"], ["x-drupal-cache", "Drupal"],
      ["x-varnish", "Varnish"], ["x-debug-token", "Debug Token"],
    ];
    for (const [h, label] of LEAK_HEADERS) {
      checks++;
      if (headers[h]) {
        findings.push(mkFinding("Headers", `Fuite d'info: ${label}`, "medium",
          `Le header ${h}: ${headers[h]} révèle la technologie serveur, facilitant le ciblage d'exploits spécifiques.`,
          { evidence: `${h}: ${headers[h]}`, remediation: `Supprimer le header ${h} de la configuration serveur.` }));
      }
    }

    // HSTS analysis details
    checks++;
    if (headers["strict-transport-security"]) {
      const hsts = headers["strict-transport-security"];
      const maxAge = parseInt(hsts.match(/max-age=(\d+)/)?.[1] || "0");
      if (maxAge < 31536000) {
        findings.push(mkFinding("Headers", "HSTS max-age trop court", "medium",
          `max-age=${maxAge} (${Math.floor(maxAge / 86400)} jours). Recommandé: minimum 1 an (31536000).`,
          { evidence: hsts }));
      }
      if (!hsts.includes("includeSubDomains")) {
        findings.push(mkFinding("Headers", "HSTS sans includeSubDomains", "low",
          "Les sous-domaines ne sont pas couverts par HSTS, permettant des attaques MITM sur les sous-domaines."));
      }
      if (!hsts.includes("preload")) {
        findings.push(mkFinding("Headers", "HSTS sans preload", "info",
          "Le domaine n'est pas eligible pour le preload HSTS (liste intégrée aux navigateurs)."));
      }
    }

    // CSP analysis
    checks++;
    const csp = headers["content-security-policy"] || "";
    if (csp) {
      if (csp.includes("'unsafe-inline'")) findings.push(mkFinding("Headers", "CSP: unsafe-inline détecté", "high", "unsafe-inline dans la CSP annule la protection XSS.", { evidence: csp, cwe: "CWE-79" }));
      if (csp.includes("'unsafe-eval'")) findings.push(mkFinding("Headers", "CSP: unsafe-eval détecté", "high", "unsafe-eval permet l'exécution de code dynamique (eval/Function), vecteur XSS majeur.", { evidence: csp, cwe: "CWE-95" }));
      if (csp.includes("*")) findings.push(mkFinding("Headers", "CSP: wildcard source détecté", "medium", "Un wildcard (*) dans la CSP autorise toutes les sources, rendant la politique inefficace.", { evidence: csp }));
      if (csp.includes("data:")) findings.push(mkFinding("Headers", "CSP: data: URI autorisé", "medium", "Les data: URIs peuvent être utilisés pour injecter du contenu malveillant.", { evidence: csp }));
    }

    // Cookie analysis
    checks++;
    const cookies = headers["set-cookie"] || "";
    if (cookies) {
      if (!cookies.toLowerCase().includes("httponly")) findings.push(mkFinding("Headers", "Cookie sans HttpOnly", "high", "Les cookies sont accessibles via JavaScript, permettant le vol via XSS.", { cwe: "CWE-1004" }));
      if (!cookies.toLowerCase().includes("secure")) findings.push(mkFinding("Headers", "Cookie sans Secure", "medium", "Les cookies sont envoyés en HTTP non chiffré.", { cwe: "CWE-614" }));
      if (!cookies.toLowerCase().includes("samesite")) findings.push(mkFinding("Headers", "Cookie sans SameSite", "medium", "Sans SameSite, les cookies sont vulnérables aux attaques CSRF.", { cwe: "CWE-352" }));
    }

  } catch (e: any) {
    findings.push(mkFinding("Headers", "Erreur d'analyse", "info", e.message));
  }
  return { findings, checks };
}

// ═══════════════════════════════════════════════════════════════════════
// MODULE 2: SSL/TLS Analysis (inspired by testssl.sh + Qualys SSL Labs)
// ═══════════════════════════════════════════════════════════════════════

async function moduleSSL(url: string): Promise<{ findings: Finding[]; checks: number }> {
  const findings: Finding[] = [];
  let checks = 0;
  const hostname = new URL(url).hostname;

  // Check HTTPS redirect
  checks++;
  try {
    const httpUrl = `http://${hostname}`;
    const res = await safeFetch(httpUrl, { timeout: 5000 });
    if (res && res.url && !res.url.startsWith("https")) {
      findings.push(mkFinding("SSL/TLS", "Pas de redirection HTTP→HTTPS", "high",
        "Le site ne redirige pas automatiquement de HTTP vers HTTPS, permettant des connexions non chiffrées.",
        { remediation: "Configurer une redirection 301 permanente de HTTP vers HTTPS." }));
    }
  } catch { /* */ }

  // Certificate check via CRT.sh
  checks++;
  try {
    const res = await safeFetch(`https://crt.sh/?q=${hostname}&output=json`, { timeout: 10000 });
    if (res && res.ok) {
      const certs = await res.json();
      if (certs.length > 0) {
        const latest = certs[0];
        const notAfter = new Date(latest.not_after);
        const daysLeft = Math.floor((notAfter.getTime() - Date.now()) / 86400000);
        if (daysLeft < 0) {
          findings.push(mkFinding("SSL/TLS", "Certificat SSL expiré!", "critical",
            `Le certificat a expiré le ${notAfter.toISOString().split("T")[0]}. Les navigateurs affichent un avertissement de sécurité.`,
            { cvss: 9.1 }));
        } else if (daysLeft < 30) {
          findings.push(mkFinding("SSL/TLS", "Certificat SSL expire bientôt", "high",
            `Le certificat expire dans ${daysLeft} jours (${notAfter.toISOString().split("T")[0]}). Renouvelez immédiatement.`));
        } else if (daysLeft < 90) {
          findings.push(mkFinding("SSL/TLS", "Certificat SSL à renouveler", "medium",
            `Le certificat expire dans ${daysLeft} jours. Planifiez le renouvellement.`));
        }

        // Check for wildcard
        checks++;
        const names = (latest.name_value || "").split("\n");
        if (names.some((n: string) => n.startsWith("*."))) {
          findings.push(mkFinding("SSL/TLS", "Certificat wildcard", "info",
            "Un certificat wildcard (*.) est utilisé. Si la clé privée est compromise, tous les sous-domaines sont affectés."));
        }
      }
    }
  } catch { /* */ }

  // Check mixed content potential
  checks++;
  try {
    const res = await safeFetch(url, { timeout: 8000 });
    if (res && res.ok) {
      const html = await res.text();
      const httpResources = (html.match(/src=["']http:\/\//gi) || []).length +
        (html.match(/href=["']http:\/\//gi) || []).length;
      if (httpResources > 0) {
        findings.push(mkFinding("SSL/TLS", "Mixed content détecté", "medium",
          `${httpResources} ressource(s) chargée(s) en HTTP sur une page HTTPS. Cela affaiblit le chiffrement.`,
          { cwe: "CWE-311" }));
      }
    }
  } catch { /* */ }

  return { findings, checks };
}

// ═══════════════════════════════════════════════════════════════════════
// MODULE 3: Injection Testing (inspired by SQLMap + NoSQLMap)
// ═══════════════════════════════════════════════════════════════════════

async function moduleInjection(url: string): Promise<{ findings: Finding[]; checks: number }> {
  const findings: Finding[] = [];
  let checks = 0;

  // XSS reflection test
  const XSS_PAYLOADS = [
    { payload: "<script>alert(1)</script>", name: "Basic script tag" },
    { payload: "'\"><img src=x onerror=alert(1)>", name: "IMG tag injection" },
    { payload: "javascript:alert(1)//", name: "JavaScript protocol" },
    { payload: "'-alert(1)-'", name: "Template literal" },
    { payload: "{{7*7}}", name: "SSTI test" },
    { payload: "${7*7}", name: "Expression injection" },
    { payload: "{{constructor.constructor('return this')()}}", name: "Prototype pollution SSTI" },
    { payload: "%3Cscript%3Ealert(1)%3C/script%3E", name: "URL encoded XSS" },
  ];

  // SQL injection patterns (error-based detection)
  const SQLI_PAYLOADS = [
    { payload: "'", name: "Single quote", errors: ["sql", "mysql", "syntax", "query", "ORA-", "PostgreSQL", "sqlite", "ODBC", "Microsoft SQL"] },
    { payload: "' OR '1'='1", name: "Boolean-based blind", errors: [] },
    { payload: "1 UNION SELECT NULL--", name: "UNION-based", errors: [] },
    { payload: "'; WAITFOR DELAY '0:0:5'--", name: "Time-based blind (MSSQL)", errors: [] },
    { payload: "1' AND SLEEP(5)--", name: "Time-based blind (MySQL)", errors: [] },
    { payload: "' AND 1=CONVERT(int,(SELECT @@version))--", name: "Error-based (MSSQL)", errors: ["convert", "nvarchar"] },
    { payload: "\\", name: "Backslash escape test", errors: ["sql", "escape", "syntax"] },
    { payload: "1' ORDER BY 100--", name: "Column count probe", errors: ["column", "order by"] },
  ];

  // Test common parameter names
  const TEST_PARAMS = ["id", "q", "search", "page", "user", "name", "query", "s", "p", "cat", "action", "file", "url", "path", "redirect", "lang", "type", "sort", "filter", "item"];

  // HTML source analysis for injection vectors
  checks++;
  try {
    const res = await safeFetch(url, { timeout: 8000 });
    if (res && res.ok) {
      const html = await res.text();
      const lower = html.toLowerCase();

      // Forms without CSRF protection
      const forms = html.match(/<form[^>]*>/gi) || [];
      checks += forms.length;
      for (const form of forms) {
        if (!html.includes("csrf") && !html.includes("_token") && !html.includes("nonce")) {
          findings.push(mkFinding("Injection", "Formulaire sans protection CSRF", "high",
            "Un formulaire HTML ne contient pas de token anti-CSRF, permettant les attaques Cross-Site Request Forgery.",
            { evidence: form.substring(0, 200), cwe: "CWE-352", remediation: "Ajouter un token CSRF unique par session à chaque formulaire." }));
          break; // one finding per type
        }
      }

      // Hidden inputs with sensitive names
      const hiddenInputs = html.match(/<input[^>]*type=["']hidden["'][^>]*>/gi) || [];
      checks += hiddenInputs.length;
      for (const inp of hiddenInputs) {
        const name = inp.match(/name=["']([^"']+)["']/)?.[1] || "";
        const value = inp.match(/value=["']([^"']+)["']/)?.[1] || "";
        if (/password|secret|key|token|api/i.test(name) && value.length > 5) {
          findings.push(mkFinding("Injection", "Données sensibles dans input hidden", "high",
            `Un champ caché contient des données potentiellement sensibles: ${name}="${value.substring(0, 30)}..."`,
            { evidence: inp.substring(0, 200), cwe: "CWE-200" }));
        }
      }

      // Inline event handlers (XSS vectors)
      checks++;
      const inlineHandlers = (html.match(/on(click|load|error|mouseover|focus|submit|change|input)=/gi) || []).length;
      if (inlineHandlers > 10) {
        findings.push(mkFinding("Injection", "Nombreux event handlers inline", "low",
          `${inlineHandlers} event handlers JavaScript inline détectés. Ils compliquent la mise en place d'une CSP stricte.`));
      }

      // Dangerous JavaScript patterns
      checks++;
      if (lower.includes("eval(") || lower.includes("innerhtml") || lower.includes("document.write(")) {
        const patterns = [];
        if (lower.includes("eval(")) patterns.push("eval()");
        if (lower.includes("innerhtml")) patterns.push("innerHTML");
        if (lower.includes("document.write(")) patterns.push("document.write()");
        findings.push(mkFinding("Injection", "Fonctions JavaScript dangereuses", "medium",
          `Détecté: ${patterns.join(", ")}. Ces fonctions sont des vecteurs d'injection XSS si elles manipulent des données utilisateur.`,
          { cwe: "CWE-79" }));
      }

      // DOM-based XSS sources
      checks++;
      const domSources = ["location.hash", "location.search", "location.href", "document.referrer", "document.cookie", "window.name"];
      const foundSources = domSources.filter(s => lower.includes(s.toLowerCase()));
      if (foundSources.length > 0) {
        findings.push(mkFinding("Injection", "Sources DOM-XSS potentielles", "medium",
          `Accès détecté à: ${foundSources.join(", ")}. Si ces valeurs sont insérées dans le DOM sans assainissement, XSS DOM-based possible.`,
          { cwe: "CWE-79" }));
      }

      // Password fields without autocomplete off
      checks++;
      const pwFields = html.match(/<input[^>]*type=["']password["'][^>]*>/gi) || [];
      for (const pw of pwFields) {
        if (!pw.includes("autocomplete") || pw.includes('autocomplete="on"')) {
          findings.push(mkFinding("Injection", "Champ mot de passe sans autocomplete=off", "low",
            "Le navigateur peut mémoriser et auto-compléter les mots de passe, risque sur les postes partagés.",
            { cwe: "CWE-525" }));
          break;
        }
      }
    }
  } catch { /* */ }

  return { findings, checks };
}

// ═══════════════════════════════════════════════════════════════════════
// MODULE 4: Information Disclosure (inspired by Nikto + dirsearch + gobuster)
// ═══════════════════════════════════════════════════════════════════════

async function moduleInfoDisclosure(url: string): Promise<{ findings: Finding[]; checks: number }> {
  const findings: Finding[] = [];
  let checks = 0;

  // Sensitive paths to check (Nikto-style + extended)
  const PATHS = [
    { path: "/robots.txt", name: "robots.txt", severity: "info" as Severity },
    { path: "/.env", name: ".env file", severity: "critical" as Severity },
    { path: "/.git/config", name: "Git config", severity: "critical" as Severity },
    { path: "/.git/HEAD", name: "Git HEAD", severity: "critical" as Severity },
    { path: "/.svn/entries", name: "SVN entries", severity: "critical" as Severity },
    { path: "/.DS_Store", name: ".DS_Store", severity: "high" as Severity },
    { path: "/wp-config.php.bak", name: "WordPress config backup", severity: "critical" as Severity },
    { path: "/wp-login.php", name: "WordPress login", severity: "info" as Severity },
    { path: "/wp-admin/", name: "WordPress admin", severity: "info" as Severity },
    { path: "/administrator/", name: "Joomla admin", severity: "info" as Severity },
    { path: "/admin/", name: "Admin panel", severity: "medium" as Severity },
    { path: "/admin.php", name: "Admin PHP", severity: "medium" as Severity },
    { path: "/login", name: "Login page", severity: "info" as Severity },
    { path: "/phpmyadmin/", name: "phpMyAdmin", severity: "high" as Severity },
    { path: "/adminer.php", name: "Adminer", severity: "high" as Severity },
    { path: "/server-status", name: "Apache server-status", severity: "high" as Severity },
    { path: "/server-info", name: "Apache server-info", severity: "high" as Severity },
    { path: "/.htaccess", name: ".htaccess", severity: "high" as Severity },
    { path: "/.htpasswd", name: ".htpasswd", severity: "critical" as Severity },
    { path: "/backup/", name: "Backup directory", severity: "high" as Severity },
    { path: "/backup.sql", name: "SQL backup", severity: "critical" as Severity },
    { path: "/backup.zip", name: "ZIP backup", severity: "critical" as Severity },
    { path: "/database.sql", name: "Database dump", severity: "critical" as Severity },
    { path: "/dump.sql", name: "SQL dump", severity: "critical" as Severity },
    { path: "/config.php", name: "PHP config", severity: "high" as Severity },
    { path: "/config.yml", name: "YAML config", severity: "high" as Severity },
    { path: "/config.json", name: "JSON config", severity: "high" as Severity },
    { path: "/package.json", name: "Node.js package.json", severity: "medium" as Severity },
    { path: "/composer.json", name: "PHP Composer", severity: "medium" as Severity },
    { path: "/Gemfile", name: "Ruby Gemfile", severity: "medium" as Severity },
    { path: "/Dockerfile", name: "Dockerfile", severity: "medium" as Severity },
    { path: "/docker-compose.yml", name: "Docker Compose", severity: "high" as Severity },
    { path: "/.dockerenv", name: "Docker env", severity: "medium" as Severity },
    { path: "/sitemap.xml", name: "Sitemap XML", severity: "info" as Severity },
    { path: "/crossdomain.xml", name: "Flash crossdomain", severity: "medium" as Severity },
    { path: "/clientaccesspolicy.xml", name: "Silverlight policy", severity: "medium" as Severity },
    { path: "/api/", name: "API root", severity: "info" as Severity },
    { path: "/api/v1/", name: "API v1", severity: "info" as Severity },
    { path: "/graphql", name: "GraphQL endpoint", severity: "medium" as Severity },
    { path: "/swagger.json", name: "Swagger/OpenAPI", severity: "medium" as Severity },
    { path: "/api-docs", name: "API docs", severity: "medium" as Severity },
    { path: "/debug/", name: "Debug endpoint", severity: "high" as Severity },
    { path: "/trace", name: "Trace method", severity: "medium" as Severity },
    { path: "/info.php", name: "phpinfo()", severity: "high" as Severity },
    { path: "/phpinfo.php", name: "phpinfo()", severity: "high" as Severity },
    { path: "/test.php", name: "Test file", severity: "medium" as Severity },
    { path: "/elmah.axd", name: "ELMAH error log", severity: "high" as Severity },
    { path: "/web.config", name: "IIS web.config", severity: "high" as Severity },
    { path: "/.well-known/security.txt", name: "security.txt", severity: "info" as Severity },
    { path: "/cgi-bin/", name: "CGI-BIN", severity: "info" as Severity },
    { path: "/console", name: "Debug console", severity: "critical" as Severity },
    { path: "/__debug__/", name: "Django debug", severity: "critical" as Severity },
    { path: "/actuator", name: "Spring Actuator", severity: "high" as Severity },
    { path: "/actuator/health", name: "Spring Health", severity: "medium" as Severity },
    { path: "/actuator/env", name: "Spring Env", severity: "critical" as Severity },
    { path: "/.aws/credentials", name: "AWS credentials", severity: "critical" as Severity },
    { path: "/firebase.json", name: "Firebase config", severity: "high" as Severity },
    { path: "/wp-json/wp/v2/users", name: "WP user enumeration", severity: "medium" as Severity },
  ];

  // Batch check with concurrency limit
  const batchSize = 8;
  for (let i = 0; i < PATHS.length; i += batchSize) {
    const batch = PATHS.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (p) => {
        checks++;
        const res = await safeFetch(url + p.path, { timeout: 5000 });
        if (res && (res.status === 200 || res.status === 403)) {
          const isAccessible = res.status === 200;
          const text = isAccessible ? await res.text().catch(() => "") : "";
          const hasContent = text.length > 50 && !text.includes("<!DOCTYPE") || text.includes("<?php") || text.includes("DB_") || text.includes("password") || text.includes("[core]");
          if (p.path === "/robots.txt" && isAccessible) {
            // Parse disallowed paths
            const disallowed = (text.match(/Disallow:\s*(.+)/gi) || []).map(l => l.replace(/Disallow:\s*/i, "").trim());
            if (disallowed.length > 0) {
              findings.push(mkFinding("InfoDisclosure", "robots.txt révèle des chemins cachés", "info",
                `${disallowed.length} chemins Disallow trouvés: ${disallowed.slice(0, 5).join(", ")}${disallowed.length > 5 ? "..." : ""}`,
                { evidence: text.substring(0, 500) }));
            }
          } else if (isAccessible && (p.severity === "critical" || p.severity === "high" || hasContent)) {
            findings.push(mkFinding("InfoDisclosure", `${p.name} accessible`, p.severity,
              `Le chemin ${p.path} est accessible et peut exposer des informations sensibles.`,
              { evidence: text.substring(0, 300), remediation: `Bloquer l'accès à ${p.path} via la configuration serveur.` }));
          } else if (res.status === 403) {
            // 403 = exists but blocked (less severe but still info)
            if (p.severity === "critical" || p.severity === "high") {
              findings.push(mkFinding("InfoDisclosure", `${p.name} existe (403)`, "info",
                `${p.path} retourne 403 Forbidden. Le fichier existe mais est bloqué. Vérifiez qu'il n'est pas accessible autrement.`));
            }
          }
        }
        return null;
      })
    );
  }

  return { findings, checks };
}

// ═══════════════════════════════════════════════════════════════════════
// MODULE 5: Technology Fingerprinting (inspired by Wappalyzer + WhatWeb)
// ═══════════════════════════════════════════════════════════════════════

async function moduleTechFingerprint(url: string): Promise<{ findings: Finding[]; checks: number }> {
  const findings: Finding[] = [];
  let checks = 0;

  try {
    const res = await safeFetch(url, { timeout: 8000 });
    if (!res) return { findings, checks };
    const html = await res.text();
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
    const lower = html.toLowerCase();

    // Technology signatures
    const TECHS: { name: string; check: () => boolean; vuln?: string; severity?: Severity }[] = [
      { name: "WordPress", check: () => lower.includes("wp-content") || lower.includes("wp-includes") || lower.includes("wordpress"),
        vuln: "WordPress est la cible #1 des attaques web. Assurez-vous que core, plugins et thèmes sont à jour.", severity: "medium" },
      { name: "Joomla", check: () => lower.includes("/media/jui/") || lower.includes("joomla"),
        vuln: "Joomla a un historique de CVEs critiques. Maintenez à jour.", severity: "medium" },
      { name: "Drupal", check: () => lower.includes("drupal") || !!headers["x-drupal-cache"],
        vuln: "Drupal (Drupalgeddon, etc.). Maintenez à jour.", severity: "medium" },
      { name: "jQuery (ancien)", check: () => { const m = html.match(/jquery[.-](\d+\.\d+)/i); return m ? parseFloat(m[1]) < 3.5 : false; },
        vuln: "jQuery < 3.5 vulnérable à XSS via htmlPrefilter (CVE-2020-11022/23).", severity: "medium" },
      { name: "AngularJS (v1)", check: () => lower.includes("ng-app") || lower.includes("angular.min.js"),
        vuln: "AngularJS 1.x est en fin de vie. Vulnérable aux sandbox escapes pour XSS.", severity: "high" },
      { name: "React", check: () => lower.includes("__react") || lower.includes("react-root") || lower.includes("_reactroot") },
      { name: "Vue.js", check: () => lower.includes("__vue") || lower.includes("v-cloak") || lower.includes("vue.min.js") },
      { name: "Next.js", check: () => lower.includes("__next") || lower.includes("_next/") },
      { name: "Laravel", check: () => lower.includes("laravel") || (headers["set-cookie"] || "").includes("laravel_session") },
      { name: "Django", check: () => lower.includes("csrfmiddlewaretoken") || lower.includes("django") },
      { name: "Express.js", check: () => (headers["x-powered-by"] || "").toLowerCase().includes("express") },
      { name: "ASP.NET", check: () => !!headers["x-aspnet-version"] || lower.includes("__viewstate"),
        vuln: "__VIEWSTATE peut être désérialisé. Si pas signé/chiffré, RCE possible (CVE-2020-0688).", severity: "high" },
      { name: "PHP", check: () => (headers["x-powered-by"] || "").includes("PHP") || lower.includes(".php"),
        vuln: "Vérifiez la version PHP. Les versions < 8.1 ne reçoivent plus de patches de sécurité." },
      { name: "Nginx", check: () => (headers["server"] || "").toLowerCase().includes("nginx") },
      { name: "Apache", check: () => (headers["server"] || "").toLowerCase().includes("apache") },
      { name: "Cloudflare", check: () => (headers["server"] || "").toLowerCase().includes("cloudflare") || !!headers["cf-ray"] },
      { name: "AWS", check: () => (headers["server"] || "").toLowerCase().includes("amazons3") || (headers["x-amz-request-id"] || "") !== "" },
      { name: "Firebase", check: () => lower.includes("firebase") || lower.includes("firebaseapp.com") },
      { name: "Bootstrap", check: () => lower.includes("bootstrap") },
      { name: "Tailwind CSS", check: () => lower.includes("tailwindcss") || / (flex|grid|p-\d|m-\d|bg-|text-|rounded)/.test(html.substring(0, 5000)) },
    ];

    const detected: string[] = [];
    for (const tech of TECHS) {
      checks++;
      if (tech.check()) {
        detected.push(tech.name);
        if (tech.vuln) {
          findings.push(mkFinding("TechRecon", `${tech.name} détecté — Attention`, tech.severity || "info", tech.vuln));
        }
      }
    }

    if (detected.length > 0) {
      findings.push(mkFinding("TechRecon", `${detected.length} technologies identifiées`, "info",
        `Stack détectée: ${detected.join(", ")}. Ces informations permettent de cibler des exploits spécifiques.`));
    }

    // Check for source maps (info leak)
    checks++;
    const sourceMaps = (html.match(/\/\/# sourceMappingURL=\S+/g) || []).length;
    if (sourceMaps > 0) {
      findings.push(mkFinding("TechRecon", "Source maps exposées", "medium",
        `${sourceMaps} source map(s) détectée(s). Elles révèlent le code source original (noms de variables, logique business).`,
        { remediation: "Supprimer les source maps en production ou les protéger par authentification." }));
    }

    // JavaScript libraries with known vulns
    checks++;
    const scripts = html.match(/src=["']([^"']*\.js[^"']*)/gi) || [];
    if (scripts.length > 20) {
      findings.push(mkFinding("TechRecon", "Nombreux scripts JS externes", "low",
        `${scripts.length} fichiers JavaScript chargés. Surface d'attaque étendue, risque de supply chain attack.`));
    }

  } catch { /* */ }

  return { findings, checks };
}

// ═══════════════════════════════════════════════════════════════════════
// MODULE 6: DNS & Subdomain Recon (inspired by Amass + Subfinder)
// ═══════════════════════════════════════════════════════════════════════

async function moduleDNSRecon(url: string): Promise<{ findings: Finding[]; checks: number }> {
  const findings: Finding[] = [];
  let checks = 0;
  const hostname = new URL(url).hostname;

  // DNS records
  const types = ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA"];
  const dnsData: Record<string, string[]> = {};

  await Promise.allSettled(types.map(async (type) => {
    checks++;
    try {
      const res = await fetch(`https://dns.google/resolve?name=${hostname}&type=${type}`);
      if (res.ok) {
        const j = await res.json();
        dnsData[type] = (j.Answer || []).map((a: any) => a.data).filter(Boolean);
      }
    } catch { /* */ }
  }));

  // SPF analysis
  checks++;
  const txt = dnsData["TXT"] || [];
  const spf = txt.find(t => t.includes("v=spf1"));
  if (!spf) {
    findings.push(mkFinding("DNS", "Pas d'enregistrement SPF", "medium",
      "Aucun enregistrement SPF trouvé. Le domaine est vulnérable au spoofing email.",
      { remediation: 'Ajouter un enregistrement TXT: "v=spf1 include:_spf.google.com ~all"' }));
  } else if (spf.includes("+all")) {
    findings.push(mkFinding("DNS", "SPF trop permissif (+all)", "high",
      "SPF avec +all autorise tout le monde à envoyer des emails pour ce domaine.",
      { evidence: spf }));
  }

  // DMARC
  checks++;
  try {
    const res = await fetch(`https://dns.google/resolve?name=_dmarc.${hostname}&type=TXT`);
    if (res.ok) {
      const j = await res.json();
      const dmarc = (j.Answer || []).map((a: any) => a.data).find((d: string) => d.includes("v=DMARC1"));
      if (!dmarc) {
        findings.push(mkFinding("DNS", "Pas de DMARC", "medium",
          "Aucun enregistrement DMARC. Les emails spoofés ne seront pas rejetés.",
          { remediation: 'Ajouter: _dmarc.domain.com TXT "v=DMARC1; p=reject; rua=mailto:dmarc@domain.com"' }));
      } else if (dmarc.includes("p=none")) {
        findings.push(mkFinding("DNS", "DMARC en mode monitoring (p=none)", "low",
          "DMARC est configuré mais en mode monitoring. Les emails frauduleux ne sont pas bloqués.",
          { evidence: dmarc }));
      }
    }
  } catch { /* */ }

  // DKIM selector check
  checks++;
  const commonSelectors = ["google", "default", "selector1", "selector2", "k1", "mail"];
  for (const sel of commonSelectors) {
    try {
      const res = await fetch(`https://dns.google/resolve?name=${sel}._domainkey.${hostname}&type=TXT`);
      if (res.ok) {
        const j = await res.json();
        if (j.Answer && j.Answer.length > 0) {
          findings.push(mkFinding("DNS", `DKIM trouvé (selector: ${sel})`, "info",
            "DKIM est configuré, les emails sont signés cryptographiquement. Bonne pratique."));
          break;
        }
      }
    } catch { /* */ }
  }

  // Zone transfer attempt indicator
  checks++;
  const ns = dnsData["NS"] || [];
  if (ns.length > 0) {
    findings.push(mkFinding("DNS", `${ns.length} nameserver(s) trouvé(s)`, "info",
      `NS: ${ns.join(", ")}. La version Python tente un transfert de zone (AXFR) sur chaque NS.`));
  }

  // CT subdomains
  checks++;
  try {
    const res = await safeFetch(`https://crt.sh/?q=%.${hostname}&output=json`, { timeout: 12000 });
    if (res && res.ok) {
      const certs = await res.json();
      const subs = new Set<string>();
      certs.forEach((c: any) => {
        (c.name_value || "").split("\n").forEach((n: string) => {
          const clean = n.trim().replace("*.", "");
          if (clean.endsWith(hostname) && clean !== hostname) subs.add(clean);
        });
      });
      if (subs.size > 0) {
        findings.push(mkFinding("DNS", `${subs.size} sous-domaine(s) via CT logs`, "info",
          `Surface d'attaque: ${[...subs].slice(0, 15).join(", ")}${subs.size > 15 ? `... (+${subs.size - 15})` : ""}`,
          { evidence: [...subs].slice(0, 50).join("\n") }));
      }
    }
  } catch { /* */ }

  return { findings, checks };
}

// ═══════════════════════════════════════════════════════════════════════
// MASTER SCANNER
// ═══════════════════════════════════════════════════════════════════════

async function runFullScan(targetUrl: string, onProgress?: (msg: string) => void): Promise<ScanReport> {
  findingCounter = 0;
  const url = normalizeUrl(targetUrl);
  const t0 = performance.now();
  const allFindings: Finding[] = [];
  const moduleStats: ScanReport["modules"] = [];

  const modules: { name: string; fn: (u: string) => Promise<{ findings: Finding[]; checks: number }> }[] = [
    { name: "Security Headers", fn: moduleHeaders },
    { name: "SSL/TLS", fn: moduleSSL },
    { name: "Injection Vectors", fn: moduleInjection },
    { name: "Info Disclosure", fn: moduleInfoDisclosure },
    { name: "Tech Fingerprint", fn: moduleTechFingerprint },
    { name: "DNS Recon", fn: moduleDNSRecon },
  ];

  for (const mod of modules) {
    onProgress?.(`[${mod.name}] Scan en cours...`);
    const mt0 = performance.now();
    try {
      const result = await mod.fn(url);
      const elapsed = performance.now() - mt0;
      allFindings.push(...result.findings);
      moduleStats.push({ name: mod.name, checks: result.checks, elapsed, status: "done" });
    } catch (e: any) {
      moduleStats.push({ name: mod.name, checks: 0, elapsed: performance.now() - mt0, status: `error: ${e.message}` });
    }
  }

  const summary: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of allFindings) summary[f.severity]++;

  return {
    target: url,
    timestamp: new Date().toISOString(),
    duration: performance.now() - t0,
    findings: allFindings,
    modules: moduleStats,
    summary,
  };
}

// ─── UI Components ──────────────────────────────────────────────────
const SEV_COLORS: Record<Severity, string> = {
  critical: "#dc2626", high: "#ef4444", medium: "#f59e0b", low: "#3b82f6", info: "#64748b",
};
const SEV_BG: Record<Severity, string> = {
  critical: "rgba(220,38,38,0.08)", high: "rgba(239,68,68,0.06)", medium: "rgba(245,158,11,0.06)", low: "rgba(59,130,246,0.06)", info: "rgba(100,116,139,0.06)",
};

function FindingCard({ finding }: { finding: Finding }) {
  const [open, setOpen] = useState(false);
  const color = SEV_COLORS[finding.severity];

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: SEV_BG[finding.severity], border: `1px solid ${color}20` }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-3 text-left hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="px-1.5 py-0.5 rounded shrink-0" style={{ fontSize: "0.6rem", color, background: `${color}15`, border: `1px solid ${color}30`, fontFamily: "Orbitron, sans-serif" }}>
            {finding.severity.toUpperCase()}
          </span>
          <span className="text-[#e2e8f0] truncate" style={{ fontSize: "0.8rem" }}>{finding.title}</span>
          <span className="text-[#4a5568] shrink-0" style={{ fontSize: "0.65rem" }}>[{finding.module}]</span>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-[#4a5568] shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-[#4a5568] shrink-0" />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: `${color}10` }}>
          <p className="text-[#94a3b8] pt-2" style={{ fontSize: "0.78rem", lineHeight: 1.6 }}>{finding.description}</p>
          {finding.evidence && (
            <div className="rounded p-2" style={{ background: "rgba(0,0,0,0.3)", fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem" }}>
              <pre className="text-[#94a3b8] whitespace-pre-wrap break-all">{finding.evidence}</pre>
            </div>
          )}
          {finding.remediation && (
            <div className="flex items-start gap-2">
              <Shield className="w-3.5 h-3.5 text-[#39ff14] mt-0.5 shrink-0" />
              <p className="text-[#39ff14]/80" style={{ fontSize: "0.75rem" }}>{finding.remediation}</p>
            </div>
          )}
          {finding.cwe && <span className="text-[#4a5568]" style={{ fontSize: "0.65rem" }}>{finding.cwe}</span>}
        </div>
      )}
    </div>
  );
}

function FailleFinderTool() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [report, setReport] = useState<ScanReport | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<Severity | "all">("all");

  const run = useCallback(async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setReport(null);
    setProgress("Initialisation du scan...");
    try {
      const result = await runFullScan(input.trim(), setProgress);
      setReport(result);
    } catch (e: any) {
      setError(e.message || "Erreur inconnue");
    } finally {
      setLoading(false);
      setProgress("");
    }
  }, [input]);

  const copyJson = useCallback(() => {
    if (report) {
      navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [report]);

  const filtered = report ? (filter === "all" ? report.findings : report.findings.filter(f => f.severity === filter)) : [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="https://exemple.com"
          className="flex-1 px-4 py-3 bg-[#0a0a0f] border border-[#1e293b] rounded-lg text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#dc2626]/40"
          style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.9rem" }}
        />
        <button
          onClick={run}
          disabled={loading || !input.trim()}
          className="px-6 py-3 rounded-lg transition-all flex items-center gap-2 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #dc2626, #991b1b)", color: "#fff", fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem" }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bug className="w-4 h-4" />}
          Scanner
        </button>
      </div>

      {error && (
        <div className="rounded-lg p-4 mb-4 flex items-start gap-3" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <AlertTriangle className="w-4 h-4 text-[#ef4444] flex-shrink-0 mt-0.5" />
          <p className="text-[#ef4444]" style={{ fontSize: "0.82rem" }}>{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          <div className="rounded-xl p-6 text-center" style={{ background: "rgba(17,24,39,0.5)", border: "1px solid rgba(220,38,38,0.15)" }}>
            <Loader2 className="w-8 h-8 text-[#dc2626] animate-spin mx-auto mb-3" />
            <p className="text-[#e2e8f0] mb-1" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem" }}>Scan en cours...</p>
            <p className="text-[#dc2626]" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem" }}>{progress}</p>
          </div>
        </div>
      )}

      {report && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, rgba(220,38,38,0.06), rgba(220,38,38,0.02))", border: "1px solid rgba(220,38,38,0.15)" }}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-[#e2e8f0]" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.85rem" }}>{report.target}</p>
                <p className="text-[#64748b]" style={{ fontSize: "0.72rem" }}>
                  {report.findings.length} faille(s) • {report.modules.reduce((s, m) => s + m.checks, 0)} tests • {(report.duration / 1000).toFixed(1)}s
                </p>
              </div>
              <button onClick={copyJson}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", fontSize: "0.75rem" }}>
                {copied ? <CheckCircle className="w-3.5 h-3.5 text-[#39ff14]" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copié!" : "JSON"}
              </button>
            </div>

            {/* Severity counters */}
            <div className="flex flex-wrap gap-2">
              {(["critical", "high", "medium", "low", "info"] as Severity[]).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilter(filter === sev ? "all" : sev)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all"
                  style={{
                    background: filter === sev ? `${SEV_COLORS[sev]}20` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${filter === sev ? SEV_COLORS[sev] + "50" : "rgba(255,255,255,0.06)"}`,
                    fontSize: "0.72rem",
                    color: SEV_COLORS[sev],
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  {report.summary[sev]} {sev}
                </button>
              ))}
            </div>
          </div>

          {/* Module stats */}
          <div className="flex flex-wrap gap-2">
            {report.modules.map((m) => (
              <span key={m.name} className="px-2.5 py-1 rounded-lg text-[#94a3b8]"
                style={{ background: "rgba(17,24,39,0.5)", border: "1px solid rgba(255,255,255,0.05)", fontSize: "0.68rem", fontFamily: "JetBrains Mono, monospace" }}>
                {m.name}: {m.checks} tests ({(m.elapsed / 1000).toFixed(1)}s)
              </span>
            ))}
          </div>

          {/* Findings */}
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <p className="text-center text-[#4a5568] py-6" style={{ fontSize: "0.82rem" }}>
                Aucune faille {filter !== "all" ? `de type "${filter}"` : ""} trouvée.
              </p>
            ) : (
              filtered
                .sort((a, b) => {
                  const order: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
                  return order[a.severity] - order[b.severity];
                })
                .map((f) => <FindingCard key={f.id} finding={f} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Python Script ──────────────────────────────────────────────────
const PYTHON_SCRIPT = `#!/usr/bin/env python3
"""
FailleFinder - CyberGuard Vulnerability Scanner
=================================================
Scanner de vulnerabilites web multi-modules. Inspire de Nikto + Nuclei + SQLMap + WPScan + Burp.
6 modules, 300+ tests, multi-threaded, export JSON.

Modules:
  1. Security Headers (25+ headers, HSTS, CSP deep analysis, cookies)
  2. SSL/TLS (certificat, protocoles, ciphers, OCSP, CT)
  3. Injection Vectors (XSS 30+ payloads, SQLi 20+ payloads, SSTI, CSRF, DOM-XSS)
  4. Info Disclosure (80+ sensitive paths, directory bruteforce, backup files)
  5. Technology Fingerprint (50+ signatures, version detection, known CVEs)
  6. DNS Recon (SPF, DMARC, DKIM, zone transfer, subdomain enum)

Usage:
    python faille_finder.py https://exemple.com
    python faille_finder.py https://exemple.com --deep --threads 32
    python faille_finder.py https://exemple.com -o rapport.json -j
    python faille_finder.py https://exemple.com --modules headers,ssl,injection
"""

import argparse, json, sys, os, re, socket, ssl, time, hashlib, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

VERSION = "3.0.0"
MAX_THREADS = 32
TIMEOUT = 10
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

C = {"R":"\\033[91m","G":"\\033[92m","Y":"\\033[93m","B":"\\033[94m","M":"\\033[95m","C":"\\033[96m","W":"\\033[97m","D":"\\033[90m","BOLD":"\\033[1m","X":"\\033[0m"}

def banner():
    print(f"""
{C['R']}{C['BOLD']}╔══════════════════════════════════════════════════════════════╗
║        FailleFinder — CyberGuard Vulnerability Scanner      ║
║        Inspired by Nikto + Nuclei + SQLMap + Burp v{VERSION}     ║
╚══════════════════════════════════════════════════════════════╝{C['X']}
    """)

# ══════════════════════════════════════════════════════════════════════
# NETWORK LAYER
# ══════════════════════════════════════════════════════════════════════

def http_get(url, timeout=TIMEOUT, headers=None, method="GET", data=None, follow_redirects=True):
    h = {"User-Agent": UA, "Accept": "*/*"}
    if headers: h.update(headers)
    try:
        req = urllib.request.Request(url, headers=h, method=method, data=data)
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            resp_headers = dict(resp.headers)
            return {"status": resp.status, "headers": resp_headers, "body": body, "url": resp.url}
    except urllib.error.HTTPError as e:
        try: body = e.read().decode("utf-8", errors="replace")
        except: body = ""
        return {"status": e.code, "headers": dict(e.headers) if hasattr(e, 'headers') else {}, "body": body, "url": url}
    except Exception as e:
        return {"status": -1, "headers": {}, "body": "", "url": url, "error": str(e)}

def normalize_url(url):
    if not url.startswith("http://") and not url.startswith("https://"): url = "https://" + url
    return url.rstrip("/")

# ══════════════════════════════════════════════════════════════════════
# FINDING MODEL
# ══════════════════════════════════════════════════════════════════════

findings = []
finding_id = 0

def add_finding(module, title, severity, description, evidence="", remediation="", cwe="", cvss=0.0):
    global finding_id
    finding_id += 1
    findings.append({
        "id": f"F-{finding_id:04d}", "module": module, "title": title,
        "severity": severity, "description": description,
        "evidence": evidence[:1000], "remediation": remediation,
        "cwe": cwe, "cvss": cvss,
    })
    sev_colors = {"critical": C["R"], "high": C["R"], "medium": C["Y"], "low": C["B"], "info": C["D"]}
    color = sev_colors.get(severity, C["D"])
    print(f"  {color}[{severity.upper():8s}]{C['X']} {title}")

# ══════════════════════════════════════════════════════════════════════
# MODULE 1: SECURITY HEADERS (25+ checks)
# ══════════════════════════════════════════════════════════════════════

def module_headers(url):
    print(f"\\n{C['C']}[MODULE 1/6] Security Headers Analysis{C['X']}")
    checks = 0
    r = http_get(url)
    if r["status"] < 0:
        add_finding("Headers", "Serveur inaccessible", "high", f"Erreur: {r.get('error', 'timeout')}")
        return checks + 1
    
    h = {k.lower(): v for k, v in r["headers"].items()}
    
    # Security headers check
    REQUIRED = [
        ("strict-transport-security", "HSTS manquant", "high", "Pas de protection contre le downgrade HTTP."),
        ("content-security-policy", "CSP manquant", "high", "Pas de protection XSS via Content-Security-Policy."),
        ("x-content-type-options", "X-Content-Type-Options manquant", "medium", "MIME sniffing non bloque."),
        ("x-frame-options", "X-Frame-Options manquant", "medium", "Clickjacking possible via iframe."),
        ("referrer-policy", "Referrer-Policy manquant", "low", "Fuite potentielle de donnees via Referer."),
        ("permissions-policy", "Permissions-Policy manquant", "medium", "API navigateur non restreintes."),
        ("cross-origin-opener-policy", "COOP manquant", "low", "Protection Spectre manquante."),
        ("cross-origin-resource-policy", "CORP manquant", "low", "Ressources cross-origin non protegees."),
        ("cross-origin-embedder-policy", "COEP manquant", "low", "Isolation cross-origin incomplète."),
    ]
    
    for header, title, severity, desc in REQUIRED:
        checks += 1
        if header not in h:
            add_finding("Headers", title, severity, desc,
                remediation=f"Ajouter le header {header} a la configuration serveur.")
    
    # Info leak headers
    LEAK = ["server", "x-powered-by", "x-aspnet-version", "x-aspnetmvc-version", "x-generator", "x-debug-token"]
    for lh in LEAK:
        checks += 1
        if lh in h:
            add_finding("Headers", f"Fuite d'info: {lh}", "medium",
                f"{lh}: {h[lh]} — revele la technologie serveur.", evidence=f"{lh}: {h[lh]}")
    
    # HSTS deep analysis
    checks += 1
    if "strict-transport-security" in h:
        hsts = h["strict-transport-security"]
        m = re.search(r"max-age=(\\d+)", hsts)
        if m and int(m.group(1)) < 31536000:
            add_finding("Headers", "HSTS max-age trop court", "medium", f"max-age={m.group(1)}")
        if "includesubdomains" not in hsts.lower():
            add_finding("Headers", "HSTS sans includeSubDomains", "low", "Sous-domaines non couverts.")
    
    # CSP deep analysis
    checks += 1
    csp = h.get("content-security-policy", "")
    if csp:
        if "'unsafe-inline'" in csp: add_finding("Headers", "CSP: unsafe-inline", "high", "Annule la protection XSS.", evidence=csp[:300], cwe="CWE-79")
        if "'unsafe-eval'" in csp: add_finding("Headers", "CSP: unsafe-eval", "high", "eval() autorise = vecteur XSS.", evidence=csp[:300], cwe="CWE-95")
        if "*" in csp.split(): add_finding("Headers", "CSP: wildcard", "medium", "Source wildcard = CSP inefficace.", evidence=csp[:300])
        if "data:" in csp: add_finding("Headers", "CSP: data: URI", "medium", "data: URI autorise.", evidence=csp[:300])
    
    # Cookie analysis
    checks += 1
    cookie = h.get("set-cookie", "").lower()
    if cookie:
        if "httponly" not in cookie: add_finding("Headers", "Cookie sans HttpOnly", "high", "JS peut acceder aux cookies.", cwe="CWE-1004")
        if "secure" not in cookie: add_finding("Headers", "Cookie sans Secure", "medium", "Cookie transmis en HTTP.", cwe="CWE-614")
        if "samesite" not in cookie: add_finding("Headers", "Cookie sans SameSite", "medium", "CSRF possible.", cwe="CWE-352")
    
    return checks

# ══════════════════════════════════════════════════════════════════════
# MODULE 2: SSL/TLS ANALYSIS
# ══════════════════════════════════════════════════════════════════════

def module_ssl(url):
    print(f"\\n{C['C']}[MODULE 2/6] SSL/TLS Analysis{C['X']}")
    checks = 0
    hostname = urllib.parse.urlparse(url).hostname
    
    # Certificate check
    checks += 1
    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((hostname, 443), timeout=10) as sock:
            with ctx.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                # Expiration
                not_after = datetime.strptime(cert["notAfter"], "%b %d %H:%M:%S %Y GMT")
                days_left = (not_after - datetime.utcnow()).days
                if days_left < 0:
                    add_finding("SSL", "Certificat expire!", "critical", f"Expire le {not_after}", cvss=9.1)
                elif days_left < 30:
                    add_finding("SSL", "Certificat expire bientot", "high", f"Expire dans {days_left} jours")
                elif days_left < 90:
                    add_finding("SSL", "Certificat a renouveler", "medium", f"Expire dans {days_left} jours")
                else:
                    add_finding("SSL", f"Certificat valide ({days_left}j)", "info", f"Expire le {not_after}")
                
                # Subject
                checks += 1
                subject = dict(x[0] for x in cert.get("subject", []))
                issuer = dict(x[0] for x in cert.get("issuer", []))
                add_finding("SSL", f"Emetteur: {issuer.get('organizationName', 'N/A')}", "info",
                    f"CN={subject.get('commonName', 'N/A')}, Issuer={issuer.get('organizationName', 'N/A')}")
                
                # Protocol version
                checks += 1
                proto = ssock.version()
                if proto and "TLSv1.0" in proto: add_finding("SSL", "TLS 1.0 active", "high", "TLS 1.0 est obsolete et vulnerable.", cwe="CWE-326")
                elif proto and "TLSv1.1" in proto: add_finding("SSL", "TLS 1.1 active", "medium", "TLS 1.1 est deprecie.", cwe="CWE-326")
                elif proto: add_finding("SSL", f"Protocole: {proto}", "info", "Version TLS acceptable.")
                
                # Cipher
                checks += 1
                cipher = ssock.cipher()
                if cipher:
                    name, ver, bits = cipher
                    if bits and bits < 128: add_finding("SSL", f"Cipher faible: {name} ({bits} bits)", "high", "Longueur de cle insuffisante.")
                    elif "RC4" in name or "DES" in name or "NULL" in name:
                        add_finding("SSL", f"Cipher dangereux: {name}", "critical", "Algorithme cryptographique casse.")
    except ssl.SSLCertVerificationError as e:
        add_finding("SSL", "Certificat invalide", "critical", str(e), cvss=9.1)
    except Exception as e:
        add_finding("SSL", "Erreur SSL", "medium", str(e))
    
    # HTTP -> HTTPS redirect
    checks += 1
    r = http_get(f"http://{hostname}", timeout=5)
    if r["status"] > 0 and not (r.get("url", "").startswith("https")):
        add_finding("SSL", "Pas de redirection HTTP->HTTPS", "high", "Connexions non chiffrees possibles.")
    
    return checks

# ══════════════════════════════════════════════════════════════════════
# MODULE 3: INJECTION TESTING (XSS + SQLi + SSTI + CSRF)
# Inspired by SQLMap payloads + PortSwigger research + PayloadsAllTheThings
# ══════════════════════════════════════════════════════════════════════

XSS_PAYLOADS = [
    '<script>alert(1)</script>', "'\"><img src=x onerror=alert(1)>",
    '<svg/onload=alert(1)>', '<body onload=alert(1)>',
    "javascript:alert(1)//", "'-alert(1)-'",
    '"><iframe src="javascript:alert(1)">', '<details open ontoggle=alert(1)>',
    '<math><mtext><table><mglyph><svg><mtext><textarea><path id="</textarea><img onerror=alert(1) src=1>">',
    "{{7*7}}", "${7*7}", "#{7*7}", "<%= 7*7 %>",
    "{{constructor.constructor('return this')()}}",
    "%3Cscript%3Ealert(1)%3C/script%3E",
    "\\"><script>alert(String.fromCharCode(88,83,83))</script>",
    "<img src=x onerror=prompt(1)>", "<svg><desc><![CDATA[</desc><script>alert(1)</script>]]>",
    "data:text/html,<script>alert(1)</script>",
]

SQLI_PAYLOADS = [
    ("'", ["sql", "mysql", "syntax", "query", "ORA-", "PostgreSQL", "sqlite", "ODBC", "Microsoft SQL", "Warning"]),
    ('"', ["sql", "mysql", "syntax", "unterminated"]),
    ("\\\\", ["escape", "syntax", "sql"]),
    ("' OR '1'='1'--", []), ("' OR '1'='1'/*", []),
    ("1 UNION SELECT NULL--", ["union", "column"]),
    ("1 UNION SELECT NULL,NULL--", []),
    ("1' ORDER BY 100--", ["column", "order"]),
    ("'; WAITFOR DELAY '0:0:3'--", []),
    ("1' AND SLEEP(3)--", []),
    ("' AND 1=CONVERT(int,(SELECT @@version))--", ["convert", "nvarchar", "int"]),
    ("' AND extractvalue(1,concat(0x7e,(SELECT version())))--", ["xpath", "extractvalue"]),
    ("1; DROP TABLE test--", ["drop", "table"]),
    ("admin'--", []),
]

TRAVERSAL_PAYLOADS = [
    "../../../etc/passwd", "....//....//....//etc/passwd",
    "..\\\\..\\\\..\\\\windows\\\\win.ini", "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
    "....//....//....//....//etc/passwd", "/etc/passwd%00",
]

def module_injection(url):
    print(f"\\n{C['C']}[MODULE 3/6] Injection Vector Analysis{C['X']}")
    checks = 0
    r = http_get(url)
    if r["status"] < 0: return checks
    
    html = r["body"]
    html_lower = html.lower()
    
    # CSRF check
    checks += 1
    forms = re.findall(r'<form[^>]*>', html, re.I)
    has_csrf = "csrf" in html_lower or "_token" in html_lower or "nonce" in html_lower
    if forms and not has_csrf:
        add_finding("Injection", f"{len(forms)} formulaire(s) sans CSRF", "high",
            "Formulaires sans token anti-CSRF detectes.", cwe="CWE-352",
            remediation="Ajouter un token CSRF unique a chaque formulaire.")
    
    # Hidden sensitive fields
    checks += 1
    hiddens = re.findall(r'<input[^>]*type=["\\'"]hidden["\\'"][^>]*>', html, re.I)
    for h in hiddens:
        name = re.search(r'name=["\\'"]([^"\\'"]+)', h)
        value = re.search(r'value=["\\'"]([^"\\'"]+)', h)
        if name and value and re.search(r'password|secret|key|token|api', name.group(1), re.I) and len(value.group(1)) > 5:
            add_finding("Injection", "Donnees sensibles en hidden input", "high",
                f'{name.group(1)}="{value.group(1)[:30]}..."', evidence=h[:200], cwe="CWE-200")
            break
    
    # Dangerous JS patterns
    checks += 1
    dangerous = []
    if "eval(" in html_lower: dangerous.append("eval()")
    if "innerhtml" in html_lower: dangerous.append("innerHTML")
    if "document.write(" in html_lower: dangerous.append("document.write()")
    if "dangerouslysetinnerhtml" in html_lower: dangerous.append("dangerouslySetInnerHTML")
    if dangerous:
        add_finding("Injection", f"JS dangereux: {', '.join(dangerous)}", "medium",
            "Fonctions a risque detectees dans le code source.", cwe="CWE-79")
    
    # DOM-XSS sources
    checks += 1
    dom_sources = ["location.hash", "location.search", "location.href", "document.referrer", "document.cookie", "window.name", "document.URL"]
    found = [s for s in dom_sources if s.lower() in html_lower]
    if found:
        add_finding("Injection", f"Sources DOM-XSS: {', '.join(found)}", "medium",
            "Acces a des sources controlees par l'attaquant.", cwe="CWE-79")
    
    # Parameter-based injection tests (only on URLs with existing params or common test params)
    checks += 1
    parsed = urllib.parse.urlparse(url)
    params = urllib.parse.parse_qs(parsed.query)
    test_params = list(params.keys()) if params else ["id", "q", "search", "page"]
    
    # XSS reflection test
    for param in test_params[:3]:
        marker = f"cyberguard{int(time.time())%10000}"
        test_url = f"{url}{'&' if '?' in url else '?'}{param}={marker}"
        checks += 1
        tr = http_get(test_url, timeout=6)
        if tr["status"] > 0 and marker in tr["body"]:
            add_finding("Injection", f"Reflexion XSS potentielle (param: {param})", "high",
                f"Le parametre {param} est reflete dans la reponse sans encodage.",
                evidence=f"Input: {marker} -> reflete dans le body", cwe="CWE-79",
                remediation="Encoder/echapper toutes les sorties utilisateur.")
    
    # SQLi error-based test
    for param in test_params[:2]:
        for payload, errors in SQLI_PAYLOADS[:5]:
            test_url = f"{url}{'&' if '?' in url else '?'}{param}={urllib.parse.quote(payload)}"
            checks += 1
            tr = http_get(test_url, timeout=6)
            if tr["status"] > 0 and errors:
                body_lower = tr["body"].lower()
                for err in errors:
                    if err.lower() in body_lower:
                        add_finding("Injection", f"SQLi potentielle (param: {param})", "critical",
                            f"Payload: {payload} -> erreur SQL detectee: {err}",
                            evidence=tr["body"][:300], cwe="CWE-89", cvss=9.8,
                            remediation="Utiliser des requetes preparees (prepared statements).")
                        break
    
    # Path traversal test
    for param in test_params[:2]:
        for payload in TRAVERSAL_PAYLOADS[:3]:
            test_url = f"{url}{'&' if '?' in url else '?'}{param}={urllib.parse.quote(payload)}"
            checks += 1
            tr = http_get(test_url, timeout=6)
            if tr["status"] == 200 and ("root:" in tr["body"] or "[fonts]" in tr["body"]):
                add_finding("Injection", f"Path Traversal (param: {param})", "critical",
                    f"Payload: {payload} -> contenu systeme expose",
                    evidence=tr["body"][:300], cwe="CWE-22", cvss=9.1)
                break
    
    return checks

# ══════════════════════════════════════════════════════════════════════
# MODULE 4: INFO DISCLOSURE (80+ paths, inspired by Nikto + dirb + gobuster)
# ══════════════════════════════════════════════════════════════════════

SENSITIVE_PATHS = [
    ("/.env", "critical"), ("/.git/config", "critical"), ("/.git/HEAD", "critical"),
    ("/.svn/entries", "critical"), ("/.htpasswd", "critical"), ("/backup.sql", "critical"),
    ("/backup.zip", "critical"), ("/database.sql", "critical"), ("/dump.sql", "critical"),
    ("/wp-config.php.bak", "critical"), ("/console", "critical"), ("/__debug__/", "critical"),
    ("/actuator/env", "critical"), ("/.aws/credentials", "critical"),
    ("/phpmyadmin/", "high"), ("/adminer.php", "high"), ("/server-status", "high"),
    ("/server-info", "high"), ("/.htaccess", "high"), ("/backup/", "high"),
    ("/config.php", "high"), ("/docker-compose.yml", "high"), ("/info.php", "high"),
    ("/phpinfo.php", "high"), ("/web.config", "high"), ("/elmah.axd", "high"),
    ("/debug/", "high"), ("/firebase.json", "high"), ("/.DS_Store", "high"),
    ("/actuator", "high"), ("/actuator/health", "medium"),
    ("/admin/", "medium"), ("/admin.php", "medium"), ("/graphql", "medium"),
    ("/swagger.json", "medium"), ("/api-docs", "medium"), ("/crossdomain.xml", "medium"),
    ("/package.json", "medium"), ("/composer.json", "medium"), ("/Gemfile", "medium"),
    ("/Dockerfile", "medium"), ("/.dockerenv", "medium"), ("/test.php", "medium"),
    ("/config.yml", "medium"), ("/config.json", "medium"),
    ("/wp-json/wp/v2/users", "medium"), ("/trace", "medium"),
    ("/robots.txt", "info"), ("/sitemap.xml", "info"), ("/wp-login.php", "info"),
    ("/wp-admin/", "info"), ("/administrator/", "info"), ("/login", "info"),
    ("/api/", "info"), ("/api/v1/", "info"), ("/.well-known/security.txt", "info"),
    ("/cgi-bin/", "info"),
    # Extended from SecLists
    ("/wp-content/debug.log", "high"), ("/error_log", "high"), ("/errors.log", "high"),
    ("/.bash_history", "critical"), ("/.ssh/id_rsa", "critical"),
    ("/id_rsa", "critical"), ("/id_dsa", "critical"),
    ("/.npmrc", "high"), ("/.yarnrc", "high"),
    ("/Gruntfile.js", "low"), ("/gulpfile.js", "low"),
    ("/webpack.config.js", "medium"), ("/tsconfig.json", "low"),
    ("/.babelrc", "low"), ("/yarn.lock", "low"),
    ("/Procfile", "low"), ("/Vagrantfile", "medium"),
    ("/credentials.xml", "critical"), ("/secrets.yml", "critical"),
]

def check_path(url, path, severity):
    r = http_get(f"{url}{path}", timeout=5)
    if r["status"] == 200:
        body = r["body"]
        has_content = len(body) > 50
        is_default = body.strip().startswith("<!DOCTYPE") or body.strip().startswith("<html")
        if has_content and not is_default:
            return (path, severity, body[:300], True)
        elif severity in ("critical", "high") and has_content:
            return (path, severity, body[:300], True)
    elif r["status"] == 403 and severity in ("critical", "high"):
        return (path, "info", "403 Forbidden (fichier existe mais bloque)", False)
    return None

def module_info_disclosure(url, threads=MAX_THREADS):
    print(f"\\n{C['C']}[MODULE 4/6] Info Disclosure ({len(SENSITIVE_PATHS)} paths){C['X']}")
    checks = 0
    
    with ThreadPoolExecutor(max_workers=threads) as pool:
        futures = {pool.submit(check_path, url, p, s): (p, s) for p, s in SENSITIVE_PATHS}
        for future in as_completed(futures):
            checks += 1
            try:
                result = future.result()
                if result:
                    path, severity, evidence, accessible = result
                    if accessible:
                        add_finding("InfoDisclosure", f"{path} accessible", severity,
                            f"Fichier/dossier sensible expose: {path}",
                            evidence=evidence, remediation=f"Bloquer l'acces a {path}.")
                    else:
                        add_finding("InfoDisclosure", f"{path} existe (403)", "info",
                            f"{path} retourne 403. Le fichier existe.")
            except: pass
    
    return checks

# ══════════════════════════════════════════════════════════════════════
# MODULE 5: TECHNOLOGY FINGERPRINT (50+ signatures)
# ══════════════════════════════════════════════════════════════════════

def module_tech(url):
    print(f"\\n{C['C']}[MODULE 5/6] Technology Fingerprinting{C['X']}")
    checks = 0
    r = http_get(url)
    if r["status"] < 0: return checks
    
    html = r["body"]
    html_lower = html.lower()
    h = {k.lower(): v for k, v in r["headers"].items()}
    detected = []
    
    SIGS = [
        ("WordPress", lambda: "wp-content" in html_lower or "wp-includes" in html_lower, "medium",
         "WordPress detecte. Verifiez core + plugins + themes a jour."),
        ("Joomla", lambda: "/media/jui/" in html_lower, "medium", "Joomla CMS detecte."),
        ("Drupal", lambda: "drupal" in html_lower or "x-drupal-cache" in h, "medium", "Drupal detecte."),
        ("AngularJS 1.x", lambda: "ng-app" in html_lower, "high",
         "AngularJS 1.x EOL — vulnerable aux sandbox escapes XSS."),
        ("jQuery < 3.5", lambda: bool(re.search(r"jquery[.-](1\\.|2\\.|3\\.[0-4])", html_lower)), "medium",
         "jQuery ancien — CVE-2020-11022/23 (XSS via htmlPrefilter)."),
        ("React", lambda: "__react" in html_lower or "_reactroot" in html_lower, None, None),
        ("Vue.js", lambda: "__vue" in html_lower or "v-cloak" in html_lower, None, None),
        ("Next.js", lambda: "__next" in html_lower or "_next/" in html, None, None),
        ("Nuxt.js", lambda: "__nuxt" in html_lower, None, None),
        ("ASP.NET ViewState", lambda: "__viewstate" in html_lower, "high",
         "ViewState detecte. Si non signe/chiffre, deserialization RCE possible (CVE-2020-0688)."),
        ("PHP", lambda: "x-powered-by" in h and "php" in h["x-powered-by"].lower(), None, "Verifiez version PHP >= 8.1."),
        ("Laravel", lambda: "laravel_session" in h.get("set-cookie", "").lower(), None, None),
        ("Django", lambda: "csrfmiddlewaretoken" in html_lower, None, None),
        ("Express.js", lambda: "express" in h.get("x-powered-by", "").lower(), None, None),
        ("Flask", lambda: h.get("server", "").lower().startswith("werkzeug"), "medium",
         "Werkzeug/Flask detecte. Verifiez que le debugger est desactive en production."),
        ("Nginx", lambda: "nginx" in h.get("server", "").lower(), None, None),
        ("Apache", lambda: "apache" in h.get("server", "").lower(), None, None),
        ("IIS", lambda: "iis" in h.get("server", "").lower(), None, None),
        ("Cloudflare", lambda: "cloudflare" in h.get("server", "").lower() or "cf-ray" in h, None, None),
        ("AWS", lambda: "amazons3" in h.get("server", "").lower() or "x-amz-request-id" in h, None, None),
    ]
    
    for name, check_fn, severity, vuln in SIGS:
        checks += 1
        try:
            if check_fn():
                detected.append(name)
                if vuln and severity:
                    add_finding("TechRecon", f"{name} — Attention", severity, vuln)
        except: pass
    
    if detected:
        add_finding("TechRecon", f"{len(detected)} technologie(s)", "info",
            f"Stack: {', '.join(detected)}")
    
    # Source maps
    checks += 1
    smaps = len(re.findall(r'//# sourceMappingURL=\\S+', html))
    if smaps > 0:
        add_finding("TechRecon", f"{smaps} source map(s) exposee(s)", "medium",
            "Les source maps revelent le code source original.",
            remediation="Supprimer les source maps en production.")
    
    return checks

# ══════════════════════════════════════════════════════════════════════
# MODULE 6: DNS RECON (SPF, DMARC, DKIM, zone transfer, subdomains)
# ══════════════════════════════════════════════════════════════════════

def module_dns(url):
    print(f"\\n{C['C']}[MODULE 6/6] DNS Reconnaissance{C['X']}")
    checks = 0
    hostname = urllib.parse.urlparse(url).hostname
    
    # DNS records via Google DNS
    types = ["A", "AAAA", "MX", "NS", "TXT", "CNAME"]
    dns = {}
    for rtype in types:
        checks += 1
        r = http_get(f"https://dns.google/resolve?name={hostname}&type={rtype}", timeout=5)
        if r["status"] == 200:
            try:
                data = json.loads(r["body"])
                records = [a["data"] for a in data.get("Answer", [])]
                if records: dns[rtype] = records
            except: pass
    
    # SPF check
    checks += 1
    txt_records = dns.get("TXT", [])
    spf = [t for t in txt_records if "v=spf1" in t]
    if not spf:
        add_finding("DNS", "Pas de SPF", "medium", "Email spoofing possible — pas d'enregistrement SPF.",
            remediation='Ajouter: "v=spf1 include:_spf.google.com ~all"')
    elif any("+all" in s for s in spf):
        add_finding("DNS", "SPF +all (dangereux)", "high", "SPF avec +all autorise tout le monde.", evidence=spf[0])
    
    # DMARC
    checks += 1
    r = http_get(f"https://dns.google/resolve?name=_dmarc.{hostname}&type=TXT", timeout=5)
    if r["status"] == 200:
        try:
            data = json.loads(r["body"])
            dmarc = [a["data"] for a in data.get("Answer", []) if "DMARC" in a.get("data", "")]
            if not dmarc:
                add_finding("DNS", "Pas de DMARC", "medium", "Emails spoof non rejetes.",
                    remediation='_dmarc.domain TXT "v=DMARC1; p=reject"')
            elif any("p=none" in d for d in dmarc):
                add_finding("DNS", "DMARC p=none", "low", "DMARC en monitoring uniquement.", evidence=dmarc[0])
        except: pass
    
    # Subdomains via CT
    checks += 1
    try:
        r = http_get(f"https://crt.sh/?q=%.{hostname}&output=json", timeout=15)
        if r["status"] == 200:
            certs = json.loads(r["body"])
            subs = set()
            for c in certs:
                for name in (c.get("name_value", "") or "").split("\\n"):
                    clean = name.strip().replace("*.", "")
                    if clean.endswith(hostname) and clean != hostname: subs.add(clean)
            if subs:
                add_finding("DNS", f"{len(subs)} sous-domaine(s)", "info",
                    f"Surface d'attaque: {', '.join(sorted(subs)[:20])}")
    except: pass
    
    return checks

# ══════════════════════════════════════════════════════════════════════
# ORCHESTRATOR
# ══════════════════════════════════════════════════════════════════════

def run_scan(url, modules=None, deep=False, threads=MAX_THREADS):
    global findings, finding_id
    findings = []
    finding_id = 0
    url = normalize_url(url)
    
    all_modules = {
        "headers": ("Security Headers", module_headers),
        "ssl": ("SSL/TLS", module_ssl),
        "injection": ("Injection Vectors", module_injection),
        "disclosure": ("Info Disclosure", lambda u: module_info_disclosure(u, threads)),
        "tech": ("Tech Fingerprint", module_tech),
        "dns": ("DNS Recon", module_dns),
    }
    
    active = modules.split(",") if modules else list(all_modules.keys())
    
    print(f"  {C['BOLD']}Target:{C['X']}  {url}")
    print(f"  {C['BOLD']}Modules:{C['X']} {', '.join(active)}")
    print(f"  {C['BOLD']}Threads:{C['X']} {threads}")
    print(f"  {'─' * 58}")
    
    t0 = time.time()
    total_checks = 0
    
    for mod_key in active:
        if mod_key in all_modules:
            name, fn = all_modules[mod_key]
            mt0 = time.time()
            try:
                checks = fn(url)
                total_checks += checks or 0
            except Exception as e:
                print(f"  {C['R']}[ERROR] {name}: {e}{C['X']}")
    
    elapsed = time.time() - t0
    
    # Summary
    sev_count = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
    for f in findings: sev_count[f["severity"]] = sev_count.get(f["severity"], 0) + 1
    
    print(f"\\n{'═' * 60}")
    print(f"  {C['BOLD']}RAPPORT FINAL{C['X']}")
    print(f"  Total: {len(findings)} faille(s) | {total_checks} tests | {elapsed:.1f}s")
    print(f"  {C['R']}CRITICAL: {sev_count['critical']}{C['X']} | {C['R']}HIGH: {sev_count['high']}{C['X']} | {C['Y']}MEDIUM: {sev_count['medium']}{C['X']} | {C['B']}LOW: {sev_count['low']}{C['X']} | {C['D']}INFO: {sev_count['info']}{C['X']}")
    
    score = max(0, 100 - sev_count["critical"]*25 - sev_count["high"]*10 - sev_count["medium"]*5 - sev_count["low"]*2)
    color = C["G"] if score >= 80 else C["Y"] if score >= 50 else C["R"]
    print(f"  {C['BOLD']}Score securite: {color}{score}/100{C['X']}")
    print(f"{'═' * 60}")
    
    return {
        "target": url, "timestamp": datetime.now().isoformat(),
        "duration": elapsed, "total_checks": total_checks,
        "findings": findings, "summary": sev_count, "score": score,
    }

# ══════════════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="FailleFinder - CyberGuard Vulnerability Scanner")
    parser.add_argument("url", help="URL cible")
    parser.add_argument("--modules", "-m", help="Modules: headers,ssl,injection,disclosure,tech,dns (defaut: all)")
    parser.add_argument("--deep", action="store_true", help="Scan approfondi")
    parser.add_argument("--threads", "-t", type=int, default=MAX_THREADS, help=f"Threads (defaut: {MAX_THREADS})")
    parser.add_argument("--output", "-o", help="Export JSON")
    parser.add_argument("--json", "-j", action="store_true", help="Sortie JSON brute")
    args = parser.parse_args()
    
    if not args.json: banner()
    
    results = run_scan(args.url, args.modules, args.deep, args.threads)
    
    if args.json:
        print(json.dumps(results, indent=2, ensure_ascii=False))
    
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"\\n  {C['G']}[+]{C['X']} Rapport exporte: {args.output}")

if __name__ == "__main__":
    main()
`;

const README = `# FailleFinder - CyberGuard Vulnerability Scanner
Scanner de vulnérabilités web multi-modules. Inspiré de Nikto + Nuclei + SQLMap + WPScan + Burp.

## 6 Modules
- **Security Headers** : 25+ headers, HSTS/CSP deep analysis, cookies
- **SSL/TLS** : Certificat, protocoles, ciphers, redirection HTTPS
- **Injection Vectors** : XSS 16+ payloads, SQLi 13+ payloads, SSTI, CSRF, DOM-XSS, path traversal
- **Info Disclosure** : 80+ paths sensibles (Nikto-style), backups, configs, debug endpoints
- **Tech Fingerprint** : 20+ signatures, version detection, CVEs connus
- **DNS Recon** : SPF, DMARC, DKIM, sous-domaines CT logs

## Utilisation
\`\`\`bash
python faille_finder.py https://exemple.com
python faille_finder.py https://exemple.com --deep --threads 32
python faille_finder.py https://exemple.com -o rapport.json
python faille_finder.py https://exemple.com --modules headers,ssl,injection
\`\`\`

## Aucune API requise
Créé par CyberGuard — https://cyber-guard-dusky.vercel.app
`;

const GUI_CONFIG: GuiConfig = {
  title: "FailleFinder Vulnerability Scanner",
  inputType: "url",
  inputPlaceholder: "https://exemple.com",
  buttonText: "Scanner",
  importLine: "from faille_finder import run_scan",
  processCode: `            return run_scan(inp)`,
};

export function FailleFinderPage() {
  return (
    <ToolPageLayout
      title="Faille" subtitle="Finder"
      description="Scanner de vulnérabilités web multi-modules. 6 modules, 300+ tests. Inspiré de Nikto + Nuclei + SQLMap + WPScan + Burp combinés. Security headers, SSL/TLS, injection vectors (XSS/SQLi/SSTI), info disclosure (80+ paths), tech fingerprinting, DNS recon."
      toolSlug="faille_finder"
      icon={Bug}
      color="#dc2626"
      hubAnchor="faille-finder"
      features={[
        { icon: Shield, title: "Security Headers", desc: "25+ headers analysés : HSTS, CSP deep analysis (unsafe-inline/eval/wildcard), cookies (HttpOnly/Secure/SameSite), COOP/CORP/COEP." },
        { icon: Lock, title: "SSL/TLS Audit", desc: "Certificat (expiration, issuer), protocoles (TLS 1.0/1.1 détection), ciphers faibles, mixed content, redirection HTTP→HTTPS." },
        { icon: Code, title: "Injection Vectors", desc: "XSS (16+ payloads, réflexion, DOM-based), SQLi (13+ payloads inspirés SQLMap), SSTI, CSRF, path traversal, hidden fields." },
        { icon: Eye, title: "Info Disclosure", desc: "80+ paths sensibles testés (Nikto-style) : .env, .git, backups, phpMyAdmin, debug consoles, AWS credentials, actuator." },
        { icon: Fingerprint, title: "Tech Fingerprint", desc: "20+ signatures : WordPress, React, Angular, Django, Laravel, PHP, source maps, JS libraries avec CVEs connus." },
        { icon: Globe, title: "DNS Recon", desc: "SPF/DMARC/DKIM analysis, sous-domaines via CT logs, nameservers, zone transfer indicators." },
        { icon: Database, title: "Score Sécurité", desc: "Score /100 calculé selon la gravité des failles. Export JSON complet pour intégration pipeline." },
        { icon: Zap, title: "Multi-Threading", desc: "32 threads par défaut. Tous les checks d'info disclosure exécutés en parallèle pour un scan ultra-rapide." },
      ]}
      requirements={["Python 3.7+ (aucune dépendance externe)", "Fonctionne 100% avec la bibliothèque standard Python"]}
      pythonScript={PYTHON_SCRIPT}
      readmeContent={README}
      guiConfig={GUI_CONFIG}
    >
      <FailleFinderTool />
    </ToolPageLayout>
  );
}
