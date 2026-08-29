"use client";
import React, { useState, useEffect } from "react";
import { BotState, SystemStats } from "@/lib/types";
import { Navbar } from "@/components/navbar";
import { SystemCard } from "@/components/system-card";
import { BotCard } from "@/components/bot-card";
import { BotDetailView } from "@/components/bot-detail-view";
import { CreateBotModal } from "@/components/create-bot-modal";
import { ConnectionModal } from "@/components/connection-modal";
import { ProxmoxSetupGuide } from "@/components/proxmox-setup-guide";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Bot, Plus, Server, Layers, Sparkles, HelpCircle, WifiOff } from "lucide-react";
import { ApiClient, getStoredAgentConfig } from "@/lib/api-client";

export default function Home() {
  const [bots, setBots] = useState<BotState[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<"bots" | "proxmox">("bots");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [isRemote, setIsRemote] = useState(false);

  const checkConnectionState = () => {
    const config = getStoredAgentConfig();
    setIsRemote(!!config.url && config.url.trim().length > 0);
  };

  const fetchBots = async () => {
    try {
      const botsList = await ApiClient.getBots();
      setBots(botsList || []);
      setIsConnected(true);
    } catch {
      setIsConnected(false);
    }
  };

  const fetchSystem = async () => {
    try {
      const stats = await ApiClient.getSystemStats();
      setSystemStats(stats);
    } catch {
      // ignore
    }
  };

  const refreshAll = async () => {
    setIsRefreshing(true);
    checkConnectionState();
    await Promise.all([fetchBots(), fetchSystem()]);
    setIsRefreshing(false);
  };

  useEffect(() => {
    refreshAll();
    const interval = setInterval(() => {
      fetchBots();
      fetchSystem();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handlePowerAction = async (botId: string, action: "start" | "stop" | "restart") => {
    setActionLoadingId(botId);
    try {
      await ApiClient.powerAction(botId, action);
      await fetchBots();
    } catch (err) {
      console.error("Power action failed:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBotCreated = (newBot: any) => {
    fetchBots();
    setSelectedBotId(newBot.id);
  };

  const handleBotDeleted = async (botId: string) => {
    try {
      await ApiClient.deleteBot(botId);
    } catch (err) {
      console.error("Delete bot error:", err);
    }
    setSelectedBotId(null);
    fetchBots();
  };

  const handleBotUpdated = (updatedBot: any) => {
    fetchBots();
  };

  const selectedBot = bots.find((b) => b.id === selectedBotId) || null;
  const onlineBotsCount = bots.filter((b) => b.status === "online").length;

  return (
    <div className="relative min-h-screen bg-[#08090d] text-zinc-100 selection:bg-indigo-500 selection:text-white">
      {/* Background visual effects */}
      <BackgroundBeams />
      <AnimatedGridPattern />

      {/* Navigation Header */}
      <Navbar
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenConnectionModal={() => setIsConnectionModalOpen(true)}
        onRefresh={refreshAll}
        isRefreshing={isRefreshing}
        isConnected={isConnected}
        isRemote={isRemote}
      />

      {/* Main Content Container */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Banner if connection to Proxmox is down */}
        {!isConnected && isRemote && (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <WifiOff className="h-5 w-5 text-amber-400 shrink-0" />
              <div>
                <p className="font-semibold text-white">Impossibile comunicare con l'Agent Proxmox</p>
                <p className="text-zinc-300 mt-0.5">
                  Verifica che il tuo server Proxmox e il tunnel siano attivi, oppure aggiorna l'URL di connessione.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsConnectionModalOpen(true)}
              className="rounded-lg bg-amber-500/20 px-3 py-1.5 font-semibold text-amber-300 hover:bg-amber-500/30 transition-colors"
            >
              Configura Connessione
            </button>
          </div>
        )}

        {selectedBot ? (
          <BotDetailView
            bot={selectedBot}
            onBack={() => setSelectedBotId(null)}
            onRefresh={fetchBots}
            onPowerAction={handlePowerAction}
            onBotUpdated={handleBotUpdated}
            onBotDeleted={handleBotDeleted}
            isActionLoading={actionLoadingId === selectedBot.id}
          />
        ) : (
          <div className="space-y-8">
            {/* Host & System Hardware Overview */}
            <SystemCard
              stats={systemStats}
              totalBots={bots.length}
              onlineBots={onlineBotsCount}
            />

            {/* Main Tabs Navigation */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveMainTab("bots")}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                    activeMainTab === "bots"
                      ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                  }`}
                >
                  <Bot className="h-4 w-4" />
                  I Tuoi Bot ({bots.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMainTab("proxmox")}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                    activeMainTab === "proxmox"
                      ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                  }`}
                >
                  <Server className="h-4 w-4" />
                  Guida Proxmox
                </button>
              </div>

              {activeMainTab === "bots" && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsConnectionModalOpen(true)}
                    className="text-xs text-zinc-400 hover:text-indigo-300 transition-colors hidden sm:block cursor-pointer"
                  >
                    ⚙️ Impostazioni Server Proxmox
                  </button>
                  {bots.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(true)}
                      className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Aggiungi Bot
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Tab Views */}
            {activeMainTab === "bots" ? (
              <div>
                {bots.length === 0 ? (
                  /* Empty state */
                  <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/50 p-12 text-center backdrop-blur-md">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4">
                      <Sparkles className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Nessun Bot Discord Configurato</h3>
                    <p className="mt-1 max-w-md text-xs text-zinc-400">
                      Inizia creando il tuo primo bot Discord in Node.js (discord.js) o Python (discord.py) con template pronti all'uso.
                    </p>
                    <ShimmerButton
                      onClick={() => setIsCreateModalOpen(true)}
                      className="mt-6 h-10 px-6 text-xs"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Crea il Tuo Primo Bot
                    </ShimmerButton>
                  </div>
                ) : (
                  /* Bot Grid */
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {bots.map((bot) => (
                      <BotCard
                        key={bot.id}
                        bot={bot}
                        onSelect={(b) => setSelectedBotId(b.id)}
                        onPowerAction={handlePowerAction}
                        isActionLoading={actionLoadingId === bot.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <ProxmoxSetupGuide />
            )}
          </div>
        )}
      </main>

      {/* Create Bot Modal */}
      <CreateBotModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onBotCreated={handleBotCreated}
      />

      {/* Proxmox Connection Settings Modal */}
      <ConnectionModal
        isOpen={isConnectionModalOpen}
        onClose={() => setIsConnectionModalOpen(false)}
        onConnectionChanged={refreshAll}
      />
    </div>
  );
}
