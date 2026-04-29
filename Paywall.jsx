import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Check } from "lucide-react";
import AppShell from "../components/AppShell";

const FEATURES = [
  { label: "Unlimited regenerations",     free: false, prem: true },
  { label: "Longer responses",            free: false, prem: true },
  { label: "Unlimited image uploads",     free: "10/day", prem: true },
  { label: "Unlimited audio uploads",     free: "5/day",  prem: true },
  { label: "Unlimited voice messages",    free: "5/day",  prem: true },
  { label: "Custom UI customization",     free: false, prem: true },
  { label: "Early access to new features",free: false, prem: true },
  { label: "No ads",                      free: false, prem: true },
];

export default function Paywall() {
  const nav = useNavigate();
  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto bg-lore" data-testid="paywall-root">
        <div className="sticky top-0 z-10 bg-lore/85 backdrop-blur-md border-b border-lore">
          <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
            <button onClick={() => nav(-1)} className="p-2 -ml-2 lore-taupe hover:lore-cream rounded-lg" aria-label="Back" data-testid="paywall-back">
              <ChevronLeft className="w-5 h-5"/>
            </button>
            <h1 className="text-xl font-semibold lore-cream">Loré Premium</h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-6 py-8 pb-28">
          <div className="text-center mb-8 lore-fade-up">
            <h2 className="text-4xl sm:text-5xl font-semibold lore-cream">A deeper, more personalised experience.</h2>
            <p className="lore-taupe text-sm mt-3">No friction. More space to play.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-lore-card border border-lore rounded-2xl p-5">
              <p className="lore-cream text-lg">Free</p>
              <p className="lore-taupe text-xs mt-1">$0</p>
            </div>
            <div className="bg-gradient-to-br from-[#241F1C] to-[#211B18] border border-[#D8B982]/40 rounded-2xl p-5 relative">
              <div className="absolute -top-2 right-3 bg-[#D8B982] text-[#15110F] text-[10px] font-bold px-2 py-0.5 rounded-full">Premium</div>
              <p className="lore-gold text-lg">Loré Premium</p>
              <p className="lore-taupe text-xs mt-1">Coming soon</p>
            </div>
          </div>

          <div className="bg-lore-card border border-lore rounded-2xl divide-y divide-[#241F1C]">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex items-center justify-between p-3 text-sm">
                <span className="lore-cream">{f.label}</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="w-12 text-right lore-taupe">{f.free === false ? "—" : (f.free === true ? "✓" : f.free)}</span>
                  <span className="w-12 text-right lore-gold inline-flex items-center justify-end">{f.prem === true ? <Check className="w-4 h-4"/> : f.prem}</span>
                </div>
              </div>
            ))}
          </div>

          <button disabled
            className="mt-8 w-full bg-[#D8B982] hover:bg-[#E0C798] disabled:opacity-50 disabled:cursor-not-allowed text-[#15110F] rounded-2xl py-3.5 font-semibold transition"
            data-testid="paywall-upgrade">
            Upgrade · Coming soon
          </button>
          <p className="text-[11px] lore-taupe text-center mt-4 leading-relaxed">
            Subscriptions renew automatically unless cancelled. Manage subscriptions in device settings. <Link to="/legal/terms" className="lore-gold hover:underline">Terms</Link> · <Link to="/legal/privacy" className="lore-gold hover:underline">Privacy</Link>.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
