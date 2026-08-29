"use client";
import React, { useState } from "react";
import { BotState } from "@/lib/types";
import { BotConsole } from "./bot-console";
import { FileEditor } from "./file-editor";
import { EnvEditor } from "./env-editor";
import { BotSettings } from "./bot-settings";
import { GitHubSyncWidget } from "./github-sync-widget";
import { Terminal, FolderCode, KeyRound, Settings, ArrowLeft, Bot, RefreshCw } from "lucide-react";
import { StatusBadge } from "./ui/status-badge";

interface BotDetailViewProps {
  bot: BotState;
  onBack: () => void;
  onRefresh: () => void;
  onPowerAction: (botId: string, action: "start" | "stop" | "restart") => void;
  onBotUpdated: (updatedBot: any) => void;
  onBotDeleted: (botId: string) => void;
  isActionLoading?: boolean;
}

export const BotDetailView = ({
  bot,
  onBack,
  onRefresh,
  onPowerAction,
  onBotUpdated,
  onBotDeleted,
  isActionLoading,
}: BotDetailViewProps) => {
  const [activeTab, setActiveTab] = useState<"console" | "files" | "env" | "settings">("console");

  const tabs = [
    { id: "console", label: "Console & Logs", icon: Terminal },
    { id: "files", label: "File & Editor", icon: FolderCode },
    { id: "env", label: "Variabili & Token", icon: KeyRound },
    { id: "settings", label: "Impostazioni", icon: Settings },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Bot Detail Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-white transition-colors cursor-pointer"
            title="Torna alla Dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Bot className="h-6 w-6" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">{bot.config.name}</h1>
              <StatusBadge status={bot.status} />
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              ID: <span className="font-mono text-zinc-500">{bot.id}</span> • Runtime:{" "}
              <span className="font-mono text-indigo-300">{bot.config.runtime}</span>
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 rounded-xl bg-zinc-900/80 p-1 border border-zinc-800/80">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* GitHub Real-time Synchronization Widget */}
      <GitHubSyncWidget
        botId={bot.id}
        initialGitStatus={bot.gitStatus}
        gitRepo={bot.config.gitRepo}
        gitBranch={bot.config.gitBranch}
        onSyncComplete={onRefresh}
      />

      {/* Tab Content */}
      {activeTab === "console" && (
        <BotConsole
          bot={bot}
          onPowerAction={(action) => onPowerAction(bot.id, action)}
          isActionLoading={isActionLoading}
        />
      )}

      {activeTab === "files" && <FileEditor botId={bot.id} botName={bot.config.name} />}

      {activeTab === "env" && (
        <EnvEditor
          botId={bot.id}
          initialEnv={bot.config.env}
          onSaveSuccess={onRefresh}
        />
      )}

      {activeTab === "settings" && (
        <BotSettings
          bot={bot}
          onUpdate={onBotUpdated}
          onDelete={() => onBotDeleted(bot.id)}
        />
      )}
    </div>
  );
};

