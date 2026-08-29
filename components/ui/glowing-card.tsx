"use client";
import React from "react";
import { cn } from "@/lib/utils";

interface GlowingCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glowColor?: "indigo" | "purple" | "emerald" | "amber" | "rose" | "blue";
  borderGlow?: boolean;
}

const colorMap = {
  indigo: "from-indigo-500/20 via-indigo-500/5 to-transparent border-indigo-500/30",
  purple: "from-purple-500/20 via-purple-500/5 to-transparent border-purple-500/30",
  emerald: "from-emerald-500/20 via-emerald-500/5 to-transparent border-emerald-500/30",
  amber: "from-amber-500/20 via-amber-500/5 to-transparent border-amber-500/30",
  rose: "from-rose-500/20 via-rose-500/5 to-transparent border-rose-500/30",
  blue: "from-blue-500/20 via-blue-500/5 to-transparent border-blue-500/30",
};

export const GlowingCard = ({
  children,
  className,
  glowColor = "indigo",
  borderGlow = true,
  ...props
}: GlowingCardProps) => {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 backdrop-blur-xl transition-all duration-300 hover:border-zinc-700/80 hover:shadow-2xl hover:shadow-indigo-500/10",
        borderGlow && "before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-2xl before:bg-gradient-to-b " + colorMap[glowColor],
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />
      <div className="relative z-10 w-full h-full flex flex-col justify-between">{children}</div>
    </div>
  );
};

