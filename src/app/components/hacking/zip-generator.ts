import JSZip from "jszip";

const DISCLAIMER_FR = `================================================================================
                    USAGE RESPONSABLE UNIQUEMENT
================================================================================

Cet outil est destine EXCLUSIVEMENT a l'analyse de securite de vos propres
applications ou d'applications pour lesquelles vous disposez d'une autorisation
explicite, ecrite et verifiable du proprietaire legitime.

Toute utilisation sur un systeme tiers sans consentement prealable constitue
une infraction penale au regard des articles 323-1 a 323-7 du Code penal
francais (acces frauduleux a un STAD) et des legislations equivalentes a
l'international (CFAA aux Etats-Unis, Computer Misuse Act au Royaume-Uni, etc.).

CLAUSE DE NON-RESPONSABILITE :
CyberGuard, ses createurs, contributeurs et l'ensemble des outils distribues
sont mis a disposition a titre strictement informatif et educatif. En utilisant
cet outil, vous reconnaissez et acceptez assumer l'entiere et exclusive
responsabilite de vos actions et de leur conformite avec la legislation en
vigueur dans votre juridiction.

CyberGuard - https://cyber-guard-dusky.vercel.app
================================================================================`;

const BRAND_HEADER = (title: string) =>
  `# ${"=".repeat(65)}
# ${title} - CyberGuard
# Cree par CyberGuard — https://cyber-guard-dusky.vercel.app
# Usage responsable uniquement
# ${"=".repeat(65)}
`;

function detectRequirements(pythonScript: string, includeGui: boolean): string {
  const deps: string[] = [];
  if (includeGui) deps.push("PyQt6>=6.6.0");
  if (pythonScript.includes("import requests") || pythonScript.includes("from requests"))
    deps.push("requests>=2.31.0");
  if (pythonScript.includes("import jwt") || pythonScript.includes("from jwt"))
    deps.push("PyJWT>=2.8.0");
  if (pythonScript.includes("python-whois") || pythonScript.includes("import whois"))
    deps.push("python-whois>=0.9.4");
  if (pythonScript.includes("import dns") || pythonScript.includes("from dns"))
    deps.push("dnspython>=2.4.0");
  if (deps.length === 0 && !includeGui)
    return "# No external dependencies required - Python 3.7+ standard library only\n";
  if (deps.length === 0 && includeGui)
    return "# CLI: aucune dependance externe (Python 3.7+ suffit)\n# GUI: pip install PyQt6\nPyQt6>=6.6.0\n";
  return deps.join("\n") + "\n";
}

// ─── GUI Config ──────────────────────────────────────────────────────────
export interface GuiConfig {
  title: string;
  inputType: "url" | "text";
  inputPlaceholder: string;
  buttonText: string;
  importLine: string;
  processCode: string;
  extraCombo?: {
    label: string;
    options: [string, string][];
    varName: string;
  };
}

function generateGuiFile(toolSlug: string, cfg: GuiConfig): string {
  const isTextarea = cfg.inputType === "text";
  const hasCombo = !!cfg.extraCombo;

  const comboSetup = hasCombo
    ? `
        combo_row = QHBoxLayout()
        cl = QLabel("${cfg.extraCombo!.label}")
        cl.setStyleSheet("color:#94a3b8;font-size:12px;")
        combo_row.addWidget(cl)
        self.combo = QComboBox()
        self.combo.addItems([${cfg.extraCombo!.options.map(([v, l]) => `"${l}"`).join(",")}])
        self.combo.setMinimumHeight(34)
        combo_row.addWidget(self.combo)
        combo_row.addStretch()
        L.addLayout(combo_row)
`
    : "";

  const comboVal = hasCombo
    ? `\n        combo_map = {${cfg.extraCombo!.options.map(([v, l], i) => `${i}:"${v}"`).join(",")}}\n        ${cfg.extraCombo!.varName} = combo_map.get(self.combo.currentIndex(), "${cfg.extraCombo!.options[0][0]}")`
    : "";

  return `#!/usr/bin/env python3
# ${"=".repeat(65)}
# ${cfg.title} — Interface Graphique PyQt6
# Cree par CyberGuard — https://cyber-guard-dusky.vercel.app
# Usage responsable uniquement
# ${"=".repeat(65)}
"""
${cfg.title} — Interface Graphique PyQt6

Lancez ce fichier pour l'interface graphique :
    python ${toolSlug}_gui.py

Necessite : pip install PyQt6
Le script CLI (${toolSlug}.py) fonctionne SANS PyQt6.
"""
import sys, os, json, traceback
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout,
        QHBoxLayout, QLineEdit, QTextEdit, QPushButton, QLabel, QComboBox,
        QFileDialog, QSplitter)
    from PyQt6.QtCore import Qt, QThread, pyqtSignal
    from PyQt6.QtGui import QFont, QIcon
except ImportError:
    print("\\033[91m[!] PyQt6 requis pour l'interface graphique.\\033[0m")
    print("    pip install PyQt6")
    print("\\033[93m[i] Le mode CLI fonctionne sans PyQt6 :\\033[0m")
    print(f"    python ${toolSlug}.py --help")
    sys.exit(1)

${cfg.importLine}

DARK = """
QMainWindow,QWidget{background:#0a0a0f;color:#e2e8f0;font-family:'Segoe UI',sans-serif;}
QPushButton{background:qlineargradient(x1:0,y1:0,x2:1,y2:1,stop:0 #00d4ff,stop:1 #0099cc);color:#0a0a0f;border:none;border-radius:8px;padding:10px 20px;font-weight:bold;font-size:13px;}
QPushButton:hover{background:qlineargradient(x1:0,y1:0,x2:1,y2:1,stop:0 #33e0ff,stop:1 #00ccee);}
QPushButton:disabled{background:#1e293b;color:#4a5568;}
QPushButton#secondary{background:#1e293b;color:#94a3b8;font-weight:normal;font-size:12px;}
QPushButton#secondary:hover{background:#2d3a4f;color:#e2e8f0;}
QLineEdit,QTextEdit{background:#111827;border:1px solid #1e293b;border-radius:8px;padding:10px;color:#e2e8f0;font-family:'JetBrains Mono','Consolas',monospace;font-size:13px;}
QLineEdit:focus,QTextEdit:focus{border-color:#00d4ff;}
QComboBox{background:#111827;border:1px solid #1e293b;border-radius:8px;padding:8px 12px;color:#e2e8f0;font-size:12px;}
QComboBox::drop-down{border:none;padding-right:8px;}
QComboBox QAbstractItemView{background:#111827;color:#e2e8f0;selection-background-color:#00d4ff30;border:1px solid #1e293b;}
QLabel{color:#94a3b8;}
QLabel#title{font-size:18px;font-weight:bold;color:#00d4ff;}
QLabel#brand{color:#4a5568;font-size:10px;}
QLabel#status{color:#4a5568;font-size:11px;}
"""

class Worker(QThread):
    done = pyqtSignal(str)
    err = pyqtSignal(str)
    def __init__(self, fn, *a):
        super().__init__()
        self.fn, self.a = fn, a
    def run(self):
        try:
            r = self.fn(*self.a)
            if isinstance(r, (dict, list)):
                self.done.emit(json.dumps(r, indent=2, default=str, ensure_ascii=False))
            else:
                self.done.emit(str(r))
        except Exception:
            self.err.emit(traceback.format_exc())

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("${cfg.title} — CyberGuard")
        self.setMinimumSize(960, 660)
        self.setStyleSheet(DARK)
        self._build()

    def _build(self):
        c = QWidget()
        self.setCentralWidget(c)
        L = QVBoxLayout(c)
        L.setContentsMargins(24, 20, 24, 16)
        L.setSpacing(10)

        # Header
        h = QHBoxLayout()
        t = QLabel("\\u2694  ${cfg.title}")
        t.setObjectName("title")
        h.addWidget(t)
        h.addStretch()
        b = QLabel("CyberGuard \\u2014 cyber-guard-dusky.vercel.app")
        b.setObjectName("brand")
        h.addWidget(b)
        L.addLayout(h)

        sep = QLabel("")
        sep.setFixedHeight(1)
        sep.setStyleSheet("background:#1e293b;")
        L.addWidget(sep)
${comboSetup}
        # Input
        r = QHBoxLayout()
        ${
          isTextarea
            ? `self.inp = QTextEdit()
        self.inp.setPlaceholderText("${cfg.inputPlaceholder}")
        self.inp.setMaximumHeight(100)`
            : `self.inp = QLineEdit()
        self.inp.setPlaceholderText("${cfg.inputPlaceholder}")
        self.inp.setMinimumHeight(40)
        self.inp.returnPressed.connect(self._run)`
        }
        r.addWidget(self.inp)
        self.btn = QPushButton("\\u26a1 ${cfg.buttonText}")
        self.btn.setMinimumHeight(40)
        self.btn.setMinimumWidth(140)
        self.btn.clicked.connect(self._run)
        r.addWidget(self.btn)
        L.addLayout(r)

        # Output
        self.out = QTextEdit()
        self.out.setReadOnly(True)
        self.out.setStyleSheet(
            "background:#0f172a;font-family:'JetBrains Mono','Consolas',monospace;"
            "font-size:12px;color:#39ff14;border:1px solid #1e293b;border-radius:8px;padding:12px;"
        )
        L.addWidget(self.out)

        # Footer
        f = QHBoxLayout()
        self.exp_btn = QPushButton("\\U0001f4be Exporter JSON")
        self.exp_btn.setObjectName("secondary")
        self.exp_btn.clicked.connect(self._export)
        self.exp_btn.setEnabled(False)
        f.addWidget(self.exp_btn)
        clr = QPushButton("\\U0001f5d1 Effacer")
        clr.setObjectName("secondary")
        clr.clicked.connect(lambda: (self.out.clear(), self.exp_btn.setEnabled(False), self.st.setText("Pret")))
        f.addWidget(clr)
        f.addStretch()
        self.st = QLabel("Pret")
        self.st.setObjectName("status")
        f.addWidget(self.st)
        L.addLayout(f)

    def _val(self):
        ${isTextarea ? "return self.inp.toPlainText().strip()" : "return self.inp.text().strip()"}

    def _run(self):
        v = self._val()
        if not v:
            return
        self.btn.setEnabled(False)
        self.st.setText("\\u23f3 Analyse en cours...")
        self.st.setStyleSheet("color:#f59e0b;font-size:11px;")
        self.out.clear()
        self.out.append("\\u23f3 Analyse en cours...\\n")
        def process(inp):${comboVal}
${cfg.processCode}
        self.w = Worker(process, v)
        self.w.done.connect(self._ok)
        self.w.err.connect(self._fail)
        self.w.start()

    def _ok(self, r):
        self.out.clear()
        self.out.setPlainText(r)
        self._last = r
        self.btn.setEnabled(True)
        self.exp_btn.setEnabled(True)
        self.st.setText("\\u2705 Analyse terminee")
        self.st.setStyleSheet("color:#39ff14;font-size:11px;")

    def _fail(self, e):
        self.out.clear()
        self.out.setPlainText(f"\\u274c Erreur:\\n{e}")
        self.btn.setEnabled(True)
        self.st.setText("\\u274c Erreur")
        self.st.setStyleSheet("color:#ef4444;font-size:11px;")

    def _export(self):
        if not hasattr(self, "_last"):
            return
        p, _ = QFileDialog.getSaveFileName(self, "Exporter", "${toolSlug}_report.json", "JSON (*.json)")
        if p:
            with open(p, "w", encoding="utf-8") as f:
                f.write(self._last)
            self.st.setText(f"\\U0001f4c1 Exporte : {os.path.basename(p)}")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    w = MainWindow()
    w.show()
    sys.exit(app.exec())
`;
}

// ─── Main download function ──────────────────────────────────────────────
export async function downloadToolZip(
  toolName: string,
  pythonScript: string,
  readmeContent: string,
  guiConfig?: GuiConfig
) {
  const zip = new JSZip();
  const folder = zip.folder(toolName)!;

  // Add branding header to CLI script
  const brandedScript = BRAND_HEADER(`${toolName}`) + pythonScript;
  folder.file(`${toolName}.py`, brandedScript);

  // Add GUI file if config provided
  const hasGui = !!guiConfig;
  if (guiConfig) {
    folder.file(`${toolName}_gui.py`, generateGuiFile(toolName, guiConfig));
  }

  // Enhanced README with GUI instructions
  const guiReadme = hasGui
    ? `

## Interface graphique (PyQt6)

\`\`\`bash
pip install PyQt6
python ${toolName}_gui.py
\`\`\`

L'interface graphique offre :
- Theme sombre CyberGuard (noir, bleu electrique, vert neon)
- Export des resultats en JSON
- Analyse non-bloquante (threading)

## Mode CLI (aucune dependance)

Le script \`${toolName}.py\` fonctionne sans PyQt6.
`
    : "";

  folder.file("README.md", readmeContent + guiReadme);
  folder.file("DISCLAIMER.txt", DISCLAIMER_FR);
  folder.file("requirements.txt", detectRequirements(pythonScript, hasGui));

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${toolName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── C ZIP download function ─────────────────────────────────────────────
export async function downloadCToolZip(
  toolName: string,
  cScript: string,
  readmeContent: string,
) {
  const zip = new JSZip();
  const folder = zip.folder(`${toolName}_c`)!;

  folder.file(`${toolName}.c`, cScript);
  folder.file("Makefile", `# Makefile for ${toolName} - CyberGuard
# Usage: make && ./${toolName}

CC = gcc
CFLAGS = -Wall -Wextra -O3 -march=native -flto -pthread
LDFLAGS = -lssl -lcrypto -lpthread -lm
TARGET = ${toolName}

all: $(TARGET)

$(TARGET): ${toolName}.c
\t$(CC) $(CFLAGS) -o $(TARGET) ${toolName}.c $(LDFLAGS)

clean:
\trm -f $(TARGET)

.PHONY: all clean
`);
  folder.file("README.md", readmeContent + `

## Compilation

\`\`\`bash
# Linux / macOS
make
# ou manuellement :
gcc -Wall -O3 -march=native -flto -pthread -o ${toolName} ${toolName}.c -lssl -lcrypto -lpthread -lm

# Windows (MinGW)
gcc -Wall -O3 -o ${toolName}.exe ${toolName}.c -lws2_32 -lssl -lcrypto
\`\`\`

## Avantages de la version C
- **10-100x plus rapide** que Python (compilation native, zero overhead)
- **Zero dependance runtime** (pas besoin d'installer Python)
- **Multi-thread natif** (pthreads)
- **Binaire portable** (compilez une fois, distribuez partout)
`);
  folder.file("DISCLAIMER.txt", DISCLAIMER_FR);

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${toolName}_c.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}