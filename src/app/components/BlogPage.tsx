import { useState } from "react";
import { BookOpen, Shield, AlertTriangle, Bug, Lock, Calendar, Clock, ArrowRight, Search, Eye, Globe, Key, Server, Wifi, FileSearch, Mail, Cpu, Database, Smartphone, Fingerprint, Zap, Code, Network, Layers } from "lucide-react";
import { motion } from "motion/react";

const articles = [
  {
    title: "Comprendre les attaques XSS (Cross-Site Scripting)",
    excerpt: "Le XSS est l'une des vulnerabilites les plus courantes sur le web. Decouvrez comment les hackers injectent du code malveillant.",
    category: "Attaques Web",
    date: "12 Mars 2026",
    readTime: "8 min",
    icon: Bug,
    color: "#ef4444",
    featured: true,
  },
  {
    title: "Injection SQL : le guide complet",
    excerpt: "L'injection SQL permet a un attaquant d'acceder a votre base de donnees. Apprenez a utiliser des requetes preparees.",
    category: "Securite BDD",
    date: "10 Mars 2026",
    readTime: "12 min",
    icon: AlertTriangle,
    color: "#f59e0b",
    featured: true,
  },
  {
    title: "CSRF : l'attaque invisible qui menace vos formulaires",
    excerpt: "Le Cross-Site Request Forgery exploite la confiance du serveur. Voici comment implementer des tokens CSRF.",
    category: "Attaques Web",
    date: "8 Mars 2026",
    readTime: "6 min",
    icon: Shield,
    color: "#8b5cf6",
    featured: false,
  },
  {
    title: "Securiser votre site WordPress en 2026",
    excerpt: "WordPress alimente 40% du web mais reste une cible. Plugins de securite, configuration serveur : le guide ultime.",
    category: "Guides",
    date: "5 Mars 2026",
    readTime: "15 min",
    icon: Lock,
    color: "#00d4ff",
    featured: false,
  },
  {
    title: "Les headers HTTP de securite indispensables",
    excerpt: "X-Frame-Options, CSP, HSTS... Les en-tetes HTTP qui protegent votre site contre les attaques courantes.",
    category: "Configuration",
    date: "2 Mars 2026",
    readTime: "10 min",
    icon: Shield,
    color: "#39ff14",
    featured: false,
  },
  {
    title: "Phishing : identifier et eviter les arnaques",
    excerpt: "Le phishing reste la menace numero 1. Apprenez a reconnaitre les emails frauduleux et les faux sites.",
    category: "Sensibilisation",
    date: "28 Fev 2026",
    readTime: "7 min",
    icon: AlertTriangle,
    color: "#f59e0b",
    featured: false,
  },
  {
    title: "Ransomware : comment se proteger en entreprise",
    excerpt: "Les ransomwares ont coute 20 milliards en 2025. Strategies de backup, segmentation reseau et plan de reponse.",
    category: "Entreprise",
    date: "25 Fev 2026",
    readTime: "14 min",
    icon: Lock,
    color: "#ef4444",
    featured: false,
  },
  {
    title: "Zero Trust Architecture : le futur de la securite",
    excerpt: "Ne jamais faire confiance, toujours verifier. Implementez une architecture Zero Trust dans votre organisation.",
    category: "Architecture",
    date: "22 Fev 2026",
    readTime: "11 min",
    icon: Shield,
    color: "#8b5cf6",
    featured: false,
  },
  {
    title: "API Security : les 10 erreurs les plus courantes",
    excerpt: "BOLA, injection, rate limiting manquant... Les failles API les plus exploitees et comment les corriger.",
    category: "API",
    date: "20 Fev 2026",
    readTime: "13 min",
    icon: Code,
    color: "#00d4ff",
    featured: false,
  },
  {
    title: "Authentification multi-facteurs (MFA) : guide complet",
    excerpt: "TOTP, FIDO2, biometrie... Quelle methode MFA choisir et comment l'implementer correctement.",
    category: "Authentification",
    date: "18 Fev 2026",
    readTime: "9 min",
    icon: Fingerprint,
    color: "#39ff14",
    featured: false,
  },
  {
    title: "OWASP Top 10 2026 : les nouvelles menaces",
    excerpt: "La liste actualisee des 10 vulnerabilites web les plus critiques. Ce qui a change et les nouvelles entrees.",
    category: "Standards",
    date: "15 Fev 2026",
    readTime: "16 min",
    icon: Layers,
    color: "#f59e0b",
    featured: false,
  },
  {
    title: "Securite des conteneurs Docker",
    excerpt: "Images minimales, scan de vulnerabilites, rootless containers... Securisez vos deploiements Docker.",
    category: "DevOps",
    date: "12 Fev 2026",
    readTime: "10 min",
    icon: Server,
    color: "#06b6d4",
    featured: false,
  },
  {
    title: "Ingenierie sociale : les techniques des hackers",
    excerpt: "Pretexting, baiting, tailgating... Comment les attaquants manipulent les humains pour penetrer vos systemes.",
    category: "Sensibilisation",
    date: "10 Fev 2026",
    readTime: "8 min",
    icon: Eye,
    color: "#ec4899",
    featured: false,
  },
  {
    title: "VPN : mythes et realites en 2026",
    excerpt: "Un VPN vous rend-il vraiment anonyme ? Les limites, les bons usages et comment choisir le bon service.",
    category: "Reseau",
    date: "8 Fev 2026",
    readTime: "7 min",
    icon: Network,
    color: "#8b5cf6",
    featured: false,
  },
  {
    title: "Cryptographie pour les debutants",
    excerpt: "Symetrique, asymetrique, hashage... Comprendre les bases de la cryptographie moderne sans formules complexes.",
    category: "Fondamentaux",
    date: "5 Fev 2026",
    readTime: "12 min",
    icon: Key,
    color: "#f59e0b",
    featured: false,
  },
  {
    title: "Securiser un serveur Linux en 10 etapes",
    excerpt: "SSH hardening, firewall, fail2ban, mises a jour auto... Le checklist essentiel pour tout admin sys.",
    category: "Systeme",
    date: "3 Fev 2026",
    readTime: "15 min",
    icon: Server,
    color: "#39ff14",
    featured: false,
  },
  {
    title: "DNS over HTTPS (DoH) : vie privee vs securite",
    excerpt: "Le chiffrement DNS ameliore la vie privee mais complique le filtrage. Analyse des avantages et inconvenients.",
    category: "Reseau",
    date: "1 Fev 2026",
    readTime: "9 min",
    icon: Globe,
    color: "#00d4ff",
    featured: false,
  },
  {
    title: "Bug Bounty : comment gagner de l'argent ethiquement",
    excerpt: "Plateformes, methodologie, redaction de rapports... Le guide pour debuter dans le bug bounty en 2026.",
    category: "Carriere",
    date: "28 Jan 2026",
    readTime: "11 min",
    icon: Bug,
    color: "#ef4444",
    featured: false,
  },
  {
    title: "Securite IoT : vos objets connectes sont-ils proteges ?",
    excerpt: "Cameras, assistants vocaux, domotique... Les risques de l'IoT et comment securiser votre reseau domestique.",
    category: "IoT",
    date: "25 Jan 2026",
    readTime: "8 min",
    icon: Wifi,
    color: "#06b6d4",
    featured: false,
  },
  {
    title: "Analyse forensique : les bases de l'investigation numerique",
    excerpt: "Collecte de preuves, analyse memoire, timeline... Introduction a la forensique numerique pour debutants.",
    category: "Forensique",
    date: "22 Jan 2026",
    readTime: "13 min",
    icon: Search,
    color: "#8b5cf6",
    featured: false,
  },
  {
    title: "Securite mobile : Android vs iOS en 2026",
    excerpt: "Permissions, sandboxing, chiffrement... Comparaison objective de la securite des deux ecosystemes mobiles.",
    category: "Mobile",
    date: "20 Jan 2026",
    readTime: "10 min",
    icon: Smartphone,
    color: "#ec4899",
    featured: false,
  },
  {
    title: "Supply Chain Attack : la menace invisible",
    excerpt: "SolarWinds, Log4j, npm malveillants... Comment les attaquants compromettent vos dependances logicielles.",
    category: "Menaces",
    date: "18 Jan 2026",
    readTime: "9 min",
    icon: Layers,
    color: "#ef4444",
    featured: false,
  },
  {
    title: "RGPD et cybersecurite : obligations legales",
    excerpt: "DPO, notification de breche, PIA... Ce que le RGPD exige en matiere de securite des donnees personnelles.",
    category: "Legal",
    date: "15 Jan 2026",
    readTime: "11 min",
    icon: Shield,
    color: "#f59e0b",
    featured: false,
  },
  {
    title: "Intelligence Artificielle et cybersecurite",
    excerpt: "L'IA au service de la detection d'intrusions, mais aussi utilisee par les attaquants. Le double tranchant.",
    category: "IA",
    date: "12 Jan 2026",
    readTime: "14 min",
    icon: Cpu,
    color: "#00d4ff",
    featured: false,
  },
  {
    title: "Metasploit : introduction au framework de pentest",
    excerpt: "Installation, modules, payloads, exploitation... Premier pas avec l'outil de pentest le plus populaire.",
    category: "Pentest",
    date: "10 Jan 2026",
    readTime: "16 min",
    icon: Zap,
    color: "#39ff14",
    featured: false,
  },
  {
    title: "Securiser ses mots de passe : gestionnaires et bonnes pratiques",
    excerpt: "Bitwarden, KeePass, 1Password... Comparatif des gestionnaires et regles d'or pour des mots de passe solides.",
    category: "Guides",
    date: "8 Jan 2026",
    readTime: "8 min",
    icon: Key,
    color: "#8b5cf6",
    featured: false,
  },
  {
    title: "WAF : Web Application Firewall explique simplement",
    excerpt: "ModSecurity, Cloudflare WAF, AWS WAF... Comment un WAF protege vos applications et comment le configurer.",
    category: "Configuration",
    date: "5 Jan 2026",
    readTime: "10 min",
    icon: Shield,
    color: "#06b6d4",
    featured: false,
  },
  {
    title: "Dark Web : mythes, realites et risques",
    excerpt: "Tor, marchands noirs, fuites de donnees... Ce qui se passe vraiment sur le dark web et comment s'en proteger.",
    category: "Sensibilisation",
    date: "3 Jan 2026",
    readTime: "9 min",
    icon: Eye,
    color: "#ef4444",
    featured: false,
  },
  {
    title: "Securite du cloud : AWS, Azure, GCP",
    excerpt: "IAM, chiffrement, compliance... Les bonnes pratiques de securite pour les trois grands clouds publics.",
    category: "Cloud",
    date: "1 Jan 2026",
    readTime: "13 min",
    icon: Database,
    color: "#f59e0b",
    featured: false,
  },
  {
    title: "Pentest Wi-Fi : securisez votre reseau sans fil",
    excerpt: "WPA3, evil twin, deauthentication... Les techniques d'attaque Wi-Fi et comment s'en proteger efficacement.",
    category: "Reseau",
    date: "28 Dec 2025",
    readTime: "11 min",
    icon: Wifi,
    color: "#ec4899",
    featured: false,
  },
];

export function BlogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [...new Set(articles.map(a => a.category))];

  const filteredArticles = articles.filter(a => {
    const matchSearch = !searchQuery || a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = !selectedCategory || a.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const featuredArticles = filteredArticles.filter((a) => a.featured);
  const regularArticles = filteredArticles.filter((a) => !a.featured);

  return (
    <div className="min-h-screen py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6" style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.12)" }}>
            <BookOpen className="w-3.5 h-3.5 text-[#00d4ff]" />
            <span className="text-[#00d4ff]" style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace" }}>
              {articles.length} articles
            </span>
          </div>
          <h1
            style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.8rem, 3vw, 2.5rem)" }}
            className="text-[#e2e8f0] mb-4"
          >
            Blog{" "}
            <span style={{ background: "linear-gradient(135deg, #00d4ff, #39ff14)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Cybersecurite
            </span>
          </h1>
          <p className="text-[#94a3b8] max-w-xl mx-auto" style={{ lineHeight: 1.7 }}>
            Articles pedagogiques, guides de securite et alertes pour rester informe des dernieres menaces.
          </p>
        </motion.div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748b]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un article..."
              className="w-full pl-10 pr-4 py-3 bg-[#111827] border border-[#00d4ff]/15 rounded-lg text-[#e2e8f0] placeholder-[#64748b] focus:outline-none focus:border-[#00d4ff]/50 transition-colors"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-2 rounded-lg transition-all ${!selectedCategory ? "bg-[#00d4ff]/15 text-[#00d4ff]" : "bg-[#111827] text-[#64748b] hover:text-[#94a3b8]"}`}
              style={{ fontSize: "0.8rem" }}
            >
              Tous
            </button>
            {categories.slice(0, 6).map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                className={`px-3 py-2 rounded-lg transition-all ${selectedCategory === cat ? "bg-[#00d4ff]/15 text-[#00d4ff]" : "bg-[#111827] text-[#64748b] hover:text-[#94a3b8]"}`}
                style={{ fontSize: "0.8rem" }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Featured articles */}
        {featuredArticles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            {featuredArticles.map((article, i) => (
              <motion.article
                key={article.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group cursor-pointer rounded-xl p-7 transition-all duration-500 relative overflow-hidden"
                style={{
                  background: "rgba(17,24,39,0.5)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${article.color}25`;
                  e.currentTarget.style.boxShadow = `0 0 50px ${article.color}08`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-3xl" style={{ background: `${article.color}10` }} />

                <div className="relative">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${article.color}10` }}>
                      <article.icon className="w-4 h-4" style={{ color: article.color }} />
                    </div>
                    <span className="px-2 py-0.5 rounded-full" style={{ fontSize: "0.65rem", color: article.color, background: `${article.color}08`, border: `1px solid ${article.color}15`, fontFamily: "JetBrains Mono, monospace" }}>
                      {article.category}
                    </span>
                    <span className="px-2 py-0.5 rounded-full" style={{ fontSize: "0.6rem", color: "#f59e0b", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)", fontFamily: "JetBrains Mono, monospace" }}>
                      A la une
                    </span>
                  </div>

                  <h3 className="text-[#e2e8f0] mb-3 group-hover:text-white transition-colors" style={{ fontSize: "1.15rem", lineHeight: 1.4 }}>
                    {article.title}
                  </h3>
                  <p className="text-[#64748b] group-hover:text-[#94a3b8] mb-5 transition-colors" style={{ fontSize: "0.88rem", lineHeight: 1.7 }}>
                    {article.excerpt}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[#4a5568]" style={{ fontSize: "0.73rem" }}>
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{article.date}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{article.readTime}</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 transition-all group-hover:gap-2" style={{ fontSize: "0.8rem", color: article.color }}>
                      Lire <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}

        {/* Regular articles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {regularArticles.map((article, i) => (
            <motion.article
              key={article.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.03 }}
              className="group cursor-pointer rounded-xl p-5 transition-all duration-500"
              style={{
                background: "rgba(17,24,39,0.4)",
                border: "1px solid rgba(255,255,255,0.04)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `${article.color}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)";
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: `${article.color}10` }}>
                  <article.icon className="w-3.5 h-3.5" style={{ color: article.color }} />
                </div>
                <span className="text-[#4a5568]" style={{ fontSize: "0.65rem", fontFamily: "JetBrains Mono, monospace" }}>{article.category}</span>
              </div>
              <h3 className="text-[#e2e8f0] mb-2 group-hover:text-white transition-colors" style={{ fontSize: "0.95rem", lineHeight: 1.4 }}>
                {article.title}
              </h3>
              <p className="text-[#64748b] mb-3" style={{ fontSize: "0.8rem", lineHeight: 1.6 }}>
                {article.excerpt.slice(0, 80)}...
              </p>
              <div className="flex items-center gap-2 text-[#4a5568]" style={{ fontSize: "0.7rem" }}>
                <span>{article.date}</span>
                <span>-</span>
                <span>{article.readTime}</span>
              </div>
            </motion.article>
          ))}
        </div>

        {filteredArticles.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-[#64748b] mx-auto mb-4" />
            <p className="text-[#94a3b8]">Aucun article ne correspond a votre recherche.</p>
          </div>
        )}
      </div>
    </div>
  );
}
