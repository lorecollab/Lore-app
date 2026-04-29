import React from "react";
import BottomNav from "./BottomNav";

// Loré v9: chat-first, single-nav. The sidebar/hamburger is removed.
// Bottom nav is the ONLY navigation; pages render full-bleed.
export default function AppShell({ children }) {
  return (
    <div className="h-screen flex flex-col bg-lore lore-cream overflow-hidden">
      <main className="flex-1 flex flex-col h-full min-w-0 pb-[calc(env(safe-area-inset-bottom)+64px)]">
        {children}
      </main>
      <BottomNav/>
    </div>
  );
}
