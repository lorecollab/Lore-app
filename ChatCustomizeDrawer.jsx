import React, { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { X, Image as ImageIcon, Film } from "lucide-react";

const TYPING_STYLES = [
  { id: "auto", label: "Auto (from personality + scene)" },
  { id: "smooth", label: "Smooth" },
  { id: "fast", label: "Fast" },
  { id: "slow", label: "Slow / thoughtful" },
  { id: "shy", label: "Shy / pause-heavy" },
  { id: "dramatic", label: "Dramatic pauses" },
  { id: "angry", label: "Sharp / angry" },
  { id: "sad", label: "Sad" },
  { id: "casual", label: "Casual" },
  { id: "detailed", label: "Detailed / writer" },
  { id: "emotional", label: "Emotional" },
  { id: "dry", label: "Dry / sarcastic" },
];

export default function ChatCustomizeDrawer({ open, onClose, characterId, settings, onChange }) {
  const fileRef = useRef(null);
  const [s, setS] = useState(settings || {});
  useEffect(() => setS(settings || {}), [settings]);
  if (!open) return null;

  const isVideoBg = (s.background_path || "").match(/\.(mp4|webm|mov|ogg)$/i);

  const save = async (patch) => {
    const next = { ...s, ...patch };
    setS(next);
    try {
      const r = await api.put(`/characters/${characterId}/settings`, { ...patch });
      // backend returns full doc — prefer it
      onChange?.(r.data || next);
      setS(r.data || next);
    } catch { toast.error("Save failed"); }
  };

  const pickBg = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const isVid = f.type.startsWith("video/");
    if (isVid && f.size > 20 * 1024 * 1024) { toast.error("Max video 20MB"); e.target.value = ""; return; }
    if (!isVid && f.size > 5 * 1024 * 1024) { toast.error("Max image 5MB"); e.target.value = ""; return; }
    try {
      const fd = new FormData(); fd.append("file", f);
      const r = await api.post("/upload?folder=chatbg", fd, { headers: { "Content-Type": "multipart/form-data" } });
      await save({ background_path: r.data.path });
      toast.success(isVid ? "Video background uploaded" : "Background uploaded");
    } catch { toast.error("Upload failed"); }
    e.target.value = "";
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center" data-testid="chat-customize-drawer">
      <div className="absolute inset-0 bg-black/60" onClick={onClose}/>
      <div className="relative bg-[#13151B] border border-[#1E222B] w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Customize this chat</h3>
          <button onClick={onClose} className="text-[#9DA3AE] hover:text-white p-1" data-testid="customize-close" aria-label="Close"><X className="w-5 h-5"/></button>
        </div>

        <Field label={`Background ${isVideoBg ? "(video)" : ""}`}>
          <div className="flex items-center gap-2">
            <button onClick={() => fileRef.current?.click()} className="px-3 py-1.5 bg-[#0E1015] hover:bg-[#1A1D24] border border-[#22252D] rounded-lg text-sm inline-flex items-center gap-1.5" data-testid="customize-bg-upload">
              {isVideoBg ? <Film className="w-4 h-4"/> : <ImageIcon className="w-4 h-4"/>}
              {s.background_path ? "Replace" : "Upload image / video"}
            </button>
            {s.background_path && <button onClick={() => save({ background_path: "" })} className="text-xs text-[#9DA3AE] hover:text-red-400" data-testid="customize-bg-remove">Remove</button>}
            <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm,video/quicktime" hidden onChange={pickBg} data-testid="customize-bg-input"/>
          </div>
          <p className="text-[11px] text-[#6E7585] mt-1">Image up to 5MB · video up to 20MB (mp4/webm/mov)</p>
        </Field>

        <Field label={`Blur · ${s.background_blur ?? 6}px`}>
          <input type="range" min={0} max={20} value={s.background_blur ?? 6} onChange={(e) => save({ background_blur: +e.target.value })} className="w-full accent-[#D8B982]" data-testid="customize-blur"/>
        </Field>

        <Field label={`Dim · ${s.background_dim ?? 50}%`}>
          <input type="range" min={0} max={90} value={s.background_dim ?? 50} onChange={(e) => save({ background_dim: +e.target.value })} className="w-full accent-[#D8B982]" data-testid="customize-dim"/>
        </Field>

        <Field label="Your bubble color">
          <input type="color" value={s.user_bubble_color || "#6366F1"} onChange={(e) => save({ user_bubble_color: e.target.value })} className="w-12 h-9 bg-transparent border-0" data-testid="customize-user-color"/>
        </Field>

        <Field label="Their bubble color">
          <input type="color" value={s.char_bubble_color || "#1A1D24"} onChange={(e) => save({ char_bubble_color: e.target.value })} className="w-12 h-9 bg-transparent border-0" data-testid="customize-char-color"/>
        </Field>

        <Field label={`Font size · ${s.font_size ?? 15}px`}>
          <input type="range" min={13} max={20} value={s.font_size ?? 15} onChange={(e) => save({ font_size: +e.target.value })} className="w-full accent-[#D8B982]" data-testid="customize-font"/>
        </Field>

        <Field label="Glow / aura">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={s.glow_enabled ?? true} onChange={(e) => save({ glow_enabled: e.target.checked })} className="accent-[#D8B982]" data-testid="customize-glow"/>
            <span className="text-sm text-[#9DA3AE]">Enable scene mood aura around character</span>
          </label>
        </Field>

        <Field label="Typing personality">
          <select value={s.typing_style || "auto"} onChange={(e) => save({ typing_style: e.target.value })}
            className="w-full bg-[#0E1015] border border-[#22252D] rounded-lg px-3 py-2 text-[#E8EAED]" data-testid="customize-typing-style">
            {TYPING_STYLES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </Field>

        <Field label={`Animation speed · ${(s.animation_speed ?? 1.0).toFixed(2)}×`}>
          <input
            type="range" min={0.5} max={2.0} step={0.05}
            value={s.animation_speed ?? 1.0}
            onChange={(e) => save({ animation_speed: +e.target.value })}
            className="w-full accent-[#D8B982]" data-testid="customize-anim-speed"
          />
          <div className="flex justify-between text-[10px] text-[#6E7585] mt-0.5"><span>slower</span><span>faster</span></div>
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-4">
      <p className="text-xs text-[#9DA3AE] mb-1.5">{label}</p>
      {children}
    </div>
  );
}
