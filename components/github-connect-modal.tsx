"use client";
import React, { useState, useEffect } from "react";
import { GitBranch, X, Check, KeyRound, ExternalLink, LogOut, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { GitHubAccount } from "@/lib/types";
import { getStoredGitHubAccount, setStoredGitHubAccount, validateAndConnectGitHub } from "@/lib/github";
import { ShimmerButton } from "./ui/shimmer-button";

interface GitHubConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountChanged?: (account: GitHubAccount | null) => void;
}

export const GitHubConnectModal = ({
  isOpen,
  onClose,
  onAccountChanged,
}: GitHubConnectModalProps) => {
  const [account, setAccount] = useState<GitHubAccount | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredGitHubAccount();
      setAccount(stored);
      setTokenInput("");
      setError("");
      setSuccessMsg("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setError("Inserisci il tuo Personal Access Token di GitHub");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await validateAndConnectGitHub(tokenInput);
      if (res.success && res.account) {
        setAccount(res.account);
        setSuccessMsg(`Account @${res.account.username} collegato con successo!`);
        if (onAccountChanged) onAccountChanged(res.account);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setError(res.error || "Impossibile validare il token");
      }
    } catch (err: any) {
      setError(err.message || "Errore di connessione");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    setStoredGitHubAccount(null);
    setAccount(null);
    setTokenInput("");
    if (onAccountChanged) onAccountChanged(null);
  };

  const tokenCreationUrl =
    "https://github.com/settings/tokens/new?scopes=repo&description=Discord+Bot+Hoster";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-5">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <GitBranch className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Integrazione Account GitHub</h2>
            <p className="text-xs text-zinc-400">
              Collega il tuo profilo per selezionare e clonare i tuoi bot (anche privati) con 1 click.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center gap-2">
            <Check className="h-4 w-4" />
            {successMsg}
          </div>
        )}

        {account ? (
          /* Connected State */
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
              <div className="flex items-center gap-3">
                {account.avatar_url ? (
                  <img
                    src={account.avatar_url}
                    alt={account.username}
                    className="h-11 w-11 rounded-full border border-emerald-500/40"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                    {account.username.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{account.name || account.username}</span>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
                      Connesso
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">@{account.username}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDisconnect}
                className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Disconnetti</span>
              </button>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5 text-xs text-zinc-300 space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <ShieldCheck className="h-4 w-4" />
                Accesso Repository Attivo
              </div>
              <p className="text-[11px] text-zinc-400">
                Ora puoi selezionare tutti i tuoi repository (sia pubblici che privati) direttamente dalla lista a tendina quando crei o configuri un bot.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-zinc-800 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                Chiudi
              </button>
            </div>
          </div>
        ) : (
          /* Connect Form */
          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                GitHub Personal Access Token (Classic)
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-xs font-mono text-white placeholder-zinc-500 outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3.5 space-y-2 text-xs text-zinc-300">
              <p className="font-semibold text-purple-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Come ottenere il token in 1 click:
              </p>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Clicca sul link qui sotto: aprirà GitHub con il permesso <code>repo</code> già selezionato. Clicca <b>"Generate token"</b> in fondo e incollalo qui.
              </p>
              <a
                href={tokenCreationUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-400 hover:text-purple-300 underline"
              >
                <span>Genera Token su GitHub</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white cursor-pointer"
              >
                Annulla
              </button>
              <ShimmerButton
                type="submit"
                disabled={isLoading || !tokenInput.trim()}
                className="h-10 px-5 text-xs cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                    Verifica in corso...
                  </>
                ) : (
                  <>
                    <GitBranch className="h-4 w-4 mr-2" />
                    Collega Account
                  </>
                )}
              </ShimmerButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
