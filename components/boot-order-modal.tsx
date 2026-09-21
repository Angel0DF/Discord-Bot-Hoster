"use client";
import React, { useState, useEffect } from "react";
import { BotState } from "@/lib/types";
import { ApiClient } from "@/lib/api-client";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock,
  Play,
  Save,
  X,
  Bot as BotIcon,
  Check,
  Sparkles,
} from "lucide-react";

interface BootOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  bots: BotState[];
  onBotsUpdated: () => void;
}

interface OrderItem {
  id: string;
  name: string;
  runtime: string;
  bootOrder: number;
  startDelay: number;
  status: string;
}

export const BootOrderModal = ({
  isOpen,
  onClose,
  bots,
  onBotsUpdated,
}: BootOrderModalProps) => {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isStartingAll, setIsStartingAll] = useState(false);
  const [saved, setSaved] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Sort existing bots by bootOrder or index
      const sorted = [...bots].sort((a, b) => {
        const orderA = a.config.bootOrder ?? 999;
        const orderB = b.config.bootOrder ?? 999;
        return orderA - orderB;
      });

      setItems(
        sorted.map((b, idx) => ({
          id: b.id,
          name: b.config.name,
          runtime: b.config.runtime,
          bootOrder: b.config.bootOrder ?? idx + 1,
          startDelay: b.config.startDelay ?? (idx === 0 ? 0 : 5),
          status: b.status,
        }))
      );
    }
  }, [isOpen, bots]);

  if (!isOpen) return null;

  const moveItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);

    // Re-index bootOrder
    const reindexed = next.map((item, idx) => ({
      ...item,
      bootOrder: idx + 1,
    }));

    setItems(reindexed);
  };

  const updateDelay = (id: string, delay: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, startDelay: Math.max(0, delay) } : item))
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setFeedbackMsg(null);
    try {
      const payload = items.map((item, idx) => ({
        id: item.id,
        bootOrder: idx + 1,
        startDelay: item.startDelay,
      }));

      const res = await ApiClient.reorderBots(payload);
      if (res.success) {
        setSaved(true);
        setFeedbackMsg("Ordine di avvio salvato con successo!");
        onBotsUpdated();
        setTimeout(() => {
          setSaved(false);
          setFeedbackMsg(null);
        }, 3000);
      } else {
        setFeedbackMsg(res.error || "Errore durante il salvataggio");
      }
    } catch (err: any) {
      setFeedbackMsg(err.message || "Errore di connessione");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartAll = async () => {
    setIsStartingAll(true);
    try {
      await handleSave();
      await ApiClient.startAllInOrder();
      setFeedbackMsg("Avvio sequenziale iniziato con successo!");
      setTimeout(() => {
        onBotsUpdated();
        onClose();
      }, 1500);
    } catch (err: any) {
      setFeedbackMsg(err.message || "Errore nell'avvio sequenziale");
    } finally {
      setIsStartingAll(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <ArrowUpDown className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Ordine di Avvio Bot (Sequenza Boot)
              </h2>
              <p className="text-xs text-zinc-400">
                Imposta l'ordine di partenza dei bot al riavvio del server Proxmox.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tip banner */}
        <div className="mb-5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3.5 text-xs text-indigo-200 flex items-start gap-2.5">
          <Sparkles className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong>Consiglio:</strong> Posiziona <strong>Lavalink</strong> al <strong>#1</strong> con <strong>0s di ritardo</strong>, e il tuo bot musicale <strong>MBOT</strong> al <strong>#2</strong> con <strong>5-10s di ritardo</strong> per consentire al server audio di avviarsi prima del bot.
          </p>
        </div>

        {/* Bot List */}
        <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
          {items.length === 0 ? (
            <p className="text-center text-xs text-zinc-500 py-6">Nessun bot presente.</p>
          ) : (
            items.map((item, index) => {
              const isFirst = index === 0;
              const isLast = index === items.length - 1;

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3 hover:border-zinc-700 transition-colors"
                >
                  {/* Position number & icon */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 font-mono text-xs font-bold text-white border border-zinc-700/50">
                      #{index + 1}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{item.name}</span>
                        <span className="text-[10px] font-mono uppercase text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                          {item.runtime}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-mono">ID: {item.id}</p>
                    </div>
                  </div>

                  {/* Delay & Controls */}
                  <div className="flex items-center gap-3">
                    {/* Startup delay control */}
                    <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                      <Clock className="h-3.5 w-3.5 text-zinc-500" />
                      <span className="text-[11px] text-zinc-400">Attesa:</span>
                      <input
                        type="number"
                        min={0}
                        max={180}
                        value={item.startDelay}
                        onChange={(e) => updateDelay(item.id, Number(e.target.value))}
                        className="w-12 bg-transparent text-center text-xs font-mono font-bold text-white outline-none"
                      />
                      <span className="text-[11px] text-zinc-500">s</span>
                    </div>

                    {/* Up / Down arrows */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => moveItem(index, "up")}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Sposta su"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => moveItem(index, "down")}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Sposta giù"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Feedback message */}
        {feedbackMsg && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-300 text-center">
            {feedbackMsg}
          </div>
        )}

        {/* Footer actions */}
        <div className="mt-6 flex items-center justify-between border-t border-zinc-800/80 pt-4">
          <button
            type="button"
            onClick={handleStartAll}
            disabled={isStartingAll || items.length === 0}
            className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-600/20 px-4 py-2.5 text-xs font-medium text-emerald-300 hover:bg-emerald-600/30 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>{isStartingAll ? "Avvio in corso..." : "Avvia Tutti in Sequenza"}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Chiudi
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || items.length === 0}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              {saved ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Salvato!</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Salva Sequenza</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
