import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import AuthImage from "../components/AuthImage";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Pencil, Trash2, Brain, MessageCircle, ChevronLeft, BadgeCheck, Lock } from "lucide-react";

export default function CharacterProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const [c, setC] = useState(null);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    api.get(`/characters/${id}`).then((r) => setC(r.data))
      .catch(() => toast.error("Could not load"));
  }, [id]);

  const remove = async () => {
    try { await api.delete(`/characters/${id}`); toast.success("Deleted"); nav("/home"); }
    catch { toast.error("Delete failed"); }
  };

  if (!c) {
    return <AppShell><div className="flex-1 flex items-center justify-center"><div className="lore-spinner"/></div></AppShell>;
  }

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto bg-lore" data-testid="character-profile">
        {/* Cinematic image header */}
        <div className="relative h-[58vh] overflow-hidden">
          {c.avatar_path ? (
            <AuthImage path={c.avatar_path} className="w-full h-full object-cover"/>
          ) : (
            <div className="w-full h-full bg-lore-card-2"/>
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(21,17,15,0.0) 0%, rgba(21,17,15,0.25) 40%, rgba(21,17,15,0.85) 80%, #15110F 100%)" }}/>
          <button onClick={() => nav(-1)} className="lore-press absolute top-3 left-3 lore-glass rounded-full p-2.5 lore-cream" aria-label="Back" data-testid="char-back">
            <ChevronLeft className="w-5 h-5"/>
          </button>
          <div className="absolute bottom-5 left-5 right-5">
            <p className="text-[10px] lore-gold tracking-[0.32em] font-semibold uppercase mb-1.5 inline-flex items-center gap-1.5">
              {c.is_public ? <><BadgeCheck className="w-3 h-3"/> PUBLIC CHARACTER</> : <><Lock className="w-3 h-3"/> PRIVATE</>}
            </p>
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight lore-cream">{c.name}</h1>
            {c.role && <p className="text-sm lore-cream/75 mt-1">{c.role}</p>}
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-5 sm:px-8 -mt-6 pb-32 space-y-4">
          {/* Primary actions */}
          <div className="flex gap-2">
            <Link to={`/chat/${c.id}`} className="lore-press flex-1 bg-[#D8B982] hover:bg-[#E0C798] text-[#15110F] rounded-2xl py-3 font-semibold inline-flex items-center justify-center gap-2" data-testid="char-chat">
              <MessageCircle className="w-4 h-4"/> Chat
            </Link>
            <Link to={`/characters/${c.id}/memories`} className="lore-press lore-glass rounded-2xl py-3 px-4 font-medium lore-cream inline-flex items-center justify-center gap-2" data-testid="char-memories">
              <Brain className="w-4 h-4"/> Memories
            </Link>
            <Link to={`/characters/${c.id}/edit`} className="lore-press lore-glass rounded-2xl py-3 px-4 font-medium lore-cream inline-flex items-center justify-center" data-testid="char-edit" aria-label="Edit">
              <Pencil className="w-4 h-4"/>
            </Link>
          </div>

          {/* Description */}
          {c.description && (
            <Section title="About">
              <p className="text-sm lore-cream/85 leading-relaxed whitespace-pre-wrap">{c.description}</p>
            </Section>
          )}

          {/* Detail fields */}
          {([
            ["Personality", c.personality], ["Speech style", c.speech_style],
            ["Core traits", c.core_traits], ["Background", c.background],
            ["Relationships", c.relationships], ["Habits", c.habits],
            ["Boundaries", c.boundaries], ["Opening scene", c.initial_scene],
          ].filter(([, v]) => v && v.trim()).length > 0) && (
            <Section title="Details">
              <dl className="space-y-3">
                {[
                  ["Personality", c.personality], ["Speech style", c.speech_style],
                  ["Core traits", c.core_traits], ["Background", c.background],
                  ["Relationships", c.relationships], ["Habits", c.habits],
                  ["Boundaries", c.boundaries], ["Opening scene", c.initial_scene],
                ].filter(([, v]) => v && v.trim()).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[11px] lore-gold tracking-[0.18em] uppercase font-semibold mb-1">{k}</dt>
                    <dd className="text-sm lore-cream/85 leading-relaxed whitespace-pre-wrap">{v}</dd>
                  </div>
                ))}
              </dl>
            </Section>
          )}

          {/* Greetings */}
          {c.greetings?.length > 0 && (
            <Section title="Greetings">
              <ul className="space-y-2">
                {c.greetings.map((g, i) => (
                  <li key={i} className="text-sm lore-cream/85 bg-lore-card-2 rounded-xl p-3 leading-relaxed">"{g}"</li>
                ))}
              </ul>
            </Section>
          )}

          {/* Footer — delete is small + low-priority */}
          <div className="pt-6 flex items-center justify-end">
            <button onClick={() => setConfirm(true)} className="text-xs lore-taupe hover:text-[#FF6B6B] inline-flex items-center gap-1.5" data-testid="char-delete">
              <Trash2 className="w-3.5 h-3.5"/> Delete character
            </button>
          </div>
        </div>

        {confirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/65" onClick={() => setConfirm(false)}/>
            <div className="relative lore-glass rounded-2xl p-5 max-w-xs w-full text-center">
              <p className="text-base lore-cream mb-1">Delete {c.name}?</p>
              <p className="text-xs lore-taupe mb-5">This removes the character and all your chats with them.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirm(false)} className="flex-1 py-2.5 rounded-xl bg-lore-card-2 lore-cream text-sm font-medium" data-testid="char-delete-cancel">Cancel</button>
                <button onClick={remove} className="flex-1 py-2.5 rounded-xl bg-[#FF6B6B] text-white text-sm font-semibold" data-testid="char-delete-confirm">Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Section({ title, children }) {
  return (
    <section className="bg-lore-card border border-lore rounded-2xl p-5">
      <h2 className="text-sm font-semibold lore-cream mb-3">{title}</h2>
      {children}
    </section>
  );
}
