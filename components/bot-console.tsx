"use client";
import React, { useEffect, useRef, useState } from "react";
import { BotState } from "@/lib/types";
import { Terminal, Send, Trash2, Download, Play, Square, RotateCw, ArrowDown } from "lucide-react";
import { StatusBadge } from "./ui/status-badge";
import { formatBytes, formatUptime } from "@/lib/utils";

import { ApiClient } from "@/lib/api-client";

interface BotConsoleProps {
  bot: BotState;
  onPowerAction: (action: "start" | "stop" | "restart") => void;
  isActionLoading?: boolean;
}

export const BotConsole = ({ bot, onPowerAction, isActionLoading }: BotConsoleProps) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [inputCommand, setInputCommand] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const terminalContainerRef = useRef<HTMLDivElement>(null);

  // SSE Stream
  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectSSE = () => {
      const sseUrl = ApiClient.getLogsSseUrl(bot.id);
      eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "history") {
            setLogs(data.logs || []);
          } else if (data.type === "log") {
            setLogs((prev) => [...prev.slice(-999), data.log]);
          }
        } catch {
          // ignore parse error
        }
      };

      eventSource.onerror = () => {
        // SSE will attempt auto-reconnect
      };
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [bot.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const handleSendCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCommand.trim() || isSending) return;

    const cmd = inputCommand.trim();
    setInputCommand("");
    setIsSending(true);

    try {
      await ApiClient.sendBotInput(bot.id, cmd);
    } catch (err) {
      console.error("Failed to send command:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleClearLogs = async () => {
    setLogs([]);
    try {
      await ApiClient.clearBotLogs(bot.id);
    } catch (err) {
      console.error("Failed to clear logs:", err);
    }
  };

  const handleDownloadLogs = () => {
    const blob = new Blob([logs.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${bot.config.name}_logs_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
      {/* Console Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 bg-zinc-900/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 border border-zinc-700 text-indigo-400">
            <Terminal className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Terminale & Live Logs</span>
              <StatusBadge status={bot.status} />
            </div>
            <p className="text-xs text-zinc-400">
              Runtime: <span className="font-mono text-zinc-300">{bot.config.runtime}</span> • File:{" "}
              <span className="font-mono text-zinc-300">{bot.config.mainFile}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons & Resource badges */}
        <div className="flex items-center gap-2">
          {bot.status === "online" && (
            <div className="hidden sm:flex items-center gap-2 mr-2 text-xs font-mono text-zinc-400 bg-zinc-950 px-2.5 py-1 rounded-md border border-zinc-800">
              <span className="text-emerald-400">CPU: {bot.stats.cpu}%</span>
              <span>•</span>
              <span className="text-indigo-400">RAM: {formatBytes(bot.stats.memory)}</span>
              <span>•</span>
              <span className="text-zinc-300">{formatUptime(bot.stats.uptime)}</span>
            </div>
          )}

          {bot.status === "online" ? (
            <>
              <button
                onClick={() => onPowerAction("restart")}
                disabled={isActionLoading}
                className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
              >
                <RotateCw className={`h-3.5 w-3.5 ${isActionLoading ? "animate-spin" : ""}`} />
                Riavvia
              </button>
              <button
                onClick={() => onPowerAction("stop")}
                disabled={isActionLoading}
                className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
              >
                <Square className="h-3.5 w-3.5" />
                Arresta
              </button>
            </>
          ) : (
            <button
              onClick={() => onPowerAction("start")}
              disabled={isActionLoading || bot.status === "starting"}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Avvia Bot
            </button>
          )}

          <div className="h-4 w-px bg-zinc-800 mx-1" />

          <button
            onClick={handleClearLogs}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            title="Pulisci log"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleDownloadLogs}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            title="Scarica log completi"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Terminal Output Area */}
      <div
        ref={terminalContainerRef}
        className="relative flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed text-zinc-300 select-text bg-[#0c0d12]"
        style={{ minHeight: "360px", maxHeight: "540px" }}
      >
        {logs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-zinc-600 py-16">
            <Terminal className="h-10 w-10 mb-2 opacity-40" />
            <p>Nessun log recente disponibile.</p>
            <p className="text-[11px] text-zinc-500 mt-1">Avvia il bot per visualizzare i log in tempo reale.</p>
          </div>
        ) : (
          logs.map((log, index) => {
            const isError = log.includes("❌") || log.includes("Error") || log.includes("Exception");
            const isWarning = log.includes("⚠️") || log.includes("warn");
            const isSuccess = log.includes("✅") || log.includes("🟢") || log.includes("✨");
            const isHost = log.includes("[Host Manager]") || log.includes("[Auto-Restart]");

            let colorClass = "text-zinc-300";
            if (isError) colorClass = "text-rose-400 font-medium";
            else if (isWarning) colorClass = "text-amber-300";
            else if (isSuccess) colorClass = "text-emerald-400";
            else if (isHost) colorClass = "text-indigo-300 font-semibold";

            return (
              <div key={index} className={`whitespace-pre-wrap py-0.5 break-all hover:bg-white/[0.02] px-1 rounded ${colorClass}`}>
                {log}
              </div>
            );
          })
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Terminal Input Bar */}
      <form onSubmit={handleSendCommand} className="flex items-center gap-2 border-t border-zinc-800/80 bg-zinc-900/80 px-3 py-2">
        <span className="font-mono text-indigo-400 text-xs font-bold pl-2 select-none">{">"}</span>
        <input
          type="text"
          value={inputCommand}
          onChange={(e) => setInputCommand(e.target.value)}
          placeholder={bot.status === "online" ? "Invia input / comando alla console del bot..." : "Il bot è offline (avvialo per inviare comandi)"}
          disabled={bot.status !== "online" || isSending}
          className="flex-1 bg-transparent px-2 py-1 text-xs font-mono text-white placeholder-zinc-500 outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={bot.status !== "online" || !inputCommand.trim() || isSending}
          className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="h-3 w-3" />
          Invia
        </button>
      </form>
    </div>
  );
};

