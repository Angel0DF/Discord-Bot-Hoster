"use client";
import React from "react";
import { BotState } from "@/lib/types";
import { GlowingCard } from "./ui/glowing-card";
import { StatusBadge } from "./ui/status-badge";
import {
  Play,
  Square,
  RotateCw,
  Terminal,
  Cpu,
  HardDrive,
  Clock,
  Settings,
  Bot as BotIcon,
  ChevronRight,
} from "lucide-react";
import { formatBytes, formatUptime } from "@/lib/utils";

interface BotCardProps {
  bot: BotState;
  onSelect: (bot: BotState) => void;
  onPowerAction: (botId: string, action: "start" | "stop" | "restart") => void;
  isActionLoading?: boolean;
}

export const BotCard = ({ bot, onSelect, onPowerAction, isActionLoading }: BotCardProps) => {
  const isOnline = bot.status === "online";
  const glowColor = isOnline ? "emerald" : bot.status === "error" ? "rose" : "indigo";

  return (
    <GlowingCard
      glowColor={glowColor}
      className="flex flex-col justify-between p-5 transition-all cursor-pointer hover:border-indigo-500/50 group"
      onClick={() => onSelect(bot)}
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                isOnline
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-zinc-800/80 border-zinc-700/80 text-zinc-400"
              }`}
            >
              <BotIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-white tracking-tight text-base group-hover:text-indigo-400 transition-colors">
                {bot.config.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] font-mono uppercase text-zinc-400 bg-zinc-800/80 px-1.5 py-0.2 rounded border border-zinc-700/50">
                  {bot.config.runtime}
                </span>
                <span className="text-xs text-zinc-500 truncate max-w-[120px] font-mono">
                  {bot.config.mainFile}
                </span>
              </div>
            </div>
          </div>

          <StatusBadge status={bot.status} />
        </div>

        {/* Description if any */}
        {bot.config.description && (
          <p className="mt-3 text-xs text-zinc-400 line-clamp-2">
            {bot.config.description
              .replace(/https?:\/\/[^@]+@github\.com\/([^\s]+)/g, "$1")
              .replace(/https?:\/\/github\.com\/([^\s]+)/g, "$1")
              .replace(/\.git/g, "")}
          </p>
        )}

        {/* Real-time stats pills */}
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-zinc-950/80 p-2.5 border border-zinc-800/80">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-500">
              <Cpu className="h-3 w-3" />
              <span>CPU</span>
            </div>
            <p className="text-xs font-mono font-semibold text-zinc-200 mt-0.5">
              {isOnline ? `${bot.stats.cpu}%` : "0%"}
            </p>
          </div>

          <div className="text-center border-x border-zinc-800">
            <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-500">
              <HardDrive className="h-3 w-3" />
              <span>RAM</span>
            </div>
            <p className="text-xs font-mono font-semibold text-zinc-200 mt-0.5">
              {isOnline ? formatBytes(bot.stats.memory) : "0 B"}
            </p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-500">
              <Clock className="h-3 w-3" />
              <span>Uptime</span>
            </div>
            <p className="text-xs font-mono font-semibold text-zinc-200 mt-0.5">
              {isOnline ? formatUptime(bot.stats.uptime) : "Offline"}
            </p>
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="mt-5 flex items-center justify-between border-t border-zinc-800/80 pt-3">
        {/* Power Action Buttons */}
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {isOnline ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPowerAction(bot.id, "stop");
                }}
                disabled={isActionLoading}
                className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
                title="Arresta Bot"
              >
                <Square className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Stop</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPowerAction(bot.id, "restart");
                }}
                disabled={isActionLoading}
                className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
                title="Riavvia Bot"
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Riavvia</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPowerAction(bot.id, "start");
              }}
              disabled={isActionLoading || bot.status === "starting"}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Avvia
            </button>
          )}
        </div>

        {/* Open Bot Panel Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(bot);
          }}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-800/80 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-all hover:bg-indigo-600 hover:text-white"
        >
          <Terminal className="h-3.5 w-3.5 text-indigo-400 group-hover:text-white" />
          <span>Gestisci</span>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </GlowingCard>
  );
};

