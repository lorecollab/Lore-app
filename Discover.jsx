import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import AuthImage from "../components/AuthImage";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Plus, Sparkles, Globe, Lock, ChevronLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const TABS = [
  { key: "trending", label: "Trending" },
  { key: "popular", label: "Popular" },
  { key: "yours", label: "Yours" },
];

export default function Discover() {
  const [owned, setOwned] = useState([]);
  const [publicChars, setPublicChars] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const { user } = useAuth();

  const tab = params.get("tab") || "trending";

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get("/characters"),
      api.get("/discover"),
      api.get("/discover/featured"),
    ])
      .then(([a, b, f]) => { setOwned(a.data); setPublicChars(b.data); setFeatured(f.data); })
      .catch(() => toast.error("Could not load"))
      .finally(() => setLoading(false));
  }, []);

  const displayed = useMemo(() => {
    let list;
    if (tab === "yours") list = owned;
    else if (tab === "trending") list = featured;
    else {
      const featuredIds = new Set(featured.map((c) => c.id));
      list = publicChars.filter((c) => !featuredIds.has(c.id));
    }
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((c) =>
      (c.name || "").toLowerCase().includes(q) ||
      (c.description || "").toLowerCase().includes(q) ||
      (c.tags || []).some((t) => t.toLowerCase().includes(q))
    );
    return list;
  }, [tab, owned, publicChars, featured, search]);

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto bg-lore" data-testid="discover-root">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-lore/85 backdrop-blur-md border-b border-lore">
          <div className="max-w-5xl mx-auto px-5 sm:px-8 py-4 flex items-center gap-3">
            <button onClick={() => nav(-1)} className="lore-press p-2 -ml-2 lore-taupe hover:lore-cream rounded-lg" aria-label="Back" data-testid="discover-back">
              <ChevronLeft className="w-5 h-5"/>
            </button>
            <h1 className="text-xl sm:text-2xl font-semibold lore-cream tracking-tight" data-testid="discover-title">Discover</h1>
            <Link to="/characters/new" className="ml-auto inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#D8B982] hover:bg-[#E0C798] text-[#15110F] rounded-xl text-sm font-semibold lore-press" data-testid="discover-create-btn">
              <Plus className="w-4 h-4"/> New
            </Link>
          </div>
          <div className="max-w-5xl mx-auto px-5 sm:px-8 pb-3 flex items-center gap-1.5" data-testid="discover-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setParams({ tab: t.key })}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-colors lore-press ${
                  tab === t.key ? "bg-[#D8B982] text-[#15110F]" : "lore-cream/80 hover:lore-cream bg-lore-card border border-lore"
                }`}
                data-testid={`tab-${t.key}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-6 pb-32">
          {/* Search */}
          <div className="relative mb-6">
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search characters or tags"
              className="w-full bg-lore-card border border-lore rounded-2xl pl-10 pr-3 py-2.5 text-sm lore-cream placeholder:text-[#7A6D62] outline-none focus:border-[#D8B982]/60"
              data-testid="discover-search"/>
            <svg className="absolute left-3 top-3 w-4 h-4 lore-taupe" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><div className="lore-spinner"/></div>
          ) : displayed.length === 0 ? (
            <EmptyState tab={tab} onCreate={() => nav("/characters/new")} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4" data-testid="character-grid">
              {displayed.map((c) => (
                <CharacterCard key={c.id} c={c} isMine={c.user_id === user?.id} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function CharacterCard({ c, isMine }) {
  return (
    <Link
      to={`/chat/${c.id}`}
      className="group bg-lore-card border border-lore hover:border-[#D8B982]/40 rounded-2xl overflow-hidden transition-all lore-press"
      data-testid={`char-card-${c.id}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="aspect-[3/4] bg-lore-card-2 relative overflow-hidden">
        {c.avatar_path && (
          <AuthImage path={c.avatar_path} className="w-full h-full object-cover transition-transform group-hover:scale-[1.04]"/>
        )}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(21,17,15,0.85) 100%)" }}/>
        <div className="absolute top-2 left-2 flex gap-1">
          {c.is_public ? (
            <span className="inline-flex items-center gap-1 bg-black/60 backdrop-blur px-2 py-0.5 rounded-full text-[10px] lore-cream">
              <Globe className="w-3 h-3"/> Public
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-black/60 backdrop-blur px-2 py-0.5 rounded-full text-[10px] lore-cream">
              <Lock className="w-3 h-3"/> Private
            </span>
          )}
          {isMine && (
            <span className="bg-[#D8B982] text-[#15110F] px-2 py-0.5 rounded-full text-[10px] font-semibold">You</span>
          )}
        </div>
        <div className="absolute bottom-2.5 left-2.5 right-2.5">
          <p className="text-sm font-semibold lore-cream truncate" data-testid={`char-card-name-${c.id}`}>{c.name}</p>
          <p className="text-[11px] lore-cream/70 mt-0.5 line-clamp-2">{c.description || c.role || ""}</p>
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ tab, onCreate }) {
  if (tab === "yours") {
    return (
      <div className="text-center py-20 border border-dashed border-lore rounded-2xl" data-testid="discover-empty-yours">
        <Sparkles className="w-8 h-8 lore-gold mx-auto mb-3"/>
        <h2 className="text-xl font-semibold lore-cream mb-1">No characters yet</h2>
        <p className="lore-taupe mb-5 text-sm">Create one to start chatting.</p>
        <button onClick={onCreate} className="lore-press px-5 py-2.5 bg-[#D8B982] hover:bg-[#E0C798] text-[#15110F] rounded-xl text-sm font-semibold" data-testid="empty-create-btn">
          Create Character
        </button>
      </div>
    );
  }
  return (
    <div className="text-center py-20 border border-dashed border-lore rounded-2xl" data-testid="discover-empty">
      <Globe className="w-8 h-8 lore-gold mx-auto mb-3"/>
      <h2 className="text-xl font-semibold lore-cream mb-1">Nothing here yet</h2>
      <p className="lore-taupe mb-5 text-sm">Try another tab or create your own.</p>
      <button onClick={onCreate} className="lore-press px-5 py-2.5 bg-[#D8B982] hover:bg-[#E0C798] text-[#15110F] rounded-xl text-sm font-semibold" data-testid="empty-foryou-btn">
        Create a character
      </button>
    </div>
  );
}
