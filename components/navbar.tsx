"use client";
import React, { useState, useEffect } from "react";
import { Server, Bot, Plus, RefreshCw, Wifi, WifiOff, Globe, GitBranch } from "lucide-react";
import { ShimmerButton } from "./ui/shimmer-button";
import { getStoredGitHubAccount } from "@/lib/github";
import { GitHubAccount } from "@/lib/types";

interface NavbarProps {
  onOpenCreateModal: () => void;
  onOpenConnectionModal?: () => void;
  onOpenGitHubModal?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isConnected?: boolean;
  isRemote?: boolean;
}

export const Navbar = ({
  onOpenCreateModal,
  onOpenConnectionModal,
  onOpenGitHubModal,
  onRefresh,
  isRefreshing,
  isConnected = true,
  isRemote = false,
}: NavbarProps) => {
  const [gitAccount, setGitAccount] = useState<GitHubAccount | null>(null);

  useEffect(() => {
    setGitAccount(getStoredGitHubAccount());
  }, [isRefreshing]);
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-discord-blurple to-purple-500 p-0.5 shadow-lg shadow-indigo-500/20">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-zinc-950">
              <Bot className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-zinc-950">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-white">
                Proxmox <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Bot Host</span>
              </span>
            </div>
            <p className="text-xs text-zinc-400">Discord Bot Self-Hosting Panel</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          {/* GitHub Account Connect Button */}
          {onOpenGitHubModal && (
            <button
              type="button"
              onClick={onOpenGitHubModal}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                gitAccount
                  ? "border-purple-500/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20"
                  : "border-zinc-700/80 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200"
              }`}
              title={gitAccount ? `Connesso come @${gitAccount.username}` : "Collega Account GitHub"}
            >
              {gitAccount?.avatar_url ? (
                <img
                  src={gitAccount.avatar_url}
                  alt={gitAccount.username}
                  className="h-4 w-4 rounded-full"
                />
              ) : (
                <GitBranch className="h-3.5 w-3.5 text-purple-400" />
              )}
              <span className="hidden sm:inline">
                {gitAccount ? `@${gitAccount.username}` : "GitHub"}
              </span>
            </button>
          )}

          {/* Proxmox Connection Button */}
          {onOpenConnectionModal && (
            <button
              type="button"
              onClick={onOpenConnectionModal}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                isConnected
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
              }`}
              title="Configura connessione Proxmox Agent"
            >
              {isConnected ? (
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
              ) : (
                <WifiOff className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {isRemote ? "Proxmox Remoto" : "Proxmox Locale"}
              </span>
              <span className="text-[10px] opacity-70">⚙️</span>
            </button>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-white cursor-pointer"
              title="Aggiorna stato"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-indigo-400" : ""}`} />
            </button>
          )}

          <ShimmerButton type="button" onClick={onOpenCreateModal} className="h-9 px-3.5 text-xs sm:text-sm cursor-pointer">
            <Plus className="h-4 w-4 mr-1.5 text-indigo-300" />
            Nuovo Bot
          </ShimmerButton>
        </div>
      </div>
    </header>
  );
};
