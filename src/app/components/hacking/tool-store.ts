// ─── Custom Tool Store (localStorage) ────────────────────────────────────
// Stores user-created hacking tools in localStorage for persistence.

export interface CustomTool {
  id: string;
  slug: string;
  name: string;
  description: string;
  pythonScript: string;
  features: { title: string; desc: string }[];
  requirements: string[];
  needsApiKey: boolean;
  apiKeyName: string;
  inputType: "url" | "text";
  inputPlaceholder: string;
  color: string;
  iconKey: string;
  category: string;
  mainFunction: string;
  guiImportLine: string;
  guiProcessCode: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "cyberguard_custom_tools";

export function getCustomTools(): CustomTool[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getCustomTool(slug: string): CustomTool | null {
  return getCustomTools().find((t) => t.slug === slug) || null;
}

export function saveCustomTool(tool: CustomTool): void {
  const tools = getCustomTools();
  const existing = tools.findIndex((t) => t.id === tool.id);
  if (existing >= 0) {
    tools[existing] = { ...tool, updatedAt: new Date().toISOString() };
  } else {
    tools.push(tool);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tools));
  // Dispatch custom event so PentestingPage can react
  window.dispatchEvent(new CustomEvent("cyberguard-tools-updated"));
}

export function deleteCustomTool(id: string): void {
  const tools = getCustomTools().filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tools));
  window.dispatchEvent(new CustomEvent("cyberguard-tools-updated"));
}

export function generateToolId(): string {
  return `ct_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
