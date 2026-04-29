import React, { useState } from "react";

const ROTATING = ["ENTERING", "WE LOCKED IN", "SAY LESS", "CLOCKING IN", "NO BACKING OUT"];

export default function LoadingScreen({ line }) {
  const [idx] = useState(() => Math.floor(Math.random() * ROTATING.length));
  const showLine = (line || ROTATING[idx]).toUpperCase();
  return (
    <div className="min-h-screen bg-lore flex items-center justify-center overflow-hidden relative" data-testid="loading-screen">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(216,185,130,0.12) 0%, rgba(21,17,15,0) 55%)" }}/>
      <div className="text-center px-8 lore-fade-up">
        <h1 className="lore-logo text-5xl sm:text-6xl">L O R É</h1>
        <div className="mt-6 mx-auto lore-separator"/>
        <p className="mt-5 text-[10px] tracking-[0.45em] lore-gold/80 font-medium">{showLine}<span className="opacity-70">…</span></p>
        <div className="mt-10 mx-auto lore-spinner"/>
      </div>
    </div>
  );
}
