"use client";
import React, { useState } from "react";
import { BOT_TEMPLATES, BotTemplate } from "@/lib/templates";
import { X, Bot, Sparkles, Check, Code, FileText, ArrowRight } from "lucide-react";
import { ShimmerButton } from "./ui/shimmer-button";

import { ApiClient } from "@/lib/api-client";

interface CreateBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBotCreated: (newBot: any) => void;
}

export const CreateBotModal = ({ isOpen, onClose, onBotCreated }: CreateBotModalProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<BotTemplate>(BOT_TEMPLATES[0]);
  const [botName, setBotName] = useState("");
  const [botDescription, setBotDescription] = useState("");
  const [discordToken, setDiscordToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botName.trim()) {
      setError("Inserisci un nome per il bot");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const env = {
        ...selectedTemplate.defaultEnv,
      };
      if (discordToken.trim()) {
        env.DISCORD_BOT_TOKEN = discordToken.trim();
      }

      const data = await ApiClient.createBot({
        name: botName.trim(),
        description: botDescription.trim() || selectedTemplate.description,
        templateId: selectedTemplate.id,
        templateFiles: selectedTemplate.files,
        runtime: selectedTemplate.runtime,
        mainFile: selectedTemplate.mainFile,
        env,
      });

      if (data.success) {
        onBotCreated(data.bot);
        onClose();
        // Reset form
        setBotName("");
        setBotDescription("");
        setDiscordToken("");
      } else {
        setError(data.error || "Errore durante la creazione del bot");
      }
    } catch (err: any) {
      setError(err.message || "Errore di connessione");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Crea o Ospita un Nuovo Bot</h2>
            <p className="text-xs text-zinc-400">
              Scegli un template pronto o crea uno scheletro per il tuo bot personalizzato.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="mt-6 space-y-6">
          {/* Template Selection */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-2">
              1. Seleziona il Template / Linguaggio
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {BOT_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplate.id === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplate(tmpl)}
                    className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/50"
                        : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-indigo-300">
                        {tmpl.runtime}
                      </span>
                      {isSelected && <Check className="h-4 w-4 text-indigo-400" />}
                    </div>
                    <h4 className="mt-2 text-sm font-semibold text-white">{tmpl.name}</h4>
                    <p className="mt-1 text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {tmpl.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bot details */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                2. Nome del Bot <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                placeholder="es. ProxmoxManager, ModerationBot, MusicBot"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                3. Descrizione (opzionale)
              </label>
              <input
                type="text"
                value={botDescription}
                onChange={(e) => setBotDescription(e.target.value)}
                placeholder="es. Bot multifunzione per la gestione dei ticket e comandi server"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                4. Discord Bot Token (puoi inserirlo anche in seguito)
              </label>
              <input
                type="password"
                value={discordToken}
                onChange={(e) => setDiscordToken(e.target.value)}
                placeholder="MTA2ND... (dal Discord Developer Portal)"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-xs font-mono text-white placeholder-zinc-500 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-zinc-800/80 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              Annulla
            </button>
            <ShimmerButton type="submit" disabled={isLoading} className="h-10 px-5 text-xs">
              {isLoading ? "Creazione in corso..." : "Crea e Configura Bot"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </ShimmerButton>
          </div>
        </form>
      </div>
    </div>
  );
};

