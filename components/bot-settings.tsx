"use client";
import React, { useState } from "react";
import { BotState, BotRuntime } from "@/lib/types";
import { GlowingCard } from "./ui/glowing-card";
import { Settings, Save, Trash2, Check, AlertTriangle } from "lucide-react";

import { ApiClient } from "@/lib/api-client";

interface BotSettingsProps {
  bot: BotState;
  onUpdate: (updatedBot: any) => void;
  onDelete: () => void;
}

export const BotSettings = ({ bot, onUpdate, onDelete }: BotSettingsProps) => {
  const [name, setName] = useState(bot.config.name);
  const [description, setDescription] = useState(bot.config.description || "");
  const [runtime, setRuntime] = useState<BotRuntime>(bot.config.runtime);
  const [mainFile, setMainFile] = useState(bot.config.mainFile);
  const [startCommand, setStartCommand] = useState(bot.config.startCommand || "");
  const [autoRestart, setAutoRestart] = useState(bot.config.autoRestart);
  const [maxRestarts, setMaxRestarts] = useState(bot.config.maxRestarts || 5);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const data = await ApiClient.updateBot(bot.id, {
        name,
        description,
        runtime,
        mainFile,
        startCommand: startCommand.trim() || undefined,
        autoRestart,
        maxRestarts: Number(maxRestarts),
      });

      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        onUpdate(data.bot);
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <GlowingCard glowColor="indigo" className="p-6">
        <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-4 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Configurazione & Runtime</h3>
            <p className="text-xs text-zinc-400">
              Imposta il file di avvio, l'ambiente di esecuzione e le opzioni di riavvio automatico.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Nome del Bot
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Ambiente di Esecuzione (Runtime)
              </label>
              <select
                value={runtime}
                onChange={(e) => setRuntime(e.target.value as BotRuntime)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
              >
                <option value="nodejs">Node.js (node / npm)</option>
                <option value="python">Python 3 (python / venv)</option>
                <option value="bun">Bun (bun run)</option>
                <option value="custom">Personalizzato</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Descrizione
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                File Principale di Avvio
              </label>
              <input
                type="text"
                required
                value={mainFile}
                onChange={(e) => setMainFile(e.target.value)}
                placeholder="index.js oppure main.py"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-xs font-mono text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Comando di Avvio Personalizzato (opzionale)
              </label>
              <input
                type="text"
                value={startCommand}
                onChange={(e) => setStartCommand(e.target.value)}
                placeholder="es. node --max-old-space-size=512 index.js"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-xs font-mono text-white outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Auto restart options */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white">Auto-Restart su Crash</p>
                <p className="text-[11px] text-zinc-400">
                  Riavvia automaticamente il bot se il processo termina inaspettatamente.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRestart}
                  onChange={(e) => setAutoRestart(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {autoRestart && (
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Numero massimo di tentativi di riavvio consecutivo
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={maxRestarts}
                  onChange={(e) => setMaxRestarts(Number(e.target.value))}
                  className="w-32 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white outline-none"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {saved ? (
                <>
                  <Check className="h-4 w-4" />
                  Salvato con Successo!
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salva Modifiche
                </>
              )}
            </button>
          </div>
        </form>
      </GlowingCard>

      {/* Danger Zone */}
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-rose-300">Zona Pericolosa</h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Elimina definitivamente questo bot e tutti i suoi file memorizzati su Proxmox.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/20 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Elimina Bot
          </button>
        </div>

        {showDeleteConfirm && (
          <div className="mt-4 rounded-xl border border-rose-500/40 bg-zinc-950 p-4">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold mb-2">
              <AlertTriangle className="h-4 w-4" />
              Conferma Eliminazione
            </div>
            <p className="text-xs text-zinc-300 mb-3">
              Sei sicuro di voler eliminare <strong>{bot.config.name}</strong>? Questa azione è irreversibile.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
              >
                Sì, Elimina Definitivamente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

