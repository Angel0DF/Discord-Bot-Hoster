"use client";
import React from "react";
import { BotStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: BotStatus;
  className?: string;
  showDot?: boolean;
}

export const StatusBadge = ({ status, className, showDot = true }: StatusBadgeProps) => {
  const configs = {
    online: {
      label: "Online",
      bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse",
    },
    offline: {
      label: "Offline",
      bg: "bg-zinc-800/60 text-zinc-400 border-zinc-700/50",
      dot: "bg-zinc-500",
    },
    starting: {
      label: "Avvio...",
      bg: "bg-amber-500/10 text-amber-300 border-amber-500/30",
      dot: "bg-amber-400 animate-ping",
    },
    stopping: {
      label: "Arresto...",
      bg: "bg-orange-500/10 text-orange-400 border-orange-500/30",
      dot: "bg-orange-400",
    },
    error: {
      label: "Errore",
      bg: "bg-rose-500/10 text-rose-400 border-rose-500/30",
      dot: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]",
    },
  };

  const config = configs[status] || configs.offline;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-md transition-all duration-300",
        config.bg,
        className
      )}
    >
      {showDot && <span className={cn("w-2 h-2 rounded-full", config.dot)} />}
      {config.label}
    </span>
  );
};

