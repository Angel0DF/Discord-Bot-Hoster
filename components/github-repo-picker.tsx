"use client";
import React, { useState, useEffect } from "react";
import { GitBranch, Lock, Globe, Search, RefreshCw, Check, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { GitHubRepo, GitHubAccount } from "@/lib/types";
import { getStoredGitHubAccount, fetchUserRepos, buildAuthenticatedRepoUrl } from "@/lib/github";

interface GitHubRepoPickerProps {
  selectedRepoUrl?: string;
  selectedBranch?: string;
  onSelect: (data: {
    repoUrl: string;
    branch: string;
    repoName: string;
    description: string;
    runtime: "nodejs" | "python" | "bun" | "custom";
    isPrivate: boolean;
  }) => void;
  onOpenConnectModal?: () => void;
}

export const GitHubRepoPicker = ({
  selectedRepoUrl,
  selectedBranch = "main",
  onSelect,
  onOpenConnectModal,
}: GitHubRepoPickerProps) => {
  const [account, setAccount] = useState<GitHubAccount | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");

  const loadAccountAndRepos = async () => {
    const acc = getStoredGitHubAccount();
    setAccount(acc);
    if (acc) {
      setIsLoading(true);
      setError("");
      try {
        const res = await fetchUserRepos(acc.token);
        if (res.success) {
          setRepos(res.repos);
        } else {
          setError(res.error || "Errore nel caricamento dei repository");
        }
      } catch (err: any) {
        setError(err.message || "Errore di connessione");
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadAccountAndRepos();
  }, []);

  const filteredRepos = repos.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedRepo = repos.find(
    (r) =>
      selectedRepoUrl &&
      (selectedRepoUrl.includes(r.full_name) || selectedRepoUrl.includes(r.clone_url))
  );

  const handleSelectRepo = (repo: GitHubRepo) => {
    const authUrl = buildAuthenticatedRepoUrl(repo.full_name, account?.token);
    
    // Auto-detect runtime from repository primary language
    let runtime: "nodejs" | "python" | "bun" | "custom" = "nodejs";
    if (repo.language?.toLowerCase() === "python") {
      runtime = "python";
    }

    onSelect({
      repoUrl: authUrl,
      branch: repo.default_branch || "main",
      repoName: repo.name,
      description: repo.description || "",
      runtime,
      isPrivate: repo.private,
    });
    setIsOpen(false);
  };

  if (!account) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-dashed border-purple-500/30 bg-purple-950/20 p-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <GitBranch className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">Collega il tuo Account GitHub</p>
            <p className="text-[11px] text-zinc-400">
              Visualizza e clona direttamente tutti i tuoi repository (inclusi quelli privati).
            </p>
          </div>
        </div>

        {onOpenConnectModal && (
          <button
            type="button"
            onClick={onOpenConnectModal}
            className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-500 transition-colors cursor-pointer shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Collega GitHub</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
          <GitBranch className="h-3.5 w-3.5 text-purple-400" />
          Seleziona dal tuo GitHub (@{account.username})
        </span>
        <button
          type="button"
          onClick={loadAccountAndRepos}
          disabled={isLoading}
          className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 cursor-pointer"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          <span>Aggiorna lista</span>
        </button>
      </div>

      {/* Selected Repository Trigger Box */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/90 px-3.5 py-2.5 text-xs text-white hover:border-purple-500/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 truncate">
            {selectedRepo ? (
              <>
                {selectedRepo.private ? (
                  <Lock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                ) : (
                  <Globe className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                )}
                <span className="font-bold text-white truncate">{selectedRepo.full_name}</span>
                <span className="rounded bg-zinc-800 px-1.5 py-0.2 font-mono text-[10px] text-zinc-400">
                  {selectedBranch || selectedRepo.default_branch}
                </span>
              </>
            ) : (
              <span className="text-zinc-500">Scegli un repository dal menu a tendina...</span>
            )}
          </div>
          {isOpen ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1.5 rounded-xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl backdrop-blur-xl animate-fadeIn space-y-2">
            {/* Search filter */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca tra i tuoi repository..."
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/90 py-1.5 pl-8 pr-3 text-xs text-white placeholder-zinc-500 outline-none focus:border-purple-500"
                autoFocus
              />
            </div>

            {/* List */}
            <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
              {isLoading ? (
                <div className="py-6 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-purple-400" />
                  Caricamento repository...
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="py-4 text-center text-xs text-zinc-500">
                  Nessun repository trovato
                </div>
              ) : (
                filteredRepos.map((repo) => {
                  const isSelected = selectedRepo?.id === repo.id;
                  return (
                    <div
                      key={repo.id}
                      onClick={() => handleSelectRepo(repo)}
                      className={`flex items-center justify-between rounded-lg p-2 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-purple-600/20 text-white border border-purple-500/40"
                          : "hover:bg-zinc-900 text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {repo.private ? (
                          <span title="Repository Privato">
                            <Lock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          </span>
                        ) : (
                          <span title="Repository Pubblico">
                            <Globe className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                          </span>
                        )}
                        <span className="font-semibold text-xs text-white truncate">{repo.name}</span>
                        {repo.language && (
                          <span className="text-[10px] text-zinc-500 font-mono">({repo.language})</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-zinc-500 font-mono">
                          branch: {repo.default_branch}
                        </span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-purple-400" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
