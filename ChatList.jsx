import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import AppShell from "../components/AppShell";
import Avatar from "../components/Avatar";
import { Search, MessageSquarePlus, Trash2, Eraser, Pin, X } from "lucide-react";
import { toast } from "sonner";

function previewText(msg) {
  if (!msg) return "Start a new conversation";
  if (!msg.content && msg.image_path) return "📷 Photo";
  return msg.content || "";
}

export default function ChatList() {
  const [chats, setChats] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);   // { kind: 'delete'|'clear', id, name }
  const nav = useNavigate();

  const load = async () => {
    try {
      setLoading(true);
      const r = await api.get("/chats/recent");
      setChats(r.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const doDelete = async (cid) => {
    try { await api.delete(`/characters/${cid}/chat`); toast.success("Chat deleted"); load(); }
    catch { toast.error("Couldn't delete"); }
  };
  const doClear = async (cid) => {
    try { await api.delete(`/characters/${cid}/messages`); toast.success("Messages cleared"); load(); }
    catch { toast.error("Couldn't clear"); }
  };

  const filtered = chats.filter((c) => c.character.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto bg-lore" data-testid="chats-root">
        <div className="sticky top-0 z-10 bg-lore/85 backdrop-blur-md border-b border-lore">
          <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
            <h1 className="text-2xl font-semibold lore-cream">Chats</h1>
            <Link to="/characters/new" className="ml-auto lore-press p-2 rounded-full lore-cream hover:bg-[#241F1C]" data-testid="chats-new" aria-label="New character">
              <MessageSquarePlus className="w-5 h-5"/>
            </Link>
          </div>
          <div className="max-w-2xl mx-auto px-5 pb-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 lore-taupe"/>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats"
                className="w-full bg-lore-card border border-lore rounded-2xl pl-9 pr-3 py-2 text-sm lore-cream placeholder:text-[#7A6D62] outline-none focus:border-[#D8B982]/60"
                data-testid="chats-search"/>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto pb-28">
          {loading ? (
            <div className="lore-spinner mx-auto mt-12"/>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 px-6">
              <p className="lore-cream text-lg mb-1">No conversations yet</p>
              <p className="lore-taupe text-sm mb-5">Start with someone unforgettable.</p>
              <Link to="/home" className="lore-press inline-block bg-[#D8B982] hover:bg-[#E0C798] text-[#15110F] rounded-2xl px-5 py-2.5 font-semibold text-sm" data-testid="chats-empty-cta">Browse characters</Link>
            </div>
          ) : (
            <ul className="px-2 pt-2">
              {filtered.map(({ character: c, last_message }) => (
                <ChatRow
                  key={c.id}
                  character={c}
                  last={last_message}
                  onOpen={() => nav(`/chat/${c.id}`)}
                  onSwipeDelete={() => setConfirm({ kind: "delete", id: c.id, name: c.name })}
                  onSwipeClear={() => setConfirm({ kind: "clear", id: c.id, name: c.name })}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Confirm modal */}
        {confirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6" data-testid="chat-confirm">
            <div className="absolute inset-0 bg-black/65" onClick={() => setConfirm(null)}/>
            <div className="relative lore-glass rounded-2xl p-5 max-w-xs w-full text-center lore-fade-up">
              <p className="text-base lore-cream mb-1">
                {confirm.kind === "delete" ? `Delete chat with ${confirm.name}?` : `Clear messages with ${confirm.name}?`}
              </p>
              <p className="text-xs lore-taupe mb-5">
                {confirm.kind === "delete" ? "This cannot be undone. The character is kept." : "Removes all messages but keeps the chat in your list."}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirm(null)} className="flex-1 lore-press py-2.5 rounded-xl bg-lore-card-2 lore-cream text-sm font-medium" data-testid="chat-confirm-cancel">Cancel</button>
                <button
                  onClick={async () => {
                    const t = confirm; setConfirm(null);
                    if (t.kind === "delete") await doDelete(t.id); else await doClear(t.id);
                  }}
                  className={`flex-1 lore-press py-2.5 rounded-xl text-sm font-semibold ${confirm.kind === "delete" ? "bg-[#FF6B6B] text-white" : "bg-[#D8B982] text-[#15110F]"}`}
                  data-testid="chat-confirm-go">
                  {confirm.kind === "delete" ? "Delete" : "Clear"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ChatRow({ character: c, last, onOpen, onSwipeDelete, onSwipeClear }) {
  const [dx, setDx] = useState(0);
  const [pressed, setPressed] = useState(false);
  const startX = useRef(0);
  const startT = useRef(0);
  const startY = useRef(0);
  const dxRef = useRef(0);

  const setDxBoth = (v) => { dxRef.current = v; setDx(v); };

  const onStart = (e) => {
    const t = e.touches?.[0] || e;
    startX.current = t.clientX;
    startY.current = t.clientY;
    startT.current = Date.now();
    setPressed(true);
  };
  const onMove = (e) => {
    const t = e.touches?.[0] || e;
    const ddx = t.clientX - startX.current;
    const ddy = t.clientY - startY.current;
    if (Math.abs(ddy) > Math.abs(ddx) * 1.2) return;
    setDxBoth(Math.max(-160, Math.min(40, ddx)));
  };
  const onEnd = () => {
    setPressed(false);
    const moved = dxRef.current;
    const dt = Date.now() - startT.current;
    const wasOpen = dxRef.current <= -100;
    if (moved < -100) {
      setDxBoth(-140);
    } else if (moved > -10 && moved < 10 && dt < 250 && !wasOpen) {
      onOpen();
      setDxBoth(0);
    } else {
      setDxBoth(0);
    }
  };

  // helper to wrap swipe-button onClick — fully isolates click from row gesture
  const stop = (fn) => (e) => { e.preventDefault(); e.stopPropagation(); fn(); };

  return (
    <li className="relative overflow-hidden rounded-2xl my-1 select-none" data-testid={`chat-row-${c.id}`}
        onContextMenu={(e) => e.preventDefault()}>
      {/* Right-side action layer (always on top of row when row is shifted) */}
      <div className="absolute inset-y-0 right-0 z-20 flex items-stretch gap-1 pr-2" aria-hidden>
        <button
          onClick={stop(onSwipeClear)}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="my-1 w-16 rounded-2xl bg-[#3A2F2A] text-[#F7EFE6] text-[11px] font-medium flex flex-col items-center justify-center"
          data-testid={`chat-swipe-clear-${c.id}`}>
          <Eraser className="w-4 h-4 mb-0.5"/>Clear
        </button>
        <button
          onClick={stop(onSwipeDelete)}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="my-1 w-16 rounded-2xl bg-[#FF6B6B] text-white text-[11px] font-medium flex flex-col items-center justify-center"
          data-testid={`chat-swipe-delete-${c.id}`}>
          <Trash2 className="w-4 h-4 mb-0.5"/>Delete
        </button>
      </div>

      <div
        className={`relative z-10 flex items-center gap-3 px-3 py-3 rounded-2xl transition-transform ${pressed ? "scale-[0.99]" : ""}`}
        style={{ transform: `translateX(${dx}px)`, background: dx === 0 ? "transparent" : "rgba(33,27,24,0.95)" }}
        onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
        onMouseDown={onStart} onMouseMove={(e) => e.buttons === 1 && onMove(e)} onMouseUp={onEnd} onMouseLeave={onEnd}
      >
        <Avatar name={c.name} path={c.avatar_path} size={48}/>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-medium lore-cream truncate">{c.name}</p>
          <p className="text-xs lore-taupe truncate line-clamp-1">{previewText(last)}</p>
        </div>
        {dx < -50 && (
          <button onClick={(e) => { e.stopPropagation(); setDxBoth(0); }} className="absolute right-2 top-2 lore-taupe hover:lore-cream p-1" aria-label="Cancel swipe" data-testid={`chat-swipe-cancel-${c.id}`}>
            <X className="w-3.5 h-3.5"/>
          </button>
        )}
      </div>
    </li>
  );
}
