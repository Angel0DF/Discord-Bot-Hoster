"use client";
import React, { useState } from "react";
import { Server, Copy, Check, Terminal, ExternalLink, ShieldCheck, Cpu, Globe, Cloud } from "lucide-react";
import { GlowingCard } from "./ui/glowing-card";

export const ProxmoxSetupGuide = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const agentInstallScript = `# 1. Accedi alla Shell del tuo container LXC Debian 12 / Ubuntu 24.04 in Proxmox:
# 2. Clona ed installa l'Agent in un solo comando:

cd /opt
git clone <URL_DEL_TUO_REPO> bot-hoster
cd bot-hoster/agent

chmod +x install-agent.sh
./install-agent.sh proxmox_discord_secret_2026
`;

  const cloudflareTunnelScript = `# 1. Installa cloudflared nel container LXC Proxmox:
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg -i cloudflared.deb

# 2. Crea un tunnel gratuito verso la porta dell'Agent (4000):
cloudflared tunnel --url http://localhost:4000

# Copia l'URL generato (es. https://xyz.trycloudflare.com) 
# e inseriscilo nella dashboard Netlify!
`;

  return (
    <div className="space-y-6">
      <GlowingCard glowColor="indigo" className="p-6">
        <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-4 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Guida Rapida: Netlify + Server Proxmox VE</h3>
            <p className="text-xs text-zinc-400">
              Hostare il frontend su Netlify e collegarlo in totale sicurezza al tuo server casalingo Proxmox.
            </p>
          </div>
        </div>

        {/* 3 Steps Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold mb-1">
              <Cloud className="h-4 w-4" />
              Passo 1: Deploy su Netlify
            </div>
            <p className="text-[11px] text-zinc-400">
              Collega questo repository GitHub al tuo account Netlify (o fai drag & drop della build). Netlify userà il file <code>netlify.toml</code> già configurato.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold mb-1">
              <Cpu className="h-4 w-4" />
              Passo 2: Avvia l'Agent su Proxmox
            </div>
            <p className="text-[11px] text-zinc-400">
              Installa l'Agent leggero nel tuo container LXC Proxmox: eseguirà i tuoi bot Discord h24 con auto-restart.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
              <ShieldCheck className="h-4 w-4" />
              Passo 3: Connetti Sicuro (Tunnel)
            </div>
            <p className="text-[11px] text-zinc-400">
              Usa un Cloudflare Tunnel gratuito o DuckDNS per collegare Netlify all'Agent senza dover aprire porte sul router di casa.
            </p>
          </div>
        </div>

        {/* Proxmox Agent LXC Script */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300">
              1. Script Installazione Proxmox Agent (Container LXC)
            </span>
            <button
              onClick={() => copyToClipboard(agentInstallScript, 1)}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              {copiedIndex === 1 ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  Copiato!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copia Script
                </>
              )}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-300 leading-relaxed">
            {agentInstallScript}
          </pre>
        </div>

        {/* Cloudflare Tunnel snippet */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300">
              2. Connessione Sicura Cloudflare Tunnel (Zero porte da aprire sul modem)
            </span>
            <button
              onClick={() => copyToClipboard(cloudflareTunnelScript, 2)}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              {copiedIndex === 2 ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  Copiato!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copia
                </>
              )}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-300 leading-relaxed">
            {cloudflareTunnelScript}
          </pre>
        </div>
      </GlowingCard>
    </div>
  );
};
