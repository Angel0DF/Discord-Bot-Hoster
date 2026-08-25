"use client";
import React, { useState } from "react";
import { Plus, Trash2, Save, Eye, EyeOff, KeyRound, Check, HelpCircle } from "lucide-react";
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

  const handleSave = async () => {
    setIsSaving(true);
    const envObject: Record<string, string> = {};
    for (const item of envList) {
      if (item.key.trim()) {
        envObject[item.key.trim()] = item.value;
      }
    }

    try {
      const data = await ApiClient.updateBot(botId, { env: envObject });
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

  return (
    <GlowingCard glowColor="purple" className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Variabili d'Ambiente & Token</h3>
            <p className="text-xs text-zinc-400">
              Imposta in modo sicuro il <code className="text-indigo-300">DISCORD_BOT_TOKEN</code> e altre chiavi segrete.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddRow}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Aggiungi Variabile
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            {saved ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Salvato!
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Salva Variabili
              </>
            )}
          </button>
        </div>
      </div>

      {/* Helper Box */}
      <div className="mb-6 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-xs text-indigo-200 flex items-start gap-3">
        <HelpCircle className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-white">Come trovare il Token del tuo Bot:</p>
          <p className="mt-1 text-zinc-300">
            Vai su{" "}
            <a
              href="https://discord.com/developers/applications"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 underline hover:text-indigo-300"
            >
              Discord Developer Portal
            </a>
            , seleziona la tua Applicazione, vai nella scheda <strong>Bot</strong> e clicca su <strong>Reset Token</strong>.
            Copia la stringa e incollala nel valore di <code>DISCORD_BOT_TOKEN</code>.
          </p>
        </div>
      </div>

      {/* Env Rows */}
      <div className="space-y-3">
        {envList.length === 0 ? (
          <p className="text-center text-xs text-zinc-500 py-6">Nessuna variabile configurata.</p>
        ) : (
          envList.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={item.key}
                onChange={(e) => handleChangeKey(index, e.target.value)}
                placeholder="ES. DISCORD_BOT_TOKEN"
                className="w-1/3 rounded-lg border border-zinc-700/80 bg-zinc-900/80 px-3 py-2 text-xs font-mono text-white placeholder-zinc-500 outline-none focus:border-indigo-500"
              />
              <span className="text-zinc-600 font-mono">=</span>
              <div className="relative flex-1">
                <input
                  type={item.visible ? "text" : "password"}
                  value={item.value}
                  onChange={(e) => handleChangeValue(index, e.target.value)}
                  placeholder="Valore della variabile..."
                  className="w-full rounded-lg border border-zinc-700/80 bg-zinc-900/80 px-3 py-2 pr-9 text-xs font-mono text-white placeholder-zinc-500 outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility(index)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  title={item.visible ? "Nascondi" : "Mostra"}
                >
                  {item.visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveRow(index)}
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-rose-400 transition-colors"
                title="Rimuovi"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </GlowingCard>
  );
};

