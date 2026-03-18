import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  Code, Globe, Lock, RefreshCw, Search, Radio, Shield, Eye, Zap,
  Hash, FileSearch, ShieldCheck, Frame, Cpu, ExternalLink, AlertTriangle,
  Loader2,
} from "lucide-react";
import { ToolPageLayout } from "./ToolPageLayout";
import type { GuiConfig } from "./zip-generator";
import { getCustomTool, type CustomTool } from "./tool-store";
import type { ComponentType } from "react";

const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  Radio, Shield, Globe, Lock, RefreshCw, Search, Eye, Zap, Code,
  Hash, FileSearch, ShieldCheck, Frame, Cpu, ExternalLink,
};

function GenericInteractiveTool({ tool }: { tool: CustomTool }) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const runTool = () => {
    if (!input.trim()) return;
    setLoading(true);
    setOutput("");

    // Simulate processing with a generic message
    setTimeout(() => {
      const lines = [
        `[CyberGuard] ${tool.name}`,
        `[INPUT] ${input}`,
        ``,
        `Cet outil fonctionne en mode complet uniquement via le script Python.`,
        `Telechargez le ZIP pour executer l'analyse complete.`,
        ``,
        `Fonctions disponibles dans ${tool.slug}.py :`,
        ...tool.features.map((f) => `  - ${f.title}: ${f.desc}`),
        ``,
        `Fonction principale : ${tool.mainFunction}()`,
        tool.needsApiKey ? `Note : Necessite ${tool.apiKeyName}` : `Aucune API requise.`,
      ];
      setOutput(lines.join("\n"));
      setLoading(false);
    }, 800);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {tool.inputType === "text" ? (
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={tool.inputPlaceholder}
            rows={3}
            className="flex-1 px-4 py-3 bg-[#0a0a0f] border border-[#1e293b] rounded-lg text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#00d4ff]/40 resize-none"
            style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.85rem" }}
          />
        ) : (
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runTool()}
            placeholder={tool.inputPlaceholder}
            className="flex-1 px-4 py-3 bg-[#0a0a0f] border border-[#1e293b] rounded-lg text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#00d4ff]/40"
            style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.85rem" }}
          />
        )}
        <button
          onClick={runTool}
          disabled={loading || !input.trim()}
          className="px-6 py-3 rounded-lg transition-all flex items-center gap-2 disabled:opacity-40"
          style={{
            background: `linear-gradient(135deg, ${tool.color}, ${tool.color}cc)`,
            color: "#0a0a0f",
            fontFamily: "Orbitron, sans-serif",
            fontSize: "0.82rem",
          }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Executer
        </button>
      </div>

      {output && (
        <div
          className="rounded-lg p-4 overflow-x-auto"
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "0.78rem",
          }}
        >
          <pre className="text-[#39ff14] whitespace-pre-wrap">{output}</pre>
        </div>
      )}

      {!output && !loading && (
        <div
          className="rounded-lg p-6 text-center"
          style={{ background: "rgba(17,24,39,0.3)", border: "1px solid #1e293b" }}
        >
          <p className="text-[#4a5568]" style={{ fontSize: "0.82rem" }}>
            Entrez une valeur et cliquez sur Executer pour tester.
            Pour l'analyse complete, telechargez le script Python.
          </p>
        </div>
      )}
    </div>
  );
}

export function DynamicToolPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const tool = slug ? getCustomTool(slug) : null;

  if (!tool) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-[#f59e0b] mx-auto mb-4" />
          <h2 className="text-[#e2e8f0] mb-2" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1.2rem" }}>
            Outil introuvable
          </h2>
          <p className="text-[#94a3b8] mb-6" style={{ fontSize: "0.85rem" }}>
            Cet outil personnalise n'existe pas ou a ete supprime.
          </p>
          <button
            onClick={() => navigate("/hacking-ethique")}
            className="px-5 py-2.5 rounded-lg text-[#00d4ff] hover:bg-[#00d4ff]/10 transition-colors"
            style={{ border: "1px solid rgba(0,212,255,0.2)", fontSize: "0.85rem" }}
          >
            Retour au Hub
          </button>
        </div>
      </div>
    );
  }

  const IconComp = ICON_MAP[tool.iconKey] || Code;

  const guiConfig: GuiConfig = {
    title: tool.name,
    inputType: tool.inputType,
    inputPlaceholder: tool.inputPlaceholder,
    buttonText: "Analyser",
    importLine: tool.guiImportLine,
    processCode: tool.guiProcessCode,
  };

  const readmeContent = `# ${tool.name} - CyberGuard
${tool.description}

## Utilisation
\`\`\`bash
python ${tool.slug}.py --help
\`\`\`

## Categorie: ${tool.category}
${tool.needsApiKey ? `## API requise: ${tool.apiKeyName}` : "## Aucune API requise"}

Cree par CyberGuard — https://cyber-guard-dusky.vercel.app
`;

  return (
    <ToolPageLayout
      title={tool.name}
      subtitle=""
      description={tool.description}
      features={tool.features.map((f) => ({
        icon: IconComp,
        title: f.title,
        desc: f.desc,
      }))}
      requirements={tool.requirements}
      pythonScript={tool.pythonScript}
      readmeContent={readmeContent}
      toolSlug={tool.slug}
      icon={IconComp}
      color={tool.color}
      needsApiKey={tool.needsApiKey}
      apiKeyName={tool.apiKeyName}
      guiConfig={guiConfig}
    >
      <GenericInteractiveTool tool={tool} />
    </ToolPageLayout>
  );
}
