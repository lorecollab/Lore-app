import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, ChevronLeft, LogOut, Trash2 } from "lucide-react";
import AppShell from "../components/AppShell";
import Avatar from "../components/Avatar";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import { TONE_STYLES, RESPONSE_LENGTHS } from "../lib/features";
import { LEGAL_NAV } from "./Legal";
import { toast } from "sonner";

export default function Settings() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [prefs, setPrefs] = useState({ tone_style: "natural", response_length: "normal", mode: "a", notif_chat: true, notif_social: true, notif_app: true, content_filter: true, sensitive_blur: true });

  useEffect(() => {
    api.get("/users/me/settings").then((r) => setPrefs((p) => ({ ...p, ...(r.data || {}) }))).catch(() => {});
  }, []);

  const setPref = async (k, v) => {
    const next = { ...prefs, [k]: v };
    setPrefs(next);
    try { await api.put("/users/me/settings", { [k]: v }); }
    catch { toast.error("Couldn't save"); }
  };

  const onLogout = () => { if (window.confirm("Log out?")) logout(); };
  const onDelete = () => {
    if (!window.confirm("Delete account? This cannot be undone.")) return;
    api.delete("/users/me").then(() => { logout(); }).catch(() => toast.error("Couldn't delete"));
  };

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto bg-lore" data-testid="settings-root">
        <div className="sticky top-0 z-10 bg-lore/85 backdrop-blur-md border-b border-lore">
          <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
            <button onClick={() => nav(-1)} className="md:hidden p-2 -ml-2 lore-taupe hover:lore-cream rounded-lg" aria-label="Back" data-testid="settings-back">
              <ChevronLeft className="w-5 h-5"/>
            </button>
            <h1 className="text-2xl font-semibold lore-cream">Settings</h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5 pb-28">
          {/* User card */}
          <Link to="/profile" className="block bg-lore-card border border-lore rounded-2xl p-4 hover:bg-[#241F1C] transition" data-testid="settings-account-card">
            <div className="flex items-center gap-3">
              <Avatar name={user?.name} size={52}/>
              <div className="flex-1 min-w-0">
                <p className="text-lg lore-cream truncate">{user?.name || "—"}</p>
                <p className="text-xs lore-taupe truncate">@{user?.username || "you"} · {user?.email}</p>
              </div>
              <ChevronRight className="w-5 h-5 lore-taupe"/>
            </div>
          </Link>

          <Card title="Chat Experience">
            <SelectRow label="Default Response Length" value={prefs.response_length} options={RESPONSE_LENGTHS}
              onChange={(v) => setPref("response_length", v)} testid="settings-length"/>
            <Divider/>
            <ToggleRow label="A Mode (fast & compact)" checked={prefs.mode === "a"}
              onChange={(c) => setPref("mode", c ? "a" : "b")} testid="settings-mode"/>
            <Divider/>
            <Link to="/chats" className="flex items-center justify-between py-3 lore-taupe hover:lore-cream text-sm" data-testid="settings-reset-history">
              <span>Reset Chat History</span><ChevronRight className="w-4 h-4"/>
            </Link>
          </Card>

          <Card title="Tone Style" subtitle="Controls how conversations feel.">
            <div className="space-y-2">
              {TONE_STYLES.map((t) => {
                const on = prefs.tone_style === t.id;
                return (
                  <button key={t.id} onClick={() => setPref("tone_style", t.id)}
                    className={`w-full text-left rounded-xl border px-3 py-2.5 transition ${on ? "border-[#D8B982]/60 bg-[#D8B982]/10" : "border-lore hover:bg-[#241F1C]"}`}
                    data-testid={`settings-tone-${t.id}`}>
                    <p className={`text-sm font-medium ${on ? "lore-gold" : "lore-cream"}`}>{t.label}</p>
                    <p className="text-xs lore-taupe mt-0.5">{t.desc}</p>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title="Notifications">
            <ToggleRow label="Chat activity" checked={prefs.notif_chat} onChange={(c) => setPref("notif_chat", c)} testid="notif-chat"/>
            <Divider/>
            <ToggleRow label="Social activity" checked={prefs.notif_social} onChange={(c) => setPref("notif_social", c)} testid="notif-social"/>
            <Divider/>
            <ToggleRow label="App updates" checked={prefs.notif_app} onChange={(c) => setPref("notif_app", c)} testid="notif-app"/>
          </Card>

          <Card title="Privacy & Safety">
            <ToggleRow label="Content filtering" checked={prefs.content_filter} onChange={(c) => setPref("content_filter", c)} testid="filter-content"/>
            <Divider/>
            <ToggleRow label="Sensitive content blur" checked={prefs.sensitive_blur} onChange={(c) => setPref("sensitive_blur", c)} testid="filter-sensitive"/>
            <Divider/>
            <RowLink label="Report history" to="/settings" testid="settings-report-history"/>
            <Divider/>
            <RowLink label="Data controls" to="/settings" testid="settings-data-controls"/>
          </Card>

          <Card title="Premium">
            <Link to="/paywall" className="flex items-center justify-between py-3 hover:lore-cream" data-testid="settings-premium">
              <div>
                <p className="text-sm lore-gold">Loré Premium</p>
                <p className="text-xs lore-taupe mt-0.5">Unlimited regenerations · longer responses · unlimited media</p>
              </div>
              <ChevronRight className="w-5 h-5 lore-taupe"/>
            </Link>
          </Card>

          <Card title="Legal">
            {LEGAL_NAV.map((l, i) => (
              <React.Fragment key={l.id}>
                {i > 0 && <Divider/>}
                <RowLink label={l.label} to={`/legal/${l.id}`} testid={`legal-link-${l.id}`}/>
              </React.Fragment>
            ))}
          </Card>

          <Card title="Support">
            <RowLink label="Help Center" to="/settings" testid="support-help"/>
            <Divider/>
            <RowLink label="Report a Problem" to="/settings" testid="support-report"/>
            <Divider/>
            <RowLink label="Contact Support" to="/settings" testid="support-contact"/>
            <Divider/>
            <RowLink label="Request My Data" to="/settings" testid="support-data"/>
          </Card>

          <Card title="Account">
            <button onClick={onLogout} className="flex items-center gap-2 py-3 lore-cream hover:lore-gold w-full text-sm" data-testid="logout-btn">
              <LogOut className="w-4 h-4"/> Log Out
            </button>
            <Divider/>
            <button onClick={onDelete} className="flex items-center gap-2 py-3 text-[#FF6B6B] hover:opacity-80 w-full text-sm" data-testid="delete-account-btn">
              <Trash2 className="w-4 h-4"/> Delete Account
            </button>
          </Card>

          <p className="text-center lore-taupe text-xs pt-4 lore-fade-up">Loré · 18+ · Built with care.</p>
        </div>
      </div>
    </AppShell>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <section className="bg-lore-card border border-lore rounded-2xl p-4 sm:p-5">
      <div className="mb-2">
        <h2 className="text-base lore-cream">{title}</h2>
        {subtitle && <p className="text-xs lore-taupe mt-0.5">{subtitle}</p>}
      </div>
      <div className="divide-y divide-lore-card-2">{children}</div>
    </section>
  );
}
function Divider() { return <div className="border-t border-lore opacity-60"/>; }
function ToggleRow({ label, checked, onChange, testid }) {
  return (
    <label className="flex items-center justify-between py-3 cursor-pointer">
      <span className="text-sm lore-cream">{label}</span>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} data-testid={testid}
        className={`w-11 h-6 rounded-full transition relative ${checked ? "bg-[#D8B982]" : "bg-[#2A2520]"}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-[#15110F] transition ${checked ? "left-[calc(100%-1.375rem)]" : "left-0.5"}`}/>
      </button>
    </label>
  );
}
function SelectRow({ label, value, options, onChange, testid }) {
  return (
    <div className="py-3">
      <p className="text-sm lore-cream mb-2">{label}</p>
      <div className="flex gap-1.5">
        {options.map((o) => (
          <button key={o.id} onClick={() => onChange(o.id)} type="button"
            className={`px-3 py-1.5 rounded-full text-xs border transition ${value === o.id ? "border-[#D8B982] bg-[#D8B982]/10 lore-gold" : "border-lore lore-taupe hover:lore-cream"}`}
            data-testid={`${testid}-${o.id}`}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}
function RowLink({ label, to, testid }) {
  return (
    <Link to={to} className="flex items-center justify-between py-3 lore-cream hover:lore-gold text-sm" data-testid={testid}>
      <span>{label}</span><ChevronRight className="w-4 h-4 lore-taupe"/>
    </Link>
  );
}
