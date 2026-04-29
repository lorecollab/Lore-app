import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LogOut, Library, Sparkles } from "lucide-react";

export default function TopNav() {
  const { user, logout } = useAuth();
  return (
    <header
      data-testid="top-nav"
      className="sticky top-0 z-30 backdrop-blur-2xl bg-[#1A1613]/70 border-b border-white/5"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2 group" data-testid="nav-logo">
          <Sparkles className="w-5 h-5 text-[#C9A96A] transition-transform group-hover:rotate-12" strokeWidth={1.5} />
          <span className="font-serif-display text-2xl tracking-tight text-[#EDE4D3]">
            LOR<span className="text-[#C9A96A]">É</span>
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          {user ? (
            <>
              <Link to="/dashboard" className="text-[#B8AFA0] hover:text-[#C9A96A] transition-colors" data-testid="nav-dashboard">
                <span className="flex items-center gap-2"><Library className="w-4 h-4" strokeWidth={1.5}/>Your Characters</span>
              </Link>
              <span className="text-[#857E71] hidden sm:inline">{user.name}</span>
              <button
                onClick={logout}
                className="text-[#B8AFA0] hover:text-[#C9A96A] transition-colors flex items-center gap-1"
                data-testid="nav-logout"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.5}/> Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-[#B8AFA0] hover:text-[#C9A96A] transition-colors" data-testid="nav-login">Sign in</Link>
              <Link
                to="/signup"
                className="border border-[#C9A96A] text-[#C9A96A] hover:bg-[#C9A96A] hover:text-[#1A1613] transition-all px-5 py-2 uppercase tracking-widest text-xs"
                data-testid="nav-signup"
              >
                Begin
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
