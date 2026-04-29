import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

export default function Auth({ mode }) {
  const isSignup = mode === "signup";
  const { login, signup } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [age18, setAge18] = useState(!isSignup);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (isSignup && !age18) {
      toast.error("You must confirm you're 18 or older.");
      return;
    }
    setBusy(true);
    try {
      if (isSignup) await signup(email, password, name);
      else await login(email, password);
      nav(loc.state?.from || "/home");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Something went wrong");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-lore relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 22%, rgba(216,185,130,0.14) 0%, rgba(21,17,15,0) 55%), radial-gradient(ellipse at 80% 95%, rgba(185,139,134,0.06) 0%, rgba(21,17,15,0) 60%)" }}/>

      <div className="relative min-h-screen flex flex-col items-center justify-center p-6 lore-fade-up">
        <Link to="/" className="flex flex-col items-center gap-3 mb-6" data-testid="auth-brand">
          <span className="lore-logo text-4xl sm:text-5xl">L O R É</span>
          <div className="lore-separator"/>
        </Link>

        <div className="w-full max-w-sm">
          <p className="lore-serif text-[19px] sm:text-xl text-center lore-cream/90 leading-snug mb-8 px-4" data-testid="auth-title">
            {isSignup ? "Create your fantasy,\ncreate your world." : "Quickly sign back in\nto play with your characters again."}
          </p>

          <form onSubmit={submit} className="space-y-3" data-testid="auth-form">
            {isSignup && (
              <input required value={name} onChange={(e) => setName(e.target.value)}
                className="lore-input" placeholder="Your name" data-testid="signup-name-input"/>
            )}
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="lore-input" placeholder="you@example.com" data-testid="auth-email-input"/>
            <input required minLength={6} type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="lore-input" placeholder="At least 6 characters" data-testid="auth-password-input"/>

            {isSignup && (
              <label className="flex items-start gap-2 text-xs lore-taupe cursor-pointer pt-1" data-testid="auth-age-label">
                <input type="checkbox" checked={age18} onChange={(e) => setAge18(e.target.checked)}
                  className="mt-0.5 accent-[#D8B982]" data-testid="auth-age-check"/>
                <span>I confirm that I am 18 years or older and agree to the <Link to="/legal/terms" className="lore-gold hover:underline">Terms</Link> and <Link to="/legal/privacy" className="lore-gold hover:underline">Privacy Policy</Link>.</span>
              </label>
            )}

            <button type="submit" disabled={busy || (isSignup && !age18)}
              className="lore-press w-full bg-[#D8B982] hover:bg-[#E0C798] text-[#15110F] rounded-2xl py-3.5 font-semibold tracking-[0.18em] text-sm transition disabled:opacity-40 disabled:cursor-not-allowed mt-2"
              data-testid="auth-submit">
              {busy ? "…" : isSignup ? "CREATE ACCOUNT" : "SIGN IN"}
            </button>
          </form>

          <p className="mt-6 text-xs lore-taupe text-center" data-testid="auth-switch">
            {isSignup ? "Already with us?" : "New here?"}{" "}
            <Link to={isSignup ? "/login" : "/signup"} className="lore-gold hover:underline font-medium tracking-[0.10em] uppercase">
              {isSignup ? "Sign in" : "Create account"}
            </Link>
          </p>

          <p className="mt-8 text-[11px] lore-taupe text-center px-4 leading-relaxed">
            By continuing, you agree to our{" "}
            <Link to="/legal/terms" className="lore-cream/80 hover:lore-gold">Terms</Link>{" "}and{" "}
            <Link to="/legal/privacy" className="lore-cream/80 hover:lore-gold">Privacy Policy</Link>.
          </p>
        </div>

        <style>{`
          .lore-input {
            width: 100%; background: rgba(33,27,24,0.7); border: 1px solid rgba(216,185,130,0.16);
            color: #F7EFE6; border-radius: 1rem; padding: 0.85rem 1rem;
            font-size: 0.9rem; outline: none; transition: border-color .2s, box-shadow .2s;
            backdrop-filter: blur(8px);
          }
          .lore-input::placeholder { color: #7A6D62; }
          .lore-input:focus { border-color: #D8B982; box-shadow: 0 0 0 3px rgba(216,185,130,0.14); }
        `}</style>
      </div>
    </div>
  );
}
