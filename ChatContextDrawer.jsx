import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { X, Sparkles, Users, Wallet, Brain, Calendar, Tag } from "lucide-react";

const TOGGLES = [
  { key: "ctx_social",       label: "Social media",        desc: "Reacts to your posts, comments, fame.", Icon: Sparkles },
  { key: "ctx_relationships", label: "Relationships",      desc: "Knows your partner / friends / family.", Icon: Users },
  { key: "ctx_lifestyle",    label: "Lifestyle / wealth",  desc: "Aware of your money, assets, vibe.",     Icon: Wallet },
  { key: "ctx_memories",     label: "Memories",            desc: "Remembers what you've shared together.", Icon: Brain },
  { key: "ctx_activities",   label: "Activities",          desc: "Knows your projects, releases, events.", Icon: Calendar },
  { key: "ctx_tags",         label: "Tagged content",      desc: "Recognizes themselves when tagged.",     Icon: Tag },
];

export default function ChatContextDrawer({ open, onClose, characterId, settings, onChange }) {
  const [s, setS] = useState(settings || {});
  useEffect(() => setS(settings || {}), [settings]);
  if (!open) return null;

  const toggle = async (key, val) => {
    const next = { ...s, [key]: val };
    setS(next);
    try {
      const r = await api.put(`/characters/${characterId}/settings`, { [key]: val });
      onChange?.(r.data || next);
      setS(r.data || next);
    } catch { toast.error("Save failed"); }
  };

  const allOn = TOGGLES.every((t) => s[t.key] !== false);
  const allOff = TOGGLES.every((t) => s[t.key] === false);

  const setAll = async (val) => {
    const patch = Object.fromEntries(TOGGLES.map((t) => [t.key, val]));
    const next = { ...s, ...patch };
    setS(next);
    try {
      const r = await api.put(`/characters/${characterId}/settings`, patch);
      onChange?.(r.data || next);
      setS(r.data || next);
    } catch { toast.error("Save failed"); }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center" data-testid="chat-context-drawer">
      <div className="absolute inset-0 bg-black/60" onClick={onClose}/>
      <div className="relative bg-[#13151B] border border-[#1E222B] w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-lg">What this character knows</h3>
          <button onClick={onClose} className="text-[#9DA3AE] hover:text-white p-1" data-testid="context-close" aria-label="Close"><X className="w-5 h-5"/></button>
        </div>
        <p className="text-xs text-[#9DA3AE] mb-4">
          Toggles control what your world feeds into THIS chat. Posts, relationships and lifestyle are pulled in live every reply.
        </p>

        <div className="flex gap-2 mb-4">
          <button onClick={() => setAll(true)} disabled={allOn}
            className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[#22252D] hover:bg-[#1A1D24] disabled:opacity-40"
            data-testid="context-all-on">All on</button>
          <button onClick={() => setAll(false)} disabled={allOff}
            className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[#22252D] hover:bg-[#1A1D24] disabled:opacity-40"
            data-testid="context-all-off">All off</button>
        </div>

        <div className="space-y-2">
          {TOGGLES.map(({ key, label, desc, Icon }) => {
            const on = s[key] !== false;
            return (
              <label
                key={key}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  on ? "bg-[#D8B982]/15 border-[#D8B982]/40" : "bg-[#0E1015] border-[#22252D]"
                }`}
                data-testid={`context-toggle-${key}`}
              >
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${on ? "text-[#D8B982]" : "text-[#6E7585]"}`}/>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${on ? "text-[#E8EAED]" : "text-[#9DA3AE]"}`}>{label}</p>
                  <p className="text-xs text-[#6E7585] mt-0.5">{desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => toggle(key, e.target.checked)}
                  className="mt-1 accent-[#D8B982]"
                  data-testid={`context-toggle-input-${key}`}
                />
              </label>
            );
          })}
        </div>

        <p className="text-[11px] text-[#6E7585] mt-4 leading-relaxed">
          When social is ON, the character will react to your posts naturally — like their phone buzzed. New posts surface
          to them on the next message. Toggling OFF makes them ignore it.
        </p>
      </div>
    </div>
  );
}
