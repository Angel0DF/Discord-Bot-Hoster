"use client";
import React from "react";
import { cn } from "@/lib/utils";

export const AnimatedGridPattern = ({
  className,
}: {
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-0 h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]",
        className
      )}
    />
  );
};

