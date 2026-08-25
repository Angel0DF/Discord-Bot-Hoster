"use client";
import React from "react";
import { cn } from "@/lib/utils";

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  className?: string;
  children?: React.ReactNode;
}

export const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = "#ffffff",
      shimmerSize = "0.05em",
      shimmerDuration = "3s",
      borderRadius = "100px",
      background = "radial-gradient(ellipse 80% 50% at 50% 120%,rgba(99,102,241,0.6),rgba(15,15,20,0))",
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        style={
          {
            "--spread": "90deg",
            "--shimmer-color": shimmerColor,
            "--radius": borderRadius,
            "--speed": shimmerDuration,
            "--cut": shimmerSize,
            "--bg": background,
          } as React.CSSProperties
        }
        className={cn(
          "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border border-white/10 px-5 py-2.5 [background:var(--bg)] [border-radius:var(--radius)] font-medium text-white shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-indigo-500/25 active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
          className
        )}
        ref={ref}
        {...props}
      >
        {/* spark container */}
        <div className="absolute inset-0 -z-30 overflow-visible [container-type:size]">
          <div className="absolute inset-0 h-[100cqh] animate-shimmer [aspect-ratio:1] [border-radius:0] [mask:none]">
            <div className="animate-spin [animation-duration:4s] absolute -inset-full w-auto rotate-0 [background:conic-gradient(from_0deg,transparent_0_340deg,white_360deg)] [translate:0_0]" />
          </div>
        </div>
        {/* backdrop */}
        <div className="absolute [background:var(--bg)] [border-radius:var(--radius)] [inset:var(--cut)] -z-20 bg-zinc-950/90 transition-all duration-300 group-hover:bg-zinc-900/90" />
        <span className="relative z-10 flex items-center gap-2">{children}</span>
      </button>
    );
  }
);

ShimmerButton.displayName = "ShimmerButton";

