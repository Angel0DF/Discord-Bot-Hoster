"use client";
import React, { useState, useEffect } from "react";
import { GitBranch, GitPullRequest, RefreshCw, CheckCircle2, AlertCircle, Copy, Check, ExternalLink, Webhook, ArrowUpRight } from "lucide-react";
import { GitSyncStatus } from "@/lib/types";
import { ApiClient } from "@/lib/api-client";

interface GitHubSyncWidgetProps {
  botId: string;
  initialGitStatus?: GitSyncStatus;
  gitRepo?: string;
  gitBranch?: string;
  onSyncComplete?: () => void;
}

export const GitHubSyncWidget = ({
  botId,
  initialGitStatus,
  gitRepo,
  gitBranch = "main",
  onSyncComplete,
}: GitHubSyncWidgetProps) => {
  const [gitStatus, setGitStatus] = useState<GitSyncStatus | null>(initialGitStatus || null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setIsChecking(true);
      const res = await ApiClient.getGitStatus(botId);
      if (res && res.success && res.gitStatus) {
        setGitStatus(res.gitStatus);
      }
    } catch (err) {
      console.error("Failed to check Git status:", err);
    } finally {
      setIsChecking(false);
    }
  };

  // Poll git status every 6 seconds to detect new commits in real-time
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 6000);
    return () => clearInterval(interval);
  }, [botId]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await ApiClient.pullGit(botId);
      if (res && res.success) {
        setSyncFeedback("Sincronizzato con successo!");
        if (res.gitStatus) setGitStatus(res.gitStatus);
        if (onSyncComplete) onSyncComplete();
      } else {
        setSyncFeedback(res?.error || "Errore sincronizzazione");
      }
    } catch (err: any) {
      setSyncFeedback(err.message || "Errore di connessione");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  // Construct Webhook URL
  const getWebhookUrl = () => {
    if (typeof window === "undefined") return "";
    const agentUrl = ApiClient.getAgentUrl();
    const base = agentUrl ? agentUrl.replace(/\/$/, "") : window.location.origin;
    return `${base}/api/bots/${botId}/webhook`;
  };

  const webhookUrl = getWebhookUrl();

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  if (!gitStatus || !gitStatus.isGit) {
    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-purple-500/30 bg-purple-950/20 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-400">
              <GitBranch className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white">Collega Repository GitHub</span>
                <span className="rounded bg-purple-500/20 px-1.5 py-0.5 font-mono text-[10px] text-purple-300 border border-purple-500/30">
                  Pronto per Auto-Deploy
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Vai nella scheda <b>Impostazioni</b> per inserire l'URL di GitHub, oppure usa il <b>Webhook</b> qui a destra.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowWebhookModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-600/30 px-3 py-1.5 text-xs font-semibold text-purple-200 hover:bg-purple-600/50 transition-colors shadow-sm cursor-pointer"
            >
              <Webhook className="h-3.5 w-3.5 text-purple-300" />
              <span>Copia Link Webhook</span>
            </button>
          </div>
        </div>

        {/* Webhook Configuration Modal */}
        {showWebhookModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Webhook className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">GitHub Webhook (Auto-Deploy)</h3>
                    <p className="text-xs text-zinc-400">Aggiorna e riavvia il bot in automatico a ogni git push</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWebhookModal(false)}
                  className="text-xs text-zinc-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs text-zinc-300">
                <p>
                  1. Vai sul tuo repository su <b>GitHub &gt; Settings &gt; Webhooks &gt; Add webhook</b>.
                </p>
                <p>
                  2. Incolla questo <b>Payload URL</b>:
                </p>

                <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 p-2.5">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="w-full bg-transparent font-mono text-xs text-indigo-300 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyWebhook}
                    className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shrink-0 cursor-pointer"
                  >
                    {copiedWebhook ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedWebhook ? "Copiato!" : "Copia"}
                  </button>
                </div>

                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 space-y-1 text-zinc-400">
                  <p>• <b>Content type:</b> <code className="text-white">application/json</code></p>
                  <p>• <b>Which events would you like to trigger:</b> <code className="text-white">Just the push event.</code></p>
                  <p>• <b>Active:</b> <code className="text-emerald-400">Spuntato (Attivo)</code></p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowWebhookModal(false)}
                  className="rounded-lg bg-zinc-800 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  const isUpToDate = gitStatus?.synced;
  const hasUpdate = gitStatus?.isGit && !gitStatus?.synced;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-2.5 backdrop-blur-md">
        {/* Left info: Branch & Commit */}
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
            hasUpdate 
              ? "bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse" 
              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          }`}>
            <GitBranch className="h-4 w-4" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">GitHub Sync</span>
              <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                {gitStatus?.branch || gitBranch}
              </span>

              {/* Status Badge */}
              {hasUpdate ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                  Aggiornamento disponibile
                </span>
              ) : isUpToDate ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="h-3 w-3" />
                  Sincronizzato
                </span>
              ) : null}
            </div>

            {/* Commit Message & SHA */}
            <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
              {gitStatus?.localCommitShort && (
                <span className="font-mono text-zinc-300 font-medium">
                  #{gitStatus.localCommitShort}
                </span>
              )}
              {gitStatus?.localMessage && (
                <span className="truncate max-w-[280px] text-zinc-400" title={gitStatus.localMessage}>
                  {gitStatus.localMessage}
                </span>
              )}
              {hasUpdate && gitStatus?.remoteCommitShort && (
                <span className="text-amber-400/90 font-mono text-[10px]">
                  (Nuovo: #{gitStatus.remoteCommitShort})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right buttons */}
        <div className="flex items-center gap-2">
          {syncFeedback && (
            <span className="text-[11px] font-medium text-indigo-300 mr-1 animate-fadeIn">
              {syncFeedback}
            </span>
          )}

          <button
            type="button"
            onClick={fetchStatus}
            disabled={isChecking}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            title="Verifica aggiornamenti su GitHub"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? "animate-spin text-indigo-400" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowWebhookModal(true)}
            className="flex items-center gap-1 rounded-lg border border-zinc-700/80 bg-zinc-800/60 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
            title="Configura Auto-Deploy Webhook"
          >
            <Webhook className="h-3 w-3 text-purple-400" />
            <span className="hidden sm:inline">Webhook</span>
          </button>

          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-md transition-all ${
              hasUpdate
                ? "bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20 font-bold scale-105"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20"
            } disabled:opacity-50`}
          >
            <GitPullRequest className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing
              ? "Sincronizzazione..."
              : hasUpdate
              ? "Sincronizza Ora!"
              : "Sincronizza"}
          </button>
        </div>
      </div>

      {/* Webhook Configuration Modal */}
      {showWebhookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Webhook className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">GitHub Webhook (Auto-Deploy)</h3>
                  <p className="text-xs text-zinc-400">Aggiorna e riavvia il bot in automatico a ogni git push</p>
                </div>
              </div>
              <button
                onClick={() => setShowWebhookModal(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-300">
              <p>
                1. Vai sul tuo repository su <b>GitHub &gt; Settings &gt; Webhooks &gt; Add webhook</b>.
              </p>
              <p>
                2. Incolla questo <b>Payload URL</b>:
              </p>

              <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 p-2.5">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="w-full bg-transparent font-mono text-xs text-indigo-300 outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyWebhook}
                  className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shrink-0"
                >
                  {copiedWebhook ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiedWebhook ? "Copiato!" : "Copia"}
                </button>
              </div>

              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 space-y-1 text-zinc-400">
                <p>• <b>Content type:</b> <code className="text-white">application/json</code></p>
                <p>• <b>Which events would you like to trigger:</b> <code className="text-white">Just the push event.</code></p>
                <p>• <b>Active:</b> <code className="text-emerald-400">Spuntato (Attivo)</code></p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowWebhookModal(false)}
                className="rounded-lg bg-zinc-800 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
