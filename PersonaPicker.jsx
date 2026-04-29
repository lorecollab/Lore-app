import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import Avatar from "./Avatar";
import { Check, ChevronDown, Plus, User } from "lucide-react";

export default function PersonaPicker({ characterId, onChange }) {
  const [open, setOpen] = useState(false);
  const [personas, setPersonas] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get("/personas"),
      api.get(`/characters/${characterId}/settings`),
    ]).then(([a, b]) => {
      setPersonas(a.data);
      setActiveId(b.data.active_persona_id || null);
    }).catch(() => {});
  }, [characterId]);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const select = async (id) => {
    setActiveId(id);
    setOpen(false);
    try {
      await api.put(`/characters/${characterId}/settings`, { active_persona_id: id });
      onChange?.(id);
    } catch {}
  };

  const active = personas.find((p) => p.id === activeId);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2.5 py-1.5 bg-[#1A1D24] hover:bg-[#22252D] border border-[#22252D] rounded-full text-xs text-[#E8EAED] transition-colors"
        data-testid="persona-picker"
        aria-label="Choose persona"
      >
        {active ? (
          <>
            <Avatar name={active.name} path={active.avatar_path} size={20}/>
            <span className="max-w-[100px] truncate">{active.name}</span>
          </>
        ) : (
          <>
            <User className="w-3.5 h-3.5 text-[#9DA3AE]"/>
            <span className="text-[#9DA3AE]">No persona</span>
          </>
        )}
        <ChevronDown className="w-3 h-3 text-[#9DA3AE]"/>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-[#13151B] border border-[#22252D] rounded-xl shadow-xl z-50 overflow-hidden" data-testid="persona-picker-menu">
          <div className="px-3 py-2 text-xs uppercase tracking-wide text-[#6E7585]">Roleplay as</div>
          <button
            onClick={() => select(null)}
            className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-[#1A1D24] text-left ${!activeId ? "bg-[#1A1D24]" : ""}`}
            data-testid="persona-option-none"
          >
            <div className="w-8 h-8 rounded-full bg-[#22252D] flex items-center justify-center">
              <User className="w-4 h-4 text-[#9DA3AE]"/>
            </div>
            <span className="flex-1 text-sm text-[#E8EAED]">No persona</span>
            {!activeId && <Check className="w-4 h-4 text-[#D8B982]"/>}
          </button>
          {personas.map((p) => (
            <button
              key={p.id}
              onClick={() => select(p.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-[#1A1D24] text-left ${activeId === p.id ? "bg-[#1A1D24]" : ""}`}
              data-testid={`persona-option-${p.id}`}
            >
              <Avatar name={p.name} path={p.avatar_path} size={32}/>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#E8EAED] truncate">{p.name}</p>
                <p className="text-xs text-[#6E7585] truncate">{[p.age, p.pronouns, p.occupation].filter(Boolean).join(" · ")}</p>
              </div>
              {activeId === p.id && <Check className="w-4 h-4 text-[#D8B982]"/>}
            </button>
          ))}
          <Link
            to="/personas/new"
            className="flex items-center gap-3 px-3 py-2 hover:bg-[#1A1D24] border-t border-[#22252D] text-[#D8B982] text-sm"
            data-testid="persona-create-link"
          >
            <Plus className="w-4 h-4"/> Create new persona
          </Link>
        </div>
      )}
    </div>
  );
}
