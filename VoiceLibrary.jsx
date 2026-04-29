import React, { useEffect, useRef, useState } from "react";
import AppShell from "../components/AppShell";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Mic, Trash2, Upload, Globe, Lock } from "lucide-react";
import AudioBubble from "../components/AudioBubble";

export default function VoiceLibrary() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", is_public: false, voice_path: "" });
  const fileRef = useRef(null);

  const load = () => api.get("/voices").then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const pickAudio = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      const fd = new FormData(); fd.append("file", f);
      const r = await api.post("/upload?folder=voices", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm({ ...form, voice_path: r.data.path });
      toast.success("Audio ready");
    } catch { toast.error("Upload failed"); }
    e.target.value = "";
  };

  const create = async () => {
    if (!form.name.trim() || !form.voice_path) { toast.error("Name + audio required"); return; }
    setBusy(true);
    try {
      await api.post("/voices", form);
      setForm({ name: "", description: "", is_public: false, voice_path: "" });
      toast.success("Voice added");
      load();
    } catch { toast.error("Failed"); }
    finally { setBusy(false); }
  };

  const remove = async (id) => {
    try { await api.delete(`/voices/${id}`); setItems((x) => x.filter((v) => v.id !== id)); }
    catch { toast.error("Failed"); }
  };

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="voices-title">Voice library</h1>
          <p className="text-sm text-[#9DA3AE] mt-1">Upload voice samples to use as references for your characters.</p>

          <div className="mt-6 bg-[#13151B] border border-[#1E222B] rounded-2xl p-5 space-y-3" data-testid="voice-upload-card">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Voice name (e.g. Warm Storyteller)" className="w-full bg-[#0E1015] border border-[#22252D] rounded-lg px-3 py-2 text-[#E8EAED]" data-testid="voice-name"/>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Short description" className="w-full bg-[#0E1015] border border-[#22252D] rounded-lg px-3 py-2 text-[#E8EAED]" data-testid="voice-description"/>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => fileRef.current?.click()} className="px-3 py-1.5 bg-[#1A1D24] hover:bg-[#22252D] border border-[#22252D] rounded-lg text-sm inline-flex items-center gap-1.5" data-testid="voice-pick-file">
                <Upload className="w-4 h-4"/> {form.voice_path ? "Replace audio" : "Upload audio"}
              </button>
              <input ref={fileRef} type="file" accept="audio/*" hidden onChange={pickAudio} data-testid="voice-file-input"/>
              <label className="flex items-center gap-2 text-sm text-[#9DA3AE] ml-auto cursor-pointer">
                <input type="checkbox" checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} className="accent-[#D8B982]" data-testid="voice-public-toggle"/>
                Public
              </label>
              <button onClick={create} disabled={busy || !form.name.trim() || !form.voice_path} className="px-4 py-1.5 bg-[#D8B982] hover:bg-[#E0C798] disabled:opacity-40 text-white rounded-lg text-sm font-medium" data-testid="voice-create">
                Add voice
              </button>
            </div>
            {form.voice_path && (
              <div className="rounded-xl bg-[#0E1015] border border-[#22252D] px-3 py-2">
                <AudioBubble path={form.voice_path}/>
              </div>
            )}
          </div>

          <div className="mt-6 space-y-2">
            {items.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-[#22252D] rounded-2xl text-[#9DA3AE]" data-testid="voices-empty">
                <Mic className="w-7 h-7 mx-auto mb-2 text-[#D8B982]"/>
                <p>No voices yet — upload one above.</p>
              </div>
            ) : items.map((v) => (
              <div key={v.id} className="bg-[#13151B] border border-[#22252D] rounded-xl p-3 flex items-center gap-3" data-testid={`voice-${v.id}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{v.name} {v.is_public ? <Globe className="inline w-3 h-3 text-[#D8B982] ml-1"/> : <Lock className="inline w-3 h-3 text-[#6E7585] ml-1"/>}</p>
                  {v.description && <p className="text-xs text-[#9DA3AE]">{v.description}</p>}
                  <div className="mt-2"><AudioBubble path={v.voice_path}/></div>
                </div>
                <button onClick={() => remove(v.id)} className="text-[#9DA3AE] hover:text-red-400 p-2" data-testid={`voice-delete-${v.id}`}><Trash2 className="w-4 h-4"/></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
