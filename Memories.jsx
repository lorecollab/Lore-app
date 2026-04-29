import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import Avatar from "../components/Avatar";
import { api } from "../lib/api";
import { toast } from "sonner";
import { ArrowLeft, MessageCircle, Trash2, Pin, PinOff, Pencil, Plus, Check, X } from "lucide-react";

const TYPE_COLORS = {
  event: "bg-[#D8B982]/15 text-[#D8B982]",
  relationship: "bg-pink-500/15 text-pink-300",
  emotion: "bg-amber-500/15 text-amber-300",
  fact: "bg-cyan-500/15 text-cyan-300",
  story: "bg-[#D8B982]/15 text-[#D8B982]",
};

const TYPES = ["event", "relationship", "emotion", "fact", "story"];

export default function Memories() {
  const { id } = useParams();
  const [c, setC] = useState(null);
  const [mems, setMems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newMem, setNewMem] = useState({ type: "fact", content: "", pinned: false });
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    Promise.all([api.get(`/characters/${id}`), api.get(`/characters/${id}/memories`)])
      .then(([a, b]) => { setC(a.data); setMems(sortMems(b.data)); })
      .catch(() => toast.error("Could not load memories"))
      .finally(() => setLoading(false));
  }, [id]);

  const sortMems = (xs) => [...xs].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.created_at > a.created_at ? 1 : -1));

  const remove = async (mid) => {
    try { await api.delete(`/characters/${id}/memories/${mid}`); setMems((m) => m.filter((x) => x.id !== mid)); toast.success("Removed"); }
    catch { toast.error("Failed"); }
  };
  const togglePin = async (m) => {
    try { const r = await api.patch(`/memories/${m.id}`, { pinned: !m.pinned });
      setMems((arr) => sortMems(arr.map((x) => x.id === m.id ? r.data : x))); }
    catch { toast.error("Failed"); }
  };
  const create = async () => {
    if (!newMem.content.trim()) return;
    try {
      const r = await api.post(`/characters/${id}/memories`, newMem);
      setMems((arr) => sortMems([r.data, ...arr]));
      setNewMem({ type: "fact", content: "", pinned: false });
      setShowAdd(false);
      toast.success("Memory saved");
    } catch { toast.error("Failed"); }
  };
  const startEdit = (m) => { setEditingId(m.id); setEditText(m.content); };
  const saveEdit = async () => {
    try { const r = await api.patch(`/memories/${editingId}`, { content: editText });
      setMems((arr) => arr.map((x) => x.id === editingId ? r.data : x));
      setEditingId(null); setEditText(""); }
    catch { toast.error("Failed"); }
  };

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <Link to={`/characters/${id}`} className="text-[#A99B91] hover:text-[#F7EFE6] text-sm inline-flex items-center gap-1.5 mb-6" data-testid="memories-back">
            <ArrowLeft className="w-4 h-4"/> Back to profile
          </Link>
          <div className="flex items-center gap-3 mb-8">
            <Avatar name={c?.name} path={c?.avatar_path} size={48}/>
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight" data-testid="memories-title">{c ? `${c.name}'s memories` : "Memories"}</h1>
              <p className="text-sm text-[#A99B91]">Pinned moments stay at the top — and weigh more in replies.</p>
            </div>
            <button onClick={() => setShowAdd((v) => !v)} className="px-3 py-1.5 bg-[#D8B982] hover:bg-[#E0C798] text-white rounded-lg text-sm inline-flex items-center gap-1" data-testid="memories-add-btn">
              <Plus className="w-4 h-4"/> Add
            </button>
          </div>

          {showAdd && (
            <div className="bg-[#13151B] border border-[#1E222B] rounded-2xl p-4 mb-4 space-y-2" data-testid="memories-add-form">
              <select value={newMem.type} onChange={(e) => setNewMem({ ...newMem, type: e.target.value })}
                className="w-full bg-[#211B18] border border-[#3A2F2A] rounded-lg px-3 py-2 text-[#F7EFE6]" data-testid="memories-add-type">
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <textarea value={newMem.content} onChange={(e) => setNewMem({ ...newMem, content: e.target.value })} rows={2}
                placeholder="What should they always remember?" className="w-full bg-[#211B18] border border-[#3A2F2A] rounded-lg px-3 py-2 text-[#F7EFE6] resize-none" data-testid="memories-add-content"/>
              <label className="flex items-center gap-2 text-sm text-[#A99B91]">
                <input type="checkbox" checked={newMem.pinned} onChange={(e) => setNewMem({ ...newMem, pinned: e.target.checked })} className="accent-[#D8B982]" data-testid="memories-add-pinned"/>
                Pin this memory
              </label>
              <button onClick={create} className="px-4 py-1.5 bg-[#D8B982] hover:bg-[#E0C798] text-white rounded-lg text-sm font-medium" data-testid="memories-add-save">Save memory</button>
            </div>
          )}

          {c && (
            <Link to={`/chat/${id}`} className="inline-flex items-center gap-2 px-4 py-2 bg-[#241F1C] hover:bg-[#3A2F2A] border border-[#3A2F2A] text-[#F7EFE6] rounded-lg text-sm font-medium mb-6" data-testid="memories-chat-link">
              <MessageCircle className="w-4 h-4"/> Continue conversation
            </Link>
          )}

          {loading ? (
            <div className="text-[#7A6D62]" data-testid="memories-loading">Loading…</div>
          ) : mems.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-[#3A2F2A] rounded-2xl" data-testid="memories-empty">
              <p className="text-[#F7EFE6] font-medium">No memories yet</p>
              <p className="text-sm text-[#A99B91] mt-1">Chat with them — meaningful moments save here automatically.</p>
            </div>
          ) : (
            <div className="space-y-2" data-testid="memories-list">
              {mems.map((m) => (
                <div key={m.id} className={`group flex items-start gap-3 bg-[#13151B] border rounded-xl p-4 ${m.pinned ? "border-[#D8B982]/40" : "border-[#3A2F2A]"}`} data-testid={`memory-${m.id}`}>
                  <span className={`text-[10px] uppercase tracking-wide font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[m.type] || "bg-[#241F1C] text-[#A99B91]"}`}>{m.type}</span>
                  <div className="flex-1 min-w-0">
                    {editingId === m.id ? (
                      <>
                        <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={2}
                          className="w-full bg-[#211B18] border border-[#3A2F2A] rounded-lg px-2 py-1.5 text-sm text-[#F7EFE6] resize-none" data-testid={`memory-edit-textarea-${m.id}`}/>
                        <div className="flex gap-2 mt-2">
                          <button onClick={saveEdit} className="px-3 py-1 bg-[#D8B982] hover:bg-[#E0C798] text-white rounded text-xs inline-flex items-center gap-1" data-testid={`memory-edit-save-${m.id}`}><Check className="w-3 h-3"/>Save</button>
                          <button onClick={() => { setEditingId(null); setEditText(""); }} className="px-3 py-1 text-[#A99B91] text-xs inline-flex items-center gap-1"><X className="w-3 h-3"/>Cancel</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-[#F7EFE6]">{m.content}</p>
                        <p className="text-xs text-[#7A6D62] mt-1">{new Date(m.created_at).toLocaleString()}</p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => togglePin(m)} className={`p-1.5 rounded ${m.pinned ? "text-[#D8B982]" : "text-[#7A6D62] hover:text-[#D8B982]"}`} title={m.pinned ? "Unpin" : "Pin"} data-testid={`memory-pin-${m.id}`}>
                      {m.pinned ? <Pin className="w-4 h-4 fill-current"/> : <PinOff className="w-4 h-4"/>}
                    </button>
                    <button onClick={() => startEdit(m)} className="p-1.5 text-[#7A6D62] hover:text-[#D8B982]" title="Edit" data-testid={`memory-edit-${m.id}`}><Pencil className="w-4 h-4"/></button>
                    <button onClick={() => remove(m.id)} className="p-1.5 text-[#7A6D62] hover:text-red-400" data-testid={`memory-delete-${m.id}`} title="Delete"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
