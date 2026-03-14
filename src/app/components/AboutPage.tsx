import { Shield, Scale, Lock, FileText, Users, AlertTriangle, CheckCircle } from "lucide-react";
import { motion } from "motion/react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function AboutPage() {
  return (
    <div className="min-h-screen py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6" style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.12)" }}>
            <Shield className="w-3.5 h-3.5 text-[#00d4ff]" />
            <span className="text-[#00d4ff]" style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace" }}>CyberGuard v3.0</span>
          </div>
          <h1 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.8rem, 3vw, 2.2rem)" }} className="text-[#e2e8f0] mb-4">
            A propos &{" "}
            <span style={{ background: "linear-gradient(135deg, #00d4ff, #39ff14)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Mentions Legales</span>
          </h1>
          <p className="text-[#94a3b8] max-w-xl mx-auto" style={{ lineHeight: 1.7 }}>
            Notre mission, nos engagements legaux et notre politique de confidentialite.
          </p>
        </motion.div>

        {/* Mission */}
        <div className="bg-[#111827] border border-[#00d4ff]/20 rounded-xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-6 h-6 text-[#00d4ff]" />
            <h2 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1.2rem" }} className="text-[#e2e8f0]">
              Notre Mission
            </h2>
          </div>
          <p className="text-[#94a3b8]" style={{ lineHeight: 1.8 }}>
            CyberGuard a ete cree avec une mission simple : rendre la cybersecurite accessible a tous.
            Que vous soyez developpeur, entrepreneur ou simplement curieux, nos outils vous permettent
            de tester, comprendre et ameliorer la securite de vos sites web.
          </p>

          <div className="relative mt-6 rounded-xl overflow-hidden h-48">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1549605659-32d82da3a059?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjeWJlcnNlY3VyaXR5JTIwc2VydmVyJTIwZGFyayUyMHRlY2hub2xvZ3l8ZW58MXx8fHwxNzczNDk2MzY3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt="Cybersecurity Technology"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111827] to-transparent" />
          </div>
        </div>

        {/* Legal warning */}
        <div className="bg-[#111827] border border-[#f59e0b]/30 rounded-xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-[#f59e0b]" />
            <h2 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1.2rem" }} className="text-[#f59e0b]">
              Avertissement Important
            </h2>
          </div>
          <div className="bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-lg p-4 mb-4">
            <p className="text-[#e2e8f0]" style={{ lineHeight: 1.8 }}>
              Les outils de scan et de pentest fournis par CyberGuard doivent etre utilises
              <span className="text-[#f59e0b]"> UNIQUEMENT sur des sites dont vous etes proprietaire</span> ou
              pour lesquels vous avez une autorisation ecrite explicite.
            </p>
          </div>
          <p className="text-[#94a3b8]" style={{ fontSize: "0.9rem", lineHeight: 1.8 }}>
            Toute utilisation abusive, non autorisee ou malveillante de ces outils est strictement
            interdite et peut entrainer des poursuites judiciaires conformement aux lois en vigueur.
          </p>
        </div>

        {/* RGPD */}
        <div className="bg-[#111827] border border-[#00d4ff]/10 rounded-xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Scale className="w-6 h-6 text-[#00d4ff]" />
            <h2 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1.2rem" }} className="text-[#e2e8f0]">
              Conformite RGPD
            </h2>
          </div>
          <div className="space-y-3">
            {[
              "Vos donnees personnelles ne sont jamais vendues a des tiers.",
              "Les resultats de scans sont chiffres et stockes de maniere securisee.",
              "Vous pouvez demander la suppression de vos donnees a tout moment.",
              "Nous utilisons uniquement des cookies essentiels au fonctionnement du service.",
              "Aucune donnee n'est transferee en dehors de l'Union Europeenne.",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-[#39ff14] flex-shrink-0 mt-0.5" />
                <p className="text-[#94a3b8]" style={{ fontSize: "0.9rem" }}>{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy & Terms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#111827] border border-[#00d4ff]/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-5 h-5 text-[#39ff14]" />
              <h3 className="text-[#e2e8f0]">Politique de Confidentialite</h3>
            </div>
            <p className="text-[#94a3b8]" style={{ fontSize: "0.85rem", lineHeight: 1.7 }}>
              Nous nous engageons a proteger la vie privee de nos utilisateurs. Les donnees collectees
              sont strictement necessaires au fonctionnement du service et sont traitees conformement
              au RGPD.
            </p>
          </div>

          <div className="bg-[#111827] border border-[#00d4ff]/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-[#00d4ff]" />
              <h3 className="text-[#e2e8f0]">Conditions d'Utilisation</h3>
            </div>
            <p className="text-[#94a3b8]" style={{ fontSize: "0.85rem", lineHeight: 1.7 }}>
              En utilisant CyberGuard, vous acceptez de ne scanner que les sites dont vous etes
              proprietaire et de ne pas utiliser les resultats a des fins malveillantes.
            </p>
          </div>
        </div>

        {/* Technologies */}
        <div className="bg-[#111827] border border-[#00d4ff]/10 rounded-xl p-8 mt-8">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-[#00d4ff]" />
            <h2 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1.2rem" }} className="text-[#e2e8f0]">
              Technologies Utilisees
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Shannon", desc: "Pentest open-source" },
              { name: "VirusTotal", desc: "Analyse multi-AV" },
              { name: "SEAL", desc: "SSL Monitoring" },
              { name: "Open Source", desc: "Transparence totale" },
            ].map((tech) => (
              <div key={tech.name} className="text-center p-4 bg-[#0a0a0f] rounded-lg border border-[#00d4ff]/5">
                <Shield className="w-8 h-8 text-[#00d4ff] mx-auto mb-2" />
                <p className="text-[#e2e8f0]" style={{ fontSize: "0.9rem" }}>{tech.name}</p>
                <p className="text-[#64748b]" style={{ fontSize: "0.75rem" }}>{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}