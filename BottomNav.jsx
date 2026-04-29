import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, MessageCircle, UserCircle2, Settings as SettingsIcon, Plus, X, User, Mic, Sparkles } from "lucide-react";

export default function BottomNav() {
  const loc = useLocation();
  const nav = useNavigate();
  const [plusOpen, setPlusOpen] = useState(false);
  const hideOn = loc.pathname.startsWith("/chat/") || loc.pathname.startsWith("/legal/") || loc.pathname.startsWith("/welcome") || loc.pathname.startsWith("/login") || loc.pathname.startsWith("/signup");
  if (hideOn) return null;

  const Tab = ({ to, icon: Icon, label, testid }) => {
    const active = to === "/home" ? loc.pathname === "/home" : loc.pathname.startsWith(to);
    return (
      <Link to={to} className={`lore-press flex flex-col items-center justify-center py-2.5 text-[10px] font-medium transition ${active ? "lore-gold" : "lore-taupe hover:lore-cream"}`} data-testid={testid}>
        <Icon className={`w-5 h-5 mb-0.5 ${active ? "stroke-[2.4]" : ""}`}/>
        {label}
      </Link>
    );
  };

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-30 lore-glass border-t border-lore pb-[env(safe-area-inset-bottom)]" data-testid="bottom-nav">
        <div className="grid grid-cols-5 max-w-2xl mx-auto">
          <Tab to="/home"     icon={Home}         label="Home"     testid="nav-home"/>
          <Tab to="/chats"    icon={MessageCircle} label="Chat"    testid="nav-chat"/>
          <button onClick={() => setPlusOpen(true)} className="lore-press flex items-center justify-center" aria-label="Create" data-testid="nav-plus">
            <span className="w-11 h-11 -mt-3 rounded-full bg-[#D8B982] text-[#15110F] flex items-center justify-center shadow-lg shadow-[#D8B982]/25">
              <Plus className="w-5 h-5"/>
            </span>
          </button>
          <Tab to="/profile"  icon={UserCircle2}  label="Profile"  testid="nav-profile"/>
          <Tab to="/settings" icon={SettingsIcon} label="Settings" testid="nav-settings"/>
        </div>
      </nav>

      {plusOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center" data-testid="plus-sheet">
          <div className="absolute inset-0 bg-black/60" onClick={() => setPlusOpen(false)}/>
          <div className="relative w-full max-w-md lore-glass rounded-t-3xl p-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] lore-fade-up">
            <div className="flex items-center justify-between mb-4">
              <p className="text-base font-semibold lore-cream">Create</p>
              <button onClick={() => setPlusOpen(false)} className="lore-press lore-taupe hover:lore-cream p-1.5" aria-label="Close" data-testid="plus-close"><X className="w-5 h-5"/></button>
            </div>
            <div className="space-y-2">
              <PlusItem icon={Sparkles} title="Create Character" desc="Bring someone new into your world."
                onClick={() => { setPlusOpen(false); nav("/characters/new"); }} testid="plus-character"/>
              <PlusItem icon={User} title="Create Persona" desc="Decide who YOU are in this story."
                onClick={() => { setPlusOpen(false); nav("/personas/new"); }} testid="plus-persona"/>
              <PlusItem icon={Mic} title="Create Voice" desc="Upload or record a tone reference."
                onClick={() => { setPlusOpen(false); nav("/create-voice"); }} testid="plus-voice"/>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PlusItem({ icon: Icon, title, desc, onClick, testid }) {
  return (
    <button onClick={onClick} data-testid={testid}
      className="lore-press w-full text-left bg-lore-card-2 hover:bg-[#2A2520] rounded-2xl p-4 flex items-center gap-3 transition">
      <div className="w-10 h-10 rounded-full bg-[#D8B982]/15 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 lore-gold"/>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold lore-cream">{title}</p>
        <p className="text-xs lore-taupe mt-0.5">{desc}</p>
      </div>
    </button>
  );
}
