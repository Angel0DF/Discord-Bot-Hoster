"use client";
import React, { useState, useEffect } from "react";
import { Server, KeyRound, Check, X, Wifi, WifiOff, RefreshCw, HelpCircle, ShieldCheck } from "lucide-react";
import { getStoredAgentConfig, setStoredAgentConfig, ApiClient } from "@/lib/api-client";
import { ShimmerButton } from "./ui/shimmer-button";

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionChanged: () => void;
}

export const ConnectionModal = ({ isOpen, onClose, onConnectionChanged }: ConnectionModalProps) => {
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const config = getStoredAgentConfig();
      setUrl(config.url);
      setSecret(config.secret);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    const result = await ApiClient.testConnection(url, secret);
    setTestResult(result);
    setIsTesting(false);
  };

  const handleSave = () => {
    setStoredAgentConfig({ url, secret });
    onConnectionChanged();
    onClose();
  };

  const handleResetToLocal = () => {
    setUrl("");
    setSecret("");
    setStoredAgentConfig({ url: "", secret: "" });
    onConnectionChanged();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Connessione Proxmox Agent</h2>
            <p className="text-xs text-zinc-400">
              Collega la tua dashboard al server casalingo Proxmox.
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3.5 text-xs text-indigo-200 flex items-start gap-2.5">
          <ShieldCheck className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-white">Come connettere da Netlify al tuo Proxmox:</p>
            <p className="mt-1 text-zinc-300 text-[11px] leading-relaxed">
              Esegui lo script <code>install-agent.sh</code> nel tuo container LXC Proxmox, poi inserisci l'indirizzo HTTP dell'agent (oppure il tuo URL <strong>Cloudflare Tunnel</strong> gratuito) e la Secret Key impostata.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Indirizzo / URL Proxmox Agent
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="es. https://proxmox-bot-agent.tuodominio.it oppure http://192.168.1.50:4000"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-xs font-mono text-white placeholder-zinc-500 outline-none focus:border-indigo-500"
            />
            <p className="text-[10px] text-zinc-500 mt-1">
              Lascia vuoto se stai eseguendo la dashboard direttamente dentro Proxmox in locale.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Agent Secret Key (Chiave di Sicurezza)
            </label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="es. proxmox_discord_secret_2026"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-xs font-mono text-white placeholder-zinc-500 outline-none focus:border-indigo-500"
            />
          </div>

          {testResult && (
            <div
              className={`rounded-xl border p-3 text-xs flex items-center gap-2 ${
                testResult.success
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-300"
              }`}
            >
              {testResult.success ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800/80 pt-4">
          <button
            type="button"
            onClick={handleResetToLocal}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            Ripristina Locale
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isTesting || !url.trim()}
              onClick={handleTest}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/80 px-3.5 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isTesting ? "animate-spin" : ""}`} />
              Test Connessione
            </button>
            <ShimmerButton onClick={handleSave} className="h-9 px-4 text-xs">
              <Check className="h-3.5 w-3.5 mr-1" />
              Salva e Collega
            </ShimmerButton>
          </div>
        </div>
      </div>
    </div>
  );
};

