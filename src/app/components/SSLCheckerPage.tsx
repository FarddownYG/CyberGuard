import { Lock, Shield, CheckCircle, ExternalLink, Linkedin, ShieldCheck, ShieldAlert, Search, Info } from "lucide-react";
import { motion } from "motion/react";

export function SSLCheckerPage() {
  return (
    <div className="min-h-screen py-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6" style={{ background: "rgba(57,255,20,0.04)", border: "1px solid rgba(57,255,20,0.1)" }}>
            <Lock className="w-3.5 h-3.5 text-[#39ff14]" />
            <span className="text-[#39ff14]" style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace" }}>SSL / TLS</span>
          </div>
          <h1 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.8rem, 3vw, 2.2rem)" }} className="text-[#e2e8f0] mb-4">
            Comprendre les{" "}
            <span style={{ background: "linear-gradient(135deg, #39ff14, #00d4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>certificats SSL</span>
          </h1>
          <p className="text-[#94a3b8] max-w-2xl mx-auto" style={{ lineHeight: 1.7 }}>
            Decouvrez pourquoi les certificats SSL/TLS sont essentiels pour la securite de votre site web
            et comment notre projet SEAL peut vous aider a les surveiller.
          </p>
        </motion.div>

        {/* Info notice */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#00d4ff]/5 border border-[#00d4ff]/20 rounded-xl p-5 mb-10 flex items-start gap-3"
        >
          <Info className="w-5 h-5 text-[#00d4ff] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[#00d4ff]" style={{ fontSize: "0.9rem" }}>Outil de verification SSL bientot disponible</p>
            <p className="text-[#94a3b8]" style={{ fontSize: "0.8rem" }}>
              Un outil de verification SSL en ligne sera bientot integre via notre projet SEAL.
              En attendant, decouvrez ci-dessous pourquoi le SSL est crucial pour votre site.
            </p>
          </div>
        </motion.div>

        {/* SEAL Project Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="bg-gradient-to-br from-[#111827] to-[#0f172a] border border-[#00d4ff]/20 rounded-2xl p-8 md:p-10 relative overflow-hidden">
            {/* Decorative glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#00d4ff]/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#39ff14]/5 rounded-full blur-3xl" />

            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-[#00d4ff]/10 flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6 text-[#00d4ff]" />
                </div>
                <div>
                  <h2 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1.3rem" }} className="text-[#e2e8f0]">
                    Decouvrez <span className="text-[#00d4ff]">SEAL</span>
                  </h2>
                  <p className="text-[#64748b]" style={{ fontSize: "0.8rem" }}>
                    Secure Expiry Alert & Logging
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-[#94a3b8]" style={{ lineHeight: 1.8 }}>
                  SEAL (Secure Expiry Alert & Logging) est un de nos projets dedies a la surveillance SSL.
                  Il permet de monitorer automatiquement vos certificats SSL et de recevoir des alertes
                  avant leur expiration.
                </p>

                <a
                  href="https://www.linkedin.com/in/seal-secure-expiry-alert-logging/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#0077b5] text-white px-5 py-2.5 rounded-lg hover:bg-[#006097] transition-all hover:shadow-[0_0_20px_rgba(0,119,181,0.3)]"
                  style={{ fontSize: "0.9rem" }}
                >
                  <Linkedin className="w-5 h-5" />
                  Voir le projet SEAL sur LinkedIn
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* SSL Explanation */}
              <div className="bg-[#0a0a0f]/60 border border-[#00d4ff]/10 rounded-xl p-6">
                <h3 className="text-[#00d4ff] mb-4 flex items-center gap-2" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1rem" }}>
                  <Lock className="w-5 h-5" />
                  C'est quoi un SSL et pourquoi c'est ULTRA important ?
                </h3>

                <div className="space-y-4 text-[#94a3b8]" style={{ lineHeight: 1.8, fontSize: "0.95rem" }}>
                  <p>
                    <span className="text-[#39ff14]">SSL (Secure Sockets Layer)</span> est un protocole de securite
                    qui cree un lien chiffre entre un serveur web et un navigateur. Aujourd'hui on utilise son
                    successeur <span className="text-[#39ff14]">TLS (Transport Layer Security)</span>, mais on
                    continue de dire "SSL" par habitude.
                  </p>

                  <p>
                    Concretement, quand vous voyez le petit <span className="text-[#39ff14]">cadenas vert</span> et
                    le <span className="text-[#39ff14]">HTTPS</span> dans la barre d'adresse, ca veut dire que
                    la connexion est chiffree. Toutes les donnees echangees entre l'utilisateur et le site
                    (mots de passe, numeros de carte, donnees personnelles) sont <span className="text-[#00d4ff]">illisibles</span> pour
                    quiconque essaierait de les intercepter.
                  </p>

                  <div className="bg-[#111827] rounded-lg p-4 border-l-4 border-[#ef4444]">
                    <p className="text-[#e2e8f0]" style={{ fontSize: "0.9rem" }}>
                      <span className="text-[#ef4444]">Sans SSL</span>, c'est comme envoyer une carte postale :
                      tout le monde peut lire ce qui est ecrit dessus. Avec SSL, c'est comme envoyer une lettre
                      dans un coffre-fort dont seul le destinataire a la cle.
                    </p>
                  </div>

                  <h4 className="text-[#e2e8f0] mt-4" style={{ fontSize: "1rem" }}>
                    Pourquoi c'est ultra important :
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      {
                        title: "Protection des donnees",
                        desc: "Chiffrement de bout en bout de toutes les informations sensibles transmises.",
                        icon: Shield,
                      },
                      {
                        title: "Confiance utilisateur",
                        desc: "87% des utilisateurs quittent un site sans HTTPS. Le cadenas = confiance.",
                        icon: CheckCircle,
                      },
                      {
                        title: "SEO Google",
                        desc: "Google penalise les sites sans SSL dans son classement. HTTPS = meilleur ranking.",
                        icon: Search,
                      },
                      {
                        title: "Conformite legale",
                        desc: "Le RGPD exige la protection des donnees. Pas de SSL = pas de conformite.",
                        icon: ShieldCheck,
                      },
                      {
                        title: "Anti-phishing",
                        desc: "Empeche les attaques Man-in-the-Middle et le vol de donnees en transit.",
                        icon: ShieldAlert,
                      },
                      {
                        title: "Obligatoire pour le e-commerce",
                        desc: "Impossible de traiter des paiements en ligne sans certificat SSL valide.",
                        icon: Lock,
                      },
                    ].map((item) => (
                      <div key={item.title} className="bg-[#111827]/80 rounded-lg p-4 border border-[#00d4ff]/5 flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#39ff14]/10 flex items-center justify-center flex-shrink-0">
                          <item.icon className="w-4 h-4 text-[#39ff14]" />
                        </div>
                        <div>
                          <p className="text-[#e2e8f0]" style={{ fontSize: "0.85rem" }}>{item.title}</p>
                          <p className="text-[#64748b]" style={{ fontSize: "0.8rem" }}>{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-[#111827] rounded-lg p-4 border-l-4 border-[#39ff14] mt-4">
                    <p className="text-[#e2e8f0]" style={{ fontSize: "0.9rem" }}>
                      <span className="text-[#39ff14]">En resume :</span> un site sans SSL en 2026, c'est comme
                      une maison sans serrure. Ca expose vos visiteurs, ruine votre referencement et vous met
                      en infraction legale. C'est tout simplement <span className="text-[#00d4ff]">non-negociable</span>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
