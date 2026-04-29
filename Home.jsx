import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Plus, Play, Info, Search, Settings as SettingsIcon } from "lucide-react";
import AppShell from "../components/AppShell";
import Avatar from "../components/Avatar";
import AuthImage from "../components/AuthImage";
import { useAuth } from "../contexts/AuthContext";

const GENRE_TAGS = ["Drama", "Romance", "Slow Burn", "Luxury", "Fame"];

export default function Home() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [recents, setRecents] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [popular, setPopular] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewId, setPreviewId] = useState(null); // hero override on card hover/tap

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.get("/discover").catch(() => ({ data: [] })),
      api.get("/discover/featured").catch(() => ({ data: [] })),
      api.get("/personas").catch(() => ({ data: [] })),
    ]).then(([d, f, p]) => {
      if (!alive) return;
      const all = d.data || [];
      const featuredArr = f.data || [];
      const featuredIds = new Set(featuredArr.map((c) => c.id));
      const mine = all.filter((c) => c.user_id === user?.id).sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
      // Popular = public characters NOT featured AND not mine
      const others = all.filter((c) => c.user_id !== user?.id && !featuredIds.has(c.id));
      setRecents(mine.slice(0, 12));
      setFeatured(featuredArr.slice(0, 14));
      setPopular(others.slice(0, 14));
      setPersonas(p.data || []);
    }).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [user?.id]);

  const baseHero = useMemo(() => recents[0] || featured[0] || popular[0] || null, [recents, featured, popular]);
  const allChars = useMemo(() => [...recents, ...featured, ...popular], [recents, featured, popular]);
  const hero = useMemo(
    () => (previewId ? allChars.find((c) => c.id === previewId) || baseHero : baseHero),
    [previewId, allChars, baseHero]
  );

  if (loading) return (
    <AppShell>
      <div className="flex-1 flex items-center justify-center"><div className="lore-spinner"/></div>
    </AppShell>
  );

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto bg-lore" data-testid="home-root">
        {/* Top bar */}
        <div className="flex items-center px-5 sm:px-12 pt-4 pb-2">
          <span className="lore-logo text-base">L O R É</span>
          <div className="ml-auto flex items-center gap-1">
            <Link to="/discover" className="lore-press p-2 lore-taupe hover:lore-cream" data-testid="home-search"><Search className="w-5 h-5"/></Link>
            <Link to="/profile" className="lore-press p-2 lore-taupe hover:lore-cream" data-testid="home-profile-btn" aria-label="Profile"><Avatar name={user?.name} size={28}/></Link>
            <Link to="/settings" className="lore-press p-2 lore-taupe hover:lore-cream" data-testid="home-settings" aria-label="Settings"><SettingsIcon className="w-5 h-5"/></Link>
          </div>
        </div>

        {/* Hero */}
        {hero && (
          <Hero hero={hero} onPlay={() => nav(`/chat/${hero.id}`)} onInfo={() => nav(`/characters/${hero.id}`)}/>
        )}

        <div className="space-y-10 sm:space-y-12 pb-32 pt-4">
          <Row title={recents.length ? `Continue Playing for ${user?.name?.split(" ")[0] || "You"}` : "Start with someone unforgettable"}
            items={recents}
            onPreview={setPreviewId}
            empty={
              <EmptyCard title="No characters yet" sub="Create one and let the conversation begin." cta="Create Character" to="/characters/new"/>
            }
            tail={<CreateTile to="/characters/new" label="Create Character"/>}/>

          <Row title="Trending on Loré" items={featured} onPreview={setPreviewId} testid="row-trending"/>

          <Row title="Popular on Loré" items={popular} onPreview={setPreviewId} testid="row-popular"/>

          <Row title="Your Personas" items={personas} kind="persona" testid="row-personas"
            tail={<CreateTile to="/personas/new" label="Create Persona"/>}/>
        </div>
      </div>
    </AppShell>
  );
}

function Hero({ hero, onPlay, onInfo }) {
  return (
    <div className="relative h-[62vh] sm:h-[68vh] overflow-hidden -mt-2 sm:mt-0" data-testid="home-hero">
      {hero.avatar_path ? (
        <AuthImage key={hero.id} path={hero.avatar_path} className="absolute inset-0 w-full h-full object-cover lore-fade-up"/>
      ) : (
        <div className="absolute inset-0 bg-lore-card-2"/>
      )}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(21,17,15,0.0) 0%, rgba(21,17,15,0.25) 40%, rgba(21,17,15,0.88) 80%, #15110F 100%)" }}/>
      <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(21,17,15,0.65) 0%, rgba(21,17,15,0) 65%)" }}/>

      <div key={hero.id + "-info"} className="relative h-full flex flex-col justify-end p-5 sm:p-12 max-w-2xl lore-fade-up">
        <p className="text-[10px] lore-gold tracking-[0.32em] font-semibold uppercase mb-3">Continue Playing</p>
        <h2 className="text-4xl sm:text-6xl font-semibold tracking-tight lore-cream" data-testid="hero-name">{hero.name}</h2>
        <p className="text-sm sm:text-base lore-cream/75 mt-3 line-clamp-2 max-w-md leading-relaxed">{hero.description || hero.role || "A world to step into."}</p>
        <div className="flex flex-wrap gap-1.5 mt-4">
          {GENRE_TAGS.slice(0, 4).map((t) => (
            <span key={t} className="text-[10px] lore-cream/65 bg-[#241F1C]/70 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-lore">{t}</span>
          ))}
        </div>
        <div className="flex gap-2.5 mt-6">
          <button onClick={onPlay} className="lore-press bg-[#D8B982] hover:bg-[#E0C798] text-[#15110F] rounded-2xl px-7 py-3 font-semibold inline-flex items-center gap-2 transition" data-testid="hero-play">
            <Play className="w-4 h-4 fill-current"/> Play
          </button>
          <button onClick={onInfo} className="lore-press lore-glass rounded-2xl px-5 py-3 font-medium lore-cream inline-flex items-center gap-2 hover:bg-[#241F1C] transition" data-testid="hero-info">
            <Info className="w-4 h-4"/> More Info
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ title, items, kind = "character", empty, tail, testid, onPreview }) {
  if (!items?.length && !empty && !tail) return null;
  return (
    <div className="px-5 sm:px-12" data-testid={testid}>
      <div className="flex items-center mb-4">
        <h3 className="text-base sm:text-lg font-semibold lore-cream tracking-tight">{title}</h3>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 sm:-mx-12 px-5 sm:px-12 snap-x">
        {items?.length === 0 && empty}
        {items?.map((item) => (
          kind === "persona"
            ? <PersonaCard key={item.id} persona={item}/>
            : <CharacterCard key={item.id} character={item} onPreview={onPreview}/>
        ))}
        {tail}
      </div>
    </div>
  );
}

function CharacterCard({ character, onPreview }) {
  return (
    <Link
      to={`/chat/${character.id}`}
      onMouseEnter={() => onPreview?.(character.id)}
      onTouchStart={() => onPreview?.(character.id)}
      onFocus={() => onPreview?.(character.id)}
      onContextMenu={(e) => e.preventDefault()}
      className="lore-press snap-start flex-shrink-0 w-[148px] sm:w-[200px] group"
      data-testid={`char-card-${character.id}`}
    >
      <div className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-lore-card border border-lore">
        {character.avatar_path ? (
          <AuthImage path={character.avatar_path} className="w-full h-full object-cover transition-transform group-hover:scale-[1.04]"/>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl lore-gold">{(character.name || "?")[0]}</div>
        )}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(21,17,15,0.85) 100%)" }}/>
        <div className="absolute bottom-2.5 left-2.5 right-2.5">
          <p className="text-sm font-semibold lore-cream truncate">{character.name}</p>
          {character.role && <p className="text-[11px] lore-cream/65 truncate">{character.role}</p>}
        </div>
      </div>
    </Link>
  );
}

function PersonaCard({ persona }) {
  return (
    <Link to={`/personas/${persona.id}/edit`} className="lore-press snap-start flex-shrink-0 w-[120px] sm:w-[140px] text-center group" data-testid={`persona-card-${persona.id}`}>
      <div className="rounded-2xl overflow-hidden aspect-square bg-lore-card border border-lore relative">
        {persona.avatar_path ? (
          <AuthImage path={persona.avatar_path} className="w-full h-full object-cover transition-transform group-hover:scale-[1.04]"/>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl lore-gold">{(persona.name || "?")[0]}</div>
        )}
      </div>
      <p className="text-sm mt-2 lore-cream truncate font-medium">{persona.name}</p>
    </Link>
  );
}

function CreateTile({ to, label }) {
  return (
    <Link to={to} className="lore-press snap-start flex-shrink-0 w-[148px] sm:w-[200px]">
      <div className="rounded-2xl border border-dashed border-lore bg-lore-card/50 aspect-[3/4] flex flex-col items-center justify-center hover:border-[#D8B982]/60 transition cursor-pointer">
        <div className="w-10 h-10 rounded-full bg-lore-card-2 flex items-center justify-center mb-2 border border-lore"><Plus className="w-5 h-5 lore-gold"/></div>
        <p className="text-sm lore-cream">{label}</p>
      </div>
    </Link>
  );
}

function EmptyCard({ title, sub, cta, to }) {
  return (
    <div className="snap-start flex-shrink-0 w-[280px] sm:w-[360px] rounded-2xl border border-dashed border-lore bg-lore-card/50 p-5 flex flex-col justify-center">
      <p className="text-base lore-cream font-semibold">{title}</p>
      <p className="text-xs lore-taupe mt-1 leading-relaxed">{sub}</p>
      <Link to={to} className="lore-press mt-3 self-start bg-[#D8B982] hover:bg-[#E0C798] text-[#15110F] rounded-xl px-4 py-1.5 text-xs font-semibold">{cta}</Link>
    </div>
  );
}
