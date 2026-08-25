"use client";
import React from "react";

export const BackgroundBeams = () => {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-40">
      <div className="absolute -top-[40%] left-[20%] h-[800px] w-[800px] rounded-full bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent blur-[120px]" />
      <div className="absolute top-[30%] -right-[20%] h-[700px] w-[700px] rounded-full bg-gradient-to-br from-purple-600/15 via-blue-500/10 to-transparent blur-[140px]" />
      <div className="absolute -bottom-[20%] left-[10%] h-[600px] w-[600px] rounded-full bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent blur-[120px]" />
    </div>
  );
};

