"use client";
import React, { useEffect, useRef, useState } from "react";
import { BotState } from "@/lib/types";
import { Terminal, Send, Trash2, Download, Play, Square, RotateCw, ArrowDown, Wifi, WifiOff } from "lucide-react";
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
  const [isConnected, setIsConnected] = useState(true);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const terminalContainerRef = useRef<HTMLDivElement>(null);

  // SSE Stream with Fallback Polling
  useEffect(() => {
    let isDisposed = false;
    let eventSource: EventSource | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;

    // Immediate initial fetch and continuous polling
    const fetchLatestLogs = async () => {
      if (isDisposed) return;
      try {
        const res = await ApiClient.getBot(bot.id);
        if (res && Array.isArray(res.logs) && !isDisposed) {
          setLogs(res.logs);
          setIsConnected(true);
        }
      } catch {
        // ignore
      }
    };

    fetchLatestLogs();
    fallbackInterval = setInterval(fetchLatestLogs, 1200);

    const connectSSE = () => {
      try {
        const sseUrl = ApiClient.getLogsSseUrl(bot.id);
        eventSource = new EventSource(sseUrl);

        eventSource.onopen = () => {
          setIsConnected(true);
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "history") {
              setLogs(data.logs || []);
            } else if (data.type === "log") {
              setLogs((prev) => [...prev.slice(-999), data.log]);
            }
            setIsConnected(true);
          } catch {
            // ignore
          }
        };

        eventSource.onerror = () => {
          fetchLatestLogs();
        };
      } catch {
        fetchLatestLogs();
      }
    };

    connectSSE();

    return () => {
      isDisposed = true;
      if (eventSource) {
        eventSource.close();
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
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
    const element = document.createElement("a");
    const file = new Blob([logs.join("\n")], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${bot.config.name}-logs-${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="flex flex-col h-[580px] rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <Terminal className="h-4 w-4 text-zinc-400" />
            <span className="font-mono text-xs font-semibold text-zinc-200">
              {bot.config.name} <span className="text-zinc-500">({bot.config.runtime})</span>
            </span>
          </div>
          <StatusBadge status={bot.status} />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {bot.status === "offline" || bot.status === "error" ? (
            <button
              onClick={() => onPowerAction("start")}
              disabled={isActionLoading}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600/90 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Avvia
            </button>
          ) : (
            <>
              <button
                onClick={() => onPowerAction("restart")}
                disabled={isActionLoading}
                className="flex items-center gap-1.5 rounded-lg bg-amber-600/20 text-amber-300 border border-amber-500/30 px-3 py-1.5 text-xs font-medium hover:bg-amber-600/30 disabled:opacity-50"
              >
                <RotateCw className={`h-3.5 w-3.5 ${isActionLoading ? "animate-spin" : ""}`} />
                Riavvia
              </button>
              <button
                onClick={() => onPowerAction("stop")}
                disabled={isActionLoading}
                className="flex items-center gap-1.5 rounded-lg bg-rose-600/20 text-rose-300 border border-rose-500/30 px-3 py-1.5 text-xs font-medium hover:bg-rose-600/30 disabled:opacity-50"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                Arresta
              </button>
            </>
          )}

          <div className="h-4 w-px bg-zinc-800 mx-1" />

          <button
            onClick={handleClearLogs}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            title="Pulisci console"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleDownloadLogs}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            title="Scarica log"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Terminal View */}
      <div
        ref={terminalContainerRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-xs text-zinc-300 bg-black/40 space-y-1 select-text selection:bg-indigo-500/40"
      >
        {logs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-zinc-600">
            <Terminal className="h-8 w-8 mb-2 opacity-30" />
            <p>Nessun log disponibile.</p>
            <p className="text-[11px] text-zinc-500">Avvia il bot per visualizzare l'output in tempo reale.</p>
          </div>
        ) : (
          logs.map((log, index) => {
            let textColor = "text-zinc-300";
            if (log.includes("❌") || log.includes("Error") || log.includes("Exception") || log.includes("Traceback")) {
              textColor = "text-rose-400";
            } else if (log.includes("⚠️") || log.includes("Warn")) {
              textColor = "text-amber-400";
            } else if (log.includes("🟢") || log.includes("pronto") || log.includes("Logged in as") || log.includes("success")) {
              textColor = "text-emerald-400";
            } else if (log.includes("🔄") || log.includes("⚡")) {
              textColor = "text-cyan-400";
            } else if (log.startsWith("⌨️ >")) {
              textColor = "text-purple-400 font-bold";
            }

            return (
              <div key={index} className={`leading-relaxed break-all font-mono ${textColor}`}>
                {log}
              </div>
            );
          })
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Terminal Footer & Input */}
      <div className="border-t border-zinc-800/80 bg-zinc-900/30 p-2.5 flex items-center gap-2">
        <form onSubmit={handleSendCommand} className="flex flex-1 items-center gap-2">
          <span className="font-mono text-xs text-indigo-400 pl-2 select-none">&gt;</span>
          <input
            type="text"
            value={inputCommand}
            onChange={(e) => setInputCommand(e.target.value)}
            disabled={bot.status !== "online" || isSending}
            placeholder={
              bot.status === "online"
                ? "Invia comando stdin al bot..."
                : "Il bot deve essere online per inviare comandi..."
            }
            className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 outline-none font-mono disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={bot.status !== "online" || !inputCommand.trim() || isSending}
            className="rounded-lg bg-indigo-600/80 p-1.5 text-white hover:bg-indigo-500 disabled:opacity-30 transition-all"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
