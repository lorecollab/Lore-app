import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ChevronRight } from "lucide-react";

export default function Landing() {
  const { user } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (user) nav("/home", { replace: true });
  }, [user, nav]);

  return (
    <div className="min-h-screen bg-lore relative overflow-hidden">
      {/* Cinematic interior — warm city night */}
      <div className="absolute inset-0">
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(ellipse at 22% 32%, rgba(216,185,130,0.18) 0%, rgba(21,17,15,0) 38%), radial-gradient(ellipse at 78% 50%, rgba(216,185,130,0.10) 0%, rgba(21,17,15,0) 50%), radial-gradient(ellipse at 30% 92%, rgba(185,139,134,0.10) 0%, rgba(21,17,15,0) 60%), linear-gradient(180deg, #1A1311 0%, #15110F 65%, #0E0B09 100%)",
        }}/>
        {/* faux-window light slivers (cheap depth) */}
        <div className="absolute left-[8%] top-0 bottom-0 w-px bg-gradient-to-b from-[#D8B982]/30 via-transparent to-transparent"/>
        <div className="absolute left-[12%] top-[15%] w-1.5 h-1.5 rounded-full bg-[#D8B982]/70 blur-[1px]"/>
        <div className="absolute left-[14%] top-[28%] w-1 h-1 rounded-full bg-[#D8B982]/60 blur-[1px]"/>
        <div className="absolute right-[12%] top-[40%] w-1.5 h-1.5 rounded-full bg-[#B98B86]/50 blur-[1px]"/>
        <div className="absolute right-[18%] top-[50%] w-1 h-1 rounded-full bg-[#D8B982]/60 blur-[1px]"/>
        <div className="absolute right-[8%] top-[60%] w-2 h-2 rounded-full bg-[#D8B982]/40 blur-[1px]"/>
        {/* warm bottom vignette */}
        <div className="absolute inset-x-0 bottom-0 h-1/3" style={{ background: "linear-gradient(180deg, rgba(21,17,15,0) 0%, rgba(21,17,15,0.85) 70%, #0E0B09 100%)" }}/>
      </div>

      <div className="relative min-h-screen flex flex-col items-center justify-between text-center px-6 py-12 lore-fade-up">
        {/* Top: brand + sparkle ornament */}
        <div className="flex-1 flex flex-col items-center justify-center w-full pt-10">
          <div className="relative">
            <span className="absolute -top-7 right-[-8px] text-[#D8B982] text-lg drop-shadow-[0_0_8px_rgba(216,185,130,0.55)]" aria-hidden>✦</span>
            <h1 className="lore-logo text-5xl sm:text-6xl">L O R É</h1>
          </div>
          <div className="lore-separator mt-3 mb-7"/>

          <p className="lore-serif text-[15px] sm:text-base lore-cream/85 tracking-[0.30em] uppercase font-medium">
            YOUR LIFE.&nbsp;&nbsp;YOUR FANTASY.&nbsp;&nbsp;YOUR WORLD.
          </p>
          <p className="lore-serif text-sm lore-gold/85 tracking-[0.28em] uppercase mt-4">
            ARE WE CLOCKING IN?
          </p>
        </div>

        {/* Bottom: CTAs */}
        <div className="w-full max-w-sm space-y-3 mb-2">
          <Link to="/signup" data-testid="landing-apple"
            className="lore-press flex items-center justify-center gap-2 w-full bg-white text-black rounded-full py-3.5 font-medium transition">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d="M11.4 8.4c0-1.5 1.2-2.2 1.3-2.3-.7-1-1.8-1.2-2.2-1.2-.9-.1-1.8.5-2.3.5s-1.2-.5-2-.5c-1 0-2 .6-2.5 1.5C2.6 8.3 3.5 11.5 4.6 13c.5.7 1.1 1.5 2 1.5.8 0 1.1-.5 2.1-.5s1.2.5 2 .5 1.5-.7 2-1.5c.7-.9.9-1.8 1-1.9-.1 0-1.3-.5-1.3-1.7zM10 4.2c.4-.5.7-1.2.6-2-.6.1-1.3.5-1.7 1-.4.4-.8 1.1-.7 1.9.7.1 1.4-.4 1.8-.9z"/></svg>
            Continue with Apple
          </Link>
          <Link to="/signup" data-testid="landing-google"
            className="lore-press flex items-center justify-center gap-2 w-full bg-transparent border lore-cream rounded-full py-3.5 font-medium transition hover:bg-[#241F1C]"
            style={{ borderColor: "rgba(216,185,130,0.35)" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <path fill="#4285F4" d="M14.7 8.2c0-.5 0-1-.1-1.4H8v2.6h3.8c-.2.9-.7 1.6-1.4 2.1v1.7h2.3c1.3-1.2 2-3 2-5z"/>
              <path fill="#34A853" d="M8 15c1.9 0 3.5-.6 4.7-1.7l-2.3-1.7c-.6.4-1.4.7-2.4.7-1.8 0-3.4-1.2-4-2.9H1.6v1.8C2.8 13.5 5.2 15 8 15z"/>
              <path fill="#FBBC04" d="M4 9.4c-.1-.4-.2-.8-.2-1.2 0-.4.1-.8.2-1.2V5.2H1.6C1.2 6 1 6.9 1 8.2c0 1.3.2 2.2.6 3l2.4-1.8z"/>
              <path fill="#EA4335" d="M8 4.1c1 0 1.9.4 2.7 1l2-2C11.5 2 9.9 1.3 8 1.3 5.2 1.3 2.8 2.7 1.6 5.2L4 7c.6-1.7 2.2-2.9 4-2.9z"/>
            </svg>
            Continue with Google
          </Link>
          <Link to="/login" data-testid="landing-guest"
            className="lore-press flex items-center justify-center gap-2 w-full py-2 lore-cream/80 hover:lore-cream tracking-[0.25em] text-xs uppercase font-medium">
            Continue as Guest <ChevronRight className="w-3.5 h-3.5"/>
          </Link>

          <p className="text-[10px] lore-taupe pt-3 leading-relaxed">
            By continuing, you agree to our{" "}
            <Link to="/legal/terms" className="lore-cream/80 hover:lore-gold underline-offset-2 hover:underline">Terms of Service</Link>{" "}/{" "}
            <Link to="/legal/privacy" className="lore-cream/80 hover:lore-gold underline-offset-2 hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
