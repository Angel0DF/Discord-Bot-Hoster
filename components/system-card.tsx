"use client";
import React from "react";
import { SystemStats } from "@/lib/types";
import { GlowingCard } from "./ui/glowing-card";
import { Cpu, HardDrive, Clock, Server, Layers, Activity } from "lucide-react";
import { formatBytes, formatUptime } from "@/lib/utils";

interface SystemCardProps {
  stats: SystemStats | null;
  totalBots: number;
  onlineBots: number;
}

export const SystemCard = ({ stats, totalBots, onlineBots }: SystemCardProps) => {
  const cpuPercent = stats?.cpuUsage ?? 0;
  const memPercent = stats?.memUsagePercent ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Bot Status Summary */}
      <GlowingCard glowColor="indigo" className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-400">Bot Discord Attivi</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{onlineBots}</span>
              <span className="text-xs text-zinc-500">/ {totalBots} configurati</span>
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Layers className="h-6 w-6" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${onlineBots > 0 ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
          <span className="text-xs font-medium text-zinc-400">
            {onlineBots > 0 ? `${onlineBots} bot online su Proxmox` : "Nessun bot attivo"}
          </span>
        </div>
      </GlowingCard>

      {/* CPU Usage */}
      <GlowingCard glowColor="purple" className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-400">Utilizzo CPU Host</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{cpuPercent}%</span>
              <span className="text-xs text-zinc-500">({stats?.cpuCores ?? 1} Core)</span>
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Cpu className="h-6 w-6" />
          </div>
        </div>
        <div className="mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full transition-all duration-500 ${
                cpuPercent > 80 ? "bg-rose-500" : cpuPercent > 50 ? "bg-amber-500" : "bg-gradient-to-r from-indigo-500 to-purple-500"
              }`}
              style={{ width: `${Math.min(100, Math.max(2, cpuPercent))}%` }}
            />
          </div>
        </div>
      </GlowingCard>

      {/* Memory Usage */}
      <GlowingCard glowColor="emerald" className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-400">RAM Utilizzata</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{memPercent}%</span>
              <span className="text-xs text-zinc-500">
                {stats ? `${formatBytes(stats.usedMem)} / ${formatBytes(stats.totalMem)}` : "..."}
              </span>
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <HardDrive className="h-6 w-6" />
          </div>
        </div>
        <div className="mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full transition-all duration-500 ${
                memPercent > 85 ? "bg-rose-500" : memPercent > 65 ? "bg-amber-500" : "bg-gradient-to-r from-emerald-500 to-teal-400"
              }`}
              style={{ width: `${Math.min(100, Math.max(2, memPercent))}%` }}
            />
          </div>
        </div>
      </GlowingCard>

      {/* Host Node & Uptime */}
      <GlowingCard glowColor="blue" className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-400">Nodo / Server</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-lg font-bold text-white truncate max-w-[140px]" title={stats?.hostname}>
                {stats?.hostname || "Proxmox Host"}
              </span>
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Server className="h-6 w-6" />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-zinc-400">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-zinc-500" />
            Uptime:
          </span>
          <span className="font-mono text-zinc-300">
            {stats ? formatUptime(stats.uptime) : "..."}
          </span>
        </div>
      </GlowingCard>
    </div>
  );
};

