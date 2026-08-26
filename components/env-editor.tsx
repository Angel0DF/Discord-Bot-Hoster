"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  Trash2,
  Save,
  Eye,
  EyeOff,
  KeyRound,
  Check,
  Upload,
  RefreshCw,
  FileCode,
  Download,
  Sparkles,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { GlowingCard } from "./ui/glowing-card";
import { ApiClient } from "@/lib/api-client";

interface EnvEditorProps {
  botId: string;
  initialEnv: Record<string, string>;
  onSaveSuccess?: () => void;
}

export const EnvEditor = ({ botId, initialEnv, onSaveSuccess }: EnvEditorProps) => {
  const [envList, setEnvList] = useState<Array<{ key: string; value: string; visible: boolean }>>(
    Object.entries(initialEnv || {}).map(([key, value]) => ({
      key,
      value,
      visible: !key.toUpperCase().includes("TOKEN") && !key.toUpperCase().includes("SECRET") && !key.toUpperCase().includes("KEY"),
    }))
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectStatus, setDetectStatus] = useState<string | null>(null);
  const [showRawModal, setShowRawModal] = useState(false);
  const [rawEnvText, setRawEnvText] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse .env text into key-value map
  const parseEnvString = (content: string): Record<string, string> => {
    const result: Record<string, string> = {};
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const eqIndex = trimmed.indexOf("=");
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex).trim();
        let value = trimmed.substring(eqIndex + 1).trim();

        // Strip surrounding quotes
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.substring(1, value.length - 1);
        }

        if (key) {
          result[key] = value;
        }
      }
    }
    return result;
  };

  // Auto-detect .env file from server folder on mount
  const detectEnvFromServer = async (notifyIfNone = false) => {
    setIsDetecting(true);
    setDetectStatus(null);
    try {
      // Check .env and .env.local
      let envFileContent: string | null = null;
      let foundName = ".env";

      const res = await ApiClient.getFiles(botId, ".env", true);
      if (res.success && typeof res.content === "string") {
        envFileContent = res.content;
      } else {
        const resLocal = await ApiClient.getFiles(botId, ".env.local", true);
        if (resLocal.success && typeof resLocal.content === "string") {
          envFileContent = resLocal.content;
          foundName = ".env.local";
        }
      }

      if (envFileContent && envFileContent.trim()) {
        const parsed = parseEnvString(envFileContent);
        const keys = Object.keys(parsed);

        if (keys.length > 0) {
          // Merge with existing list
          setEnvList((prev) => {
            const currentMap: Record<string, { value: string; visible: boolean }> = {};
            prev.forEach((item) => {
              if (item.key.trim()) currentMap[item.key.trim()] = { value: item.value, visible: item.visible };
            });

            keys.forEach((k) => {
              currentMap[k] = {
                value: parsed[k],
                visible: !k.toUpperCase().includes("TOKEN") && !k.toUpperCase().includes("SECRET") && !k.toUpperCase().includes("KEY"),
              };
            });

            return Object.entries(currentMap).map(([k, val]) => ({
              key: k,
              value: val.value,
              visible: val.visible,
            }));
          });

          setDetectStatus(`Trovate ${keys.length} variabili in ${foundName} e sincronizzate!`);
          setTimeout(() => setDetectStatus(null), 5000);
          return;
        }
      }

      if (notifyIfNone) {
        setDetectStatus("Nessun file .env trovato nella cartella del bot.");
        setTimeout(() => setDetectStatus(null), 4000);
      }
    } catch (err) {
      console.error("Auto detect .env failed:", err);
    } finally {
      setIsDetecting(false);
    }
  };

  // Auto-scan on load if list is empty or on botId change
  useEffect(() => {
    detectEnvFromServer(false);
  }, [botId]);

  const handleAddRow = () => {
    setEnvList((prev) => [...prev, { key: "", value: "", visible: true }]);
  };

  const handleRemoveRow = (index: number) => {
    setEnvList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChangeKey = (index: number, newKey: string) => {
    setEnvList((prev) =>
      prev.map((item, i) => (i === index ? { ...item, key: newKey } : item))
    );
  };

  const handleChangeValue = (index: number, newValue: string) => {
    setEnvList((prev) =>
      prev.map((item, i) => (i === index ? { ...item, value: newValue } : item))
    );
  };

  const toggleVisibility = (index: number) => {
    setEnvList((prev) =>
      prev.map((item, i) => (i === index ? { ...item, visible: !item.visible } : item))
    );
  };

  // Manual .env file upload from PC
  const handleUploadEnvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const parsed = parseEnvString(content);
        const keys = Object.keys(parsed);

        if (keys.length > 0) {
          setEnvList((prev) => {
            const currentMap: Record<string, { value: string; visible: boolean }> = {};
            prev.forEach((item) => {
              if (item.key.trim()) currentMap[item.key.trim()] = { value: item.value, visible: item.visible };
            });

            keys.forEach((k) => {
              currentMap[k] = {
                value: parsed[k],
                visible: !k.toUpperCase().includes("TOKEN") && !k.toUpperCase().includes("SECRET") && !k.toUpperCase().includes("KEY"),
              };
            });

            return Object.entries(currentMap).map(([k, val]) => ({
              key: k,
              value: val.value,
              visible: val.visible,
            }));
          });

          setDetectStatus(`File "${file.name}" importato (${keys.length} variabili aggiunte)!`);
          setTimeout(() => setDetectStatus(null), 5000);
        }
      }
    };

    reader.readAsText(file);
    e.target.value = "";
  };

  // Import raw pasted text
  const handleImportRawText = () => {
    if (!rawEnvText.trim()) return;
    const parsed = parseEnvString(rawEnvText);
    const keys = Object.keys(parsed);

    if (keys.length > 0) {
      setEnvList((prev) => {
        const currentMap: Record<string, { value: string; visible: boolean }> = {};
        prev.forEach((item) => {
          if (item.key.trim()) currentMap[item.key.trim()] = { value: item.value, visible: item.visible };
        });

        keys.forEach((k) => {
          currentMap[k] = {
            value: parsed[k],
            visible: !k.toUpperCase().includes("TOKEN") && !k.toUpperCase().includes("SECRET") && !k.toUpperCase().includes("KEY"),
          };
        });

        return Object.entries(currentMap).map(([k, val]) => ({
          key: k,
          value: val.value,
          visible: val.visible,
        }));
      });

      setDetectStatus(`${keys.length} variabili importate con successo!`);
      setShowRawModal(false);
      setRawEnvText("");
      setTimeout(() => setDetectStatus(null), 4000);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const envObject: Record<string, string> = {};
    let envFileLines: string[] = ["# Discord Bot Environment Variables", "# Generato automaticamente dal pannello"];

    for (const item of envList) {
      if (item.key.trim()) {
        const k = item.key.trim();
        const v = item.value;
        envObject[k] = v;
        envFileLines.push(`${k}=${v}`);
      }
    }

    try {
      // 1. Update bot config
      const data = await ApiClient.updateBot(botId, { env: envObject });

      // 2. Also write/sync the physical .env file in bot folder
      await ApiClient.saveFile(botId, {
        path: ".env",
        content: envFileLines.join("\n"),
      });

      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        if (onSaveSuccess) onSaveSuccess();
      }
    } catch (err) {
      console.error("Failed to save environment variables:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportEnv = () => {
    const lines = envList
      .filter((item) => item.key.trim())
      .map((item) => `${item.key.trim()}=${item.value}`);

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = ".env";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <GlowingCard glowColor="purple" className="p-6">
      {/* Hidden file input for manual .env upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".env,.env.*,.txt,*"
        onChange={handleUploadEnvFile}
        className="hidden"
      />

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Variabili d'Ambiente & Token (.env)</h3>
            <p className="text-xs text-zinc-400">
              Rileva automaticamente il file <code className="text-indigo-300">.env</code> o caricalo per configurare i token in sicurezza.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => detectEnvFromServer(true)}
            disabled={isDetecting}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700 disabled:opacity-50"
            title="Cerca e sincronizza il file .env dal server"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-indigo-400 ${isDetecting ? "animate-spin" : ""}`} />
            Rileva da .env
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
            title="Carica un file .env dal tuo computer"
          >
            <Upload className="h-3.5 w-3.5 text-amber-400" />
            Carica file .env
          </button>

          <button
            type="button"
            onClick={() => setShowRawModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
            title="Incolla testo grezzo KEY=VALUE"
          >
            <FileText className="h-3.5 w-3.5 text-purple-400" />
            Incolla Testo
          </button>

          <button
            type="button"
            onClick={handleExportEnv}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
            title="Scarica come file .env"
          >
            <Download className="h-3.5 w-3.5" />
            Esporta
          </button>

          <button
            type="button"
            onClick={handleAddRow}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuova Riga
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
            {saved ? "Salvato!" : "Salva nel .env"}
          </button>
        </div>
      </div>

      {/* Detection Banner */}
      {detectStatus && (
        <div className="mb-4 rounded-xl border border-indigo-500/30 bg-indigo-950/40 p-3 text-xs text-indigo-300 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 text-indigo-400 flex-shrink-0" />
          <span>{detectStatus}</span>
        </div>
      )}

      {/* Raw text paste modal */}
      {showRawModal && (
        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white">Incolla contenuto del file .env:</span>
            <button
              onClick={() => setShowRawModal(false)}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Chiudi
            </button>
          </div>
          <textarea
            value={rawEnvText}
            onChange={(e) => setRawEnvText(e.target.value)}
            placeholder="DISCORD_TOKEN=MTA4...&#10;CLIENT_ID=123456&#10;PREFIX=!"
            className="w-full h-32 rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 font-mono text-xs text-zinc-200 outline-none focus:border-indigo-500 mb-2"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowRawModal(false)}
              className="rounded-lg px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
            >
              Annulla
            </button>
            <button
              onClick={handleImportRawText}
              className="rounded-lg bg-indigo-600 px-4 py-1 text-xs font-medium text-white hover:bg-indigo-500"
            >
              Importa Variabili
            </button>
          </div>
        </div>
      )}

      {/* Variables List */}
      <div className="space-y-3">
        {envList.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-10 text-center">
            <KeyRound className="h-8 w-8 text-zinc-600 mb-2" />
            <p className="text-xs font-medium text-zinc-400">Nessuna variabile o token impostato</p>
            <p className="text-[11px] text-zinc-500 mt-1 max-w-sm">
              Clicca su <b>"Rileva da .env"</b> per leggere automaticamente il file del bot, oppure su <b>"Carica file .env"</b> dal tuo computer.
            </p>
          </div>
        ) : (
          envList.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-2.5 transition-colors focus-within:border-zinc-700"
            >
              <input
                type="text"
                placeholder="NOME_VARIABILE (es. DISCORD_TOKEN)"
                value={item.key}
                onChange={(e) => handleChangeKey(index, e.target.value.toUpperCase())}
                className="w-1/3 min-w-[140px] rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 font-mono text-xs text-white placeholder-zinc-500 outline-none focus:border-purple-500 transition-colors uppercase"
              />

              <span className="text-zinc-600 font-bold text-xs select-none">=</span>

              <div className="relative flex-1">
                <input
                  type={item.visible ? "text" : "password"}
                  placeholder="Valore del token o della chiave"
                  value={item.value}
                  onChange={(e) => handleChangeValue(index, e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 pr-9 font-mono text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-purple-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility(index)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                  title={item.visible ? "Nascondi valore" : "Mostra valore"}
                >
                  {item.visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5 text-purple-400" />}
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleRemoveRow(index)}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                title="Rimuovi"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] text-zinc-500">
        <span>Tutte le variabili vengono sincronizzate in automatico nel file <code>.env</code> sul server Proxmox.</span>
        <span>{envList.filter((x) => x.key.trim()).length} configurate</span>
      </div>
    </GlowingCard>
  );
};
