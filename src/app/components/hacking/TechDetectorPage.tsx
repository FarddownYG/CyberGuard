import { useState } from "react";
import { Cpu, Search, Loader2, AlertTriangle, Shield, Globe, Code, Server, Eye, Zap } from "lucide-react";
import { ToolPageLayout } from "./ToolPageLayout";
import type { GuiConfig } from "./zip-generator";

interface TechMatch { name: string; category: string; confidence: string; }

const HEADER_SIGNATURES: { header: string; pattern: RegExp; name: string; category: string }[] = [
  { header: "server", pattern: /nginx/i, name: "Nginx", category: "Serveur Web" },
  { header: "server", pattern: /apache/i, name: "Apache", category: "Serveur Web" },
  { header: "server", pattern: /cloudflare/i, name: "Cloudflare", category: "CDN" },
  { header: "server", pattern: /vercel/i, name: "Vercel", category: "Hebergement" },
  { header: "server", pattern: /netlify/i, name: "Netlify", category: "Hebergement" },
  { header: "server", pattern: /microsoft-iis/i, name: "IIS", category: "Serveur Web" },
  { header: "x-powered-by", pattern: /express/i, name: "Express.js", category: "Framework" },
  { header: "x-powered-by", pattern: /php/i, name: "PHP", category: "Langage" },
  { header: "x-powered-by", pattern: /asp\.net/i, name: "ASP.NET", category: "Framework" },
  { header: "x-powered-by", pattern: /next\.js/i, name: "Next.js", category: "Framework" },
  { header: "cf-ray", pattern: /.+/, name: "Cloudflare", category: "CDN" },
  { header: "x-vercel-id", pattern: /.+/, name: "Vercel", category: "Hebergement" },
  { header: "x-amz-cf-id", pattern: /.+/, name: "AWS CloudFront", category: "CDN" },
  { header: "x-cache", pattern: /hit from cloudfront/i, name: "AWS CloudFront", category: "CDN" },
  { header: "x-github-request-id", pattern: /.+/, name: "GitHub Pages", category: "Hebergement" },
];

const BODY_SIGNATURES: { pattern: RegExp; name: string; category: string }[] = [
  { pattern: /wp-content|wordpress/i, name: "WordPress", category: "CMS" },
  { pattern: /react/i, name: "React", category: "Framework JS" },
  { pattern: /vue\.js|vuejs|__vue/i, name: "Vue.js", category: "Framework JS" },
  { pattern: /angular|ng-version/i, name: "Angular", category: "Framework JS" },
  { pattern: /next\.js|__next|_next\/static/i, name: "Next.js", category: "Framework" },
  { pattern: /nuxt|__nuxt/i, name: "Nuxt.js", category: "Framework" },
  { pattern: /svelte|__svelte/i, name: "Svelte", category: "Framework JS" },
  { pattern: /gatsby/i, name: "Gatsby", category: "Framework" },
  { pattern: /remix|__remix/i, name: "Remix", category: "Framework" },
  { pattern: /astro/i, name: "Astro", category: "Framework" },
  { pattern: /vite|@vite/i, name: "Vite", category: "Build Tool" },
  { pattern: /webpack|webpackJsonp/i, name: "Webpack", category: "Build Tool" },
  { pattern: /parcel/i, name: "Parcel", category: "Build Tool" },
  { pattern: /jquery|jQuery/i, name: "jQuery", category: "Librairie" },
  { pattern: /bootstrap/i, name: "Bootstrap", category: "CSS" },
  { pattern: /tailwindcss|tailwind/i, name: "Tailwind CSS", category: "CSS" },
  { pattern: /material-ui|mui/i, name: "Material UI", category: "CSS" },
  { pattern: /chakra-ui/i, name: "Chakra UI", category: "CSS" },
  { pattern: /google-analytics|gtag|googletagmanager/i, name: "Google Analytics", category: "Analytics" },
  { pattern: /hotjar/i, name: "Hotjar", category: "Analytics" },
  { pattern: /segment\.com|analytics\.js/i, name: "Segment", category: "Analytics" },
  { pattern: /mixpanel/i, name: "Mixpanel", category: "Analytics" },
  { pattern: /plausible/i, name: "Plausible", category: "Analytics" },
  { pattern: /matomo|piwik/i, name: "Matomo", category: "Analytics" },
  { pattern: /shopify/i, name: "Shopify", category: "E-commerce" },
  { pattern: /woocommerce/i, name: "WooCommerce", category: "E-commerce" },
  { pattern: /magento/i, name: "Magento", category: "E-commerce" },
  { pattern: /drupal/i, name: "Drupal", category: "CMS" },
  { pattern: /joomla/i, name: "Joomla", category: "CMS" },
  { pattern: /ghost/i, name: "Ghost", category: "CMS" },
  { pattern: /strapi/i, name: "Strapi", category: "CMS" },
  { pattern: /laravel/i, name: "Laravel", category: "Framework" },
  { pattern: /django/i, name: "Django", category: "Framework" },
  { pattern: /ruby on rails|rails/i, name: "Ruby on Rails", category: "Framework" },
  { pattern: /flask/i, name: "Flask", category: "Framework" },
  { pattern: /spring/i, name: "Spring", category: "Framework" },
  { pattern: /recaptcha/i, name: "reCAPTCHA", category: "Securite" },
  { pattern: /hcaptcha/i, name: "hCaptcha", category: "Securite" },
  { pattern: /turnstile/i, name: "Cloudflare Turnstile", category: "Securite" },
  { pattern: /cloudflare/i, name: "Cloudflare", category: "CDN" },
  { pattern: /fastly/i, name: "Fastly", category: "CDN" },
  { pattern: /akamai/i, name: "Akamai", category: "CDN" },
  { pattern: /font-awesome|fontawesome/i, name: "Font Awesome", category: "Icones" },
  { pattern: /lucide/i, name: "Lucide Icons", category: "Icones" },
  { pattern: /heroicons/i, name: "Heroicons", category: "Icones" },
  { pattern: /stripe/i, name: "Stripe", category: "Paiement" },
  { pattern: /paypal/i, name: "PayPal", category: "Paiement" },
  { pattern: /sentry\.io|sentry/i, name: "Sentry", category: "Monitoring" },
  { pattern: /datadog/i, name: "Datadog", category: "Monitoring" },
  { pattern: /intercom/i, name: "Intercom", category: "Chat" },
  { pattern: /crisp\.chat/i, name: "Crisp", category: "Chat" },
  { pattern: /zendesk/i, name: "Zendesk", category: "Support" },
  { pattern: /socket\.io/i, name: "Socket.io", category: "Realtime" },
  { pattern: /firebase/i, name: "Firebase", category: "Backend" },
  { pattern: /supabase/i, name: "Supabase", category: "Backend" },
  { pattern: /graphql/i, name: "GraphQL", category: "API" },
  { pattern: /swagger|openapi/i, name: "Swagger/OpenAPI", category: "API" },
];

function TechDetectorTool() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [techs, setTechs] = useState<TechMatch[] | null>(null);
  const [error, setError] = useState("");

  const detect = async () => {
    if (!url) return;
    setLoading(true);
    setError("");
    setTechs(null);

    try {
      let target = url.trim();
      if (!target.startsWith("http")) target = "https://" + target;
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`;
      const res = await fetch(proxyUrl);
      const body = await res.text();

      const found = new Map<string, TechMatch>();

      // Check headers
      for (const sig of HEADER_SIGNATURES) {
        const val = res.headers.get(sig.header);
        if (val && sig.pattern.test(val)) {
          found.set(sig.name, { name: sig.name, category: sig.category, confidence: "Haute" });
        }
      }

      // Check body
      for (const sig of BODY_SIGNATURES) {
        if (sig.pattern.test(body)) {
          if (!found.has(sig.name)) {
            found.set(sig.name, { name: sig.name, category: sig.category, confidence: "Moyenne" });
          }
        }
      }

      setTechs(Array.from(found.values()).sort((a, b) => a.category.localeCompare(b.category)));
    } catch {
      setError("Impossible d'analyser ce site. Utilisez la version Python pour un scan complet.");
    } finally {
      setLoading(false);
    }
  };

  const categories = techs ? [...new Set(techs.map(t => t.category))] : [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && detect()}
          placeholder="https://exemple.com" className="flex-1 px-4 py-3 bg-[#0a0a0f] border border-[#1e293b] rounded-lg text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#10b981]/40"
          style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.9rem" }} />
        <button onClick={detect} disabled={loading || !url} className="px-6 py-3 rounded-lg transition-all flex items-center gap-2 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "#0a0a0f", fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem" }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Detecter
        </button>
      </div>

      {error && (
        <div className="rounded-lg p-4 mb-4 flex items-start gap-3" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <AlertTriangle className="w-4 h-4 text-[#ef4444] flex-shrink-0 mt-0.5" />
          <p className="text-[#ef4444]" style={{ fontSize: "0.82rem" }}>{error}</p>
        </div>
      )}

      {techs && (
        <div className="space-y-4">
          <div className="rounded-lg p-4" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}>
            <span className="text-[#10b981]" style={{ fontSize: "0.9rem" }}><strong>{techs.length}</strong> technologie{techs.length > 1 ? "s" : ""} detectee{techs.length > 1 ? "s" : ""}</span>
          </div>

          {categories.map(cat => (
            <div key={cat}>
              <p className="text-[#94a3b8] mb-2" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.78rem" }}>{cat}</p>
              <div className="space-y-1.5">
                {techs.filter(t => t.category === cat).map(t => (
                  <div key={t.name} className="rounded-lg p-3 flex items-center justify-between" style={{ background: "rgba(17,24,39,0.5)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <span className="text-[#e2e8f0]" style={{ fontSize: "0.82rem" }}>{t.name}</span>
                    <span className="text-[#64748b]" style={{ fontSize: "0.7rem" }}>Confiance: {t.confidence}</span>
                  </div>
                ))}
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
Technology Detector - CyberGuard
Detecte les technologies utilisees par un site web (serveur, framework, CMS, etc.).
Similar a Wappalyzer mais en ligne de commande.

Usage:
    python tech_detector.py https://exemple.com
    python tech_detector.py -f urls.txt -o rapport.json
"""

import argparse, json, re, sys, urllib.request, urllib.error, ssl

HEADER_SIGS = [
    ("server", r"nginx", "Nginx", "Serveur Web"),
    ("server", r"apache", "Apache", "Serveur Web"),
    ("server", r"cloudflare", "Cloudflare", "CDN"),
    ("server", r"vercel", "Vercel", "Hebergement"),
    ("server", r"netlify", "Netlify", "Hebergement"),
    ("server", r"microsoft-iis", "IIS", "Serveur Web"),
    ("x-powered-by", r"express", "Express.js", "Framework"),
    ("x-powered-by", r"php", "PHP", "Langage"),
    ("x-powered-by", r"asp\\.net", "ASP.NET", "Framework"),
    ("x-powered-by", r"next\\.js", "Next.js", "Framework"),
    ("cf-ray", r".+", "Cloudflare", "CDN"),
    ("x-vercel-id", r".+", "Vercel", "Hebergement"),
    ("x-amz-cf-id", r".+", "AWS CloudFront", "CDN"),
]

BODY_SIGS = [
    (r"wp-content|wordpress", "WordPress", "CMS"),
    (r"__next|next\\.js", "Next.js", "Framework"),
    (r"react", "React", "Framework JS"),
    (r"vue\\.js|vuejs|__vue", "Vue.js", "Framework JS"),
    (r"angular|ng-version", "Angular", "Framework JS"),
    (r"jquery|jQuery", "jQuery", "Librairie"),
    (r"bootstrap", "Bootstrap", "CSS"),
    (r"tailwindcss|tailwind", "Tailwind CSS", "CSS"),
    (r"material-ui|mui", "Material UI", "CSS"),
    (r"chakra-ui", "Chakra UI", "CSS"),
    (r"google-analytics|gtag|googletagmanager", "Google Analytics", "Analytics"),
    (r"hotjar", "Hotjar", "Analytics"),
    (r"segment\.com|analytics\.js", "Segment", "Analytics"),
    (r"mixpanel", "Mixpanel", "Analytics"),
    (r"plausible", "Plausible", "Analytics"),
    (r"matomo|piwik", "Matomo", "Analytics"),
    (r"shopify", "Shopify", "E-commerce"),
    (r"woocommerce", "WooCommerce", "E-commerce"),
    (r"magento", "Magento", "E-commerce"),
    (r"drupal", "Drupal", "CMS"),
    (r"laravel", "Laravel", "Framework"),
    (r"django", "Django", "Framework"),
    (r"ruby on rails|rails", "Ruby on Rails", "Framework"),
    (r"flask", "Flask", "Framework"),
    (r"spring", "Spring", "Framework"),
    (r"recaptcha", "reCAPTCHA", "Securite"),
    (r"hcaptcha", "hCaptcha", "Securite"),
    (r"turnstile", "Cloudflare Turnstile", "Securite"),
    (r"stripe", "Stripe", "Paiement"),
    (r"paypal", "PayPal", "Paiement"),
    (r"sentry\.io|sentry", "Sentry", "Monitoring"),
    (r"datadog", "Datadog", "Monitoring"),
    (r"intercom", "Intercom", "Chat"),
    (r"crisp\.chat", "Crisp", "Chat"),
    (r"zendesk", "Zendesk", "Support"),
    (r"socket\.io", "Socket.io", "Realtime"),
    (r"firebase", "Firebase", "Backend"),
    (r"supabase", "Supabase", "Backend"),
    (r"graphql", "GraphQL", "API"),
    (r"swagger|openapi", "Swagger/OpenAPI", "API"),
    (r"font-awesome|fontawesome", "Font Awesome", "Icones"),
    (r"lucide", "Lucide Icons", "Icones"),
    (r"heroicons", "Heroicons", "Icones"),
]

def detect_tech(url):
    if not url.startswith("http"):
        url = "https://" + url
    ctx = ssl.create_default_context()
    req = urllib.request.Request(url)
    req.add_header("User-Agent", "Mozilla/5.0 CyberGuard-TechDetector/1.0")
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            headers = {k.lower(): v for k, v in resp.getheaders()}
            body = resp.read().decode("utf-8", errors="replace")[:50000]
    except Exception as e:
        return {"url": url, "error": str(e)}

    found = {}
    for header, pattern, name, cat in HEADER_SIGS:
        val = headers.get(header, "")
        if re.search(pattern, val, re.I):
            found[name] = {"name": name, "category": cat, "confidence": "Haute", "source": f"Header: {header}"}
    for pattern, name, cat in BODY_SIGS:
        if name not in found and re.search(pattern, body, re.I):
            found[name] = {"name": name, "category": cat, "confidence": "Moyenne", "source": "HTML body"}

    return {"url": url, "technologies": list(found.values()), "count": len(found)}

def main():
    parser = argparse.ArgumentParser(description="Technology Detector - CyberGuard")
    parser.add_argument("url", nargs="?", help="URL a scanner")
    parser.add_argument("-f", "--file", help="Fichier d'URLs")
    parser.add_argument("-o", "--output", help="Export JSON")
    args = parser.parse_args()

    urls = []
    if args.file:
        with open(args.file) as f:
            urls = [l.strip() for l in f if l.strip()]
    elif args.url:
        urls = [args.url]
    else:
        parser.print_help(); sys.exit(1)

    GREEN, CYAN, RESET = "\\033[92m", "\\033[96m", "\\033[0m"
    all_results = []
    for url in urls:
        result = detect_tech(url)
        all_results.append(result)
        if "error" in result:
            print(f"  \\033[91mERREUR: {result['error']}\\033[0m")
            continue
        print(f"\\n  {CYAN}{result['url']}{RESET} — {result['count']} technologies")
        for t in result["technologies"]:
            print(f"  {GREEN}[+]{RESET} {t['name']} ({t['category']}) — {t['confidence']}")

    if args.output:
        with open(args.output, "w") as f:
            json.dump(all_results, f, indent=2)

if __name__ == "__main__":
    main()
`;

const README = `# Technology Detector - CyberGuard
Detecte les technologies d'un site (serveur, CMS, framework, etc.). Style Wappalyzer CLI.
## Utilisation
\`\`\`bash
python tech_detector.py https://google.com
python tech_detector.py -f urls.txt -o rapport.json
\`\`\`
## API requise: Aucune.
`;

const GUI_CONFIG: GuiConfig = {
  title: "Technology Detector",
  inputType: "url",
  inputPlaceholder: "https://exemple.com",
  buttonText: "Detecter",
  importLine: "from tech_detector import detect_tech",
  processCode: `            return detect_tech(inp)`,
};

export function TechDetectorPage() {
  return (
    <ToolPageLayout title="Tech" subtitle="Detector" description="Detectez les technologies utilisees par un site: serveur, framework, CMS, CDN, analytics. Style Wappalyzer en CLI."
      disableOnlineTest
      toolSlug="tech_detector" icon={Cpu} color="#10b981" hubAnchor="tech-detector"
      features={[
        { icon: Cpu, title: "70+ signatures", desc: "Detecte Nginx, Apache, React, WordPress, Cloudflare, Svelte, Astro et bien plus." },
        { icon: Globe, title: "Headers + HTML", desc: "Analyse les headers HTTP et le contenu HTML pour une detection precise." },
        { icon: Server, title: "Categories", desc: "Classe par categorie: serveur, CDN, framework, CMS, analytics." },
        { icon: Eye, title: "Score de confiance", desc: "Haute (header), Moyenne (HTML) pour chaque detection." },
        { icon: Shield, title: "Zero API", desc: "Simple requete HTTP. Aucune cle requise." },
        { icon: Code, title: "Scan en masse", desc: "Analysez des dizaines de sites depuis un fichier." },
      ]}
      requirements={["Python 3.7+", "Aucune dependance", "Connexion internet", "Autorisation sur la cible"]}
      pythonScript={PYTHON_SCRIPT} readmeContent={README}
      guiConfig={GUI_CONFIG}
    >
      <TechDetectorTool />
    </ToolPageLayout>
  );
}

export { TechDetectorTool };