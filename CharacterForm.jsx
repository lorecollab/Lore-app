import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import AuthImage from "../components/AuthImage";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Camera, Plus, Trash2, X } from "lucide-react";

const BASIC_FIELDS = [
  { key: "name", label: "Name", placeholder: "e.g. Aria Chen", required: true, full: false },
  { key: "description", label: "Short description", placeholder: "Witty coffee-shop barista who loves sci-fi", required: true, full: true, textarea: true, rows: 2 },
];

const PERSONA_FIELDS = [
  { key: "age", label: "Age", placeholder: "27" },
  { key: "role", label: "Role / Occupation", placeholder: "Barista" },
  { key: "personality", label: "Personality", textarea: true, placeholder: "Curious, dry humor, kind-hearted" },
  { key: "speech_style", label: "Speech style", textarea: true, placeholder: "Casual, quick replies, lots of puns" },
  { key: "core_traits", label: "Core traits", textarea: true, placeholder: "Observant · Loyal · Impulsive" },
  { key: "background", label: "Background", textarea: true, placeholder: "Grew up in Seattle, moved to Tokyo for college…" },
  { key: "relationships", label: "Relationships", textarea: true, placeholder: "You're a regular at the shop they work at" },
  { key: "habits", label: "Habits", textarea: true, placeholder: "Always doodles on napkins, drinks too much espresso" },
  { key: "boundaries", label: "Boundaries", textarea: true, placeholder: "Doesn't discuss their estranged father" },
  { key: "initial_scene", label: "Opening scene (optional)", placeholder: "The coffee shop, Tuesday morning" },
];

export default function CharacterForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const nav = useNavigate();
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    name: "", description: "", avatar_path: "",
    age: "", role: "", personality: "", speech_style: "", core_traits: "",
    background: "", relationships: "", habits: "", boundaries: "", initial_scene: "",
    greetings: [""], example_messages: [""], is_public: false,
    voice_sample_path: "",
  });
  const [busy, setBusy] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");

  useEffect(() => {
    if (!editing) return;
    api.get(`/characters/${id}`).then((r) => {
      setForm({
        ...r.data,
        greetings: r.data.greetings?.length ? r.data.greetings : [""],
        example_messages: r.data.example_messages?.length ? r.data.example_messages : [""],
      });
    }).catch(() => toast.error("Could not load character"));
  }, [id, editing]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const pickAvatar = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarPreview(URL.createObjectURL(f));
    try {
      const fd = new FormData();
      fd.append("file", f);
      const r = await api.post("/upload?folder=avatars", fd, { headers: { "Content-Type": "multipart/form-data" } });
      set("avatar_path", r.data.path);
      toast.success("Avatar uploaded");
    } catch { toast.error("Upload failed"); }
    e.target.value = "";
  };

  const setArrayField = (key, idx, val) => {
    const copy = [...form[key]];
    copy[idx] = val;
    set(key, copy);
  };
  const addArrayItem = (key) => set(key, [...form[key], ""]);
  const removeArrayItem = (key, idx) => {
    const copy = form[key].filter((_, i) => i !== idx);
    set(key, copy.length ? copy : [""]);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setBusy(true);
    const payload = {
      ...form,
      greetings: form.greetings.filter((x) => x.trim()),
      example_messages: form.example_messages.filter((x) => x.trim()),
    };
    try {
      if (editing) { await api.put(`/characters/${id}`, payload); toast.success("Saved"); }
      else { const r = await api.post("/characters", payload); toast.success("Character created"); nav(`/chat/${r.data.id}`); return; }
      nav(`/characters/${id}`);
    } catch { toast.error("Save failed"); }
    finally { setBusy(false); }
  };

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2" data-testid="character-form-title">
            {editing ? "Edit Character" : "Create Character"}
          </h1>
          <p className="text-sm text-[#9DA3AE] mb-8">
            Give your character a voice, history, and personality. You can update anything later.
          </p>

          <form onSubmit={submit} className="space-y-8" data-testid="character-form">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-[#1A1D24] overflow-hidden flex items-center justify-center border border-[#22252D]">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="w-full h-full object-cover"/>
                ) : form.avatar_path ? (
                  <AuthImage path={form.avatar_path} alt="avatar" className="w-full h-full object-cover"/>
                ) : (
                  <Camera className="w-6 h-6 text-[#6E7585]"/>
                )}
              </div>
              <div>
                <button type="button" onClick={() => fileRef.current?.click()} className="px-4 py-2 bg-[#1A1D24] hover:bg-[#22252D] border border-[#22252D] text-[#E8EAED] rounded-lg text-sm font-medium" data-testid="avatar-upload-btn">
                  {form.avatar_path ? "Change photo" : "Upload photo"}
                </button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickAvatar} data-testid="avatar-file-input"/>
                <p className="text-xs text-[#6E7585] mt-1.5">JPG, PNG, or WEBP · up to 5MB</p>
              </div>
            </div>

            {/* Basic */}
            <Section title="Basics">
              {BASIC_FIELDS.map((f) => (
                <FormField key={f.key} label={f.label} required={f.required}>
                  {f.textarea ? (
                    <textarea rows={f.rows || 2} required={f.required} value={form[f.key]} placeholder={f.placeholder}
                      onChange={(e) => set(f.key, e.target.value)} className="lore-input resize-none" data-testid={`field-${f.key}`}/>
                  ) : (
                    <input required={f.required} value={form[f.key]} placeholder={f.placeholder}
                      onChange={(e) => set(f.key, e.target.value)} className="lore-input" data-testid={`field-${f.key}`}/>
                  )}
                </FormField>
              ))}
            </Section>

            {/* Greetings */}
            <Section title="Greetings" hint="The character picks one of these when a new chat starts.">
              {form.greetings.map((g, i) => (
                <div key={i} className="flex gap-2" data-testid={`greeting-row-${i}`}>
                  <textarea rows={2} value={g} onChange={(e) => setArrayField("greetings", i, e.target.value)}
                    placeholder="Hey! Long time no see. What have you been up to?"
                    className="lore-input resize-none flex-1" data-testid={`greeting-${i}`}/>
                  <button type="button" onClick={() => removeArrayItem("greetings", i)} className="text-[#6E7585] hover:text-red-400 px-2" data-testid={`greeting-remove-${i}`}>
                    <Trash2 className="w-4 h-4"/>
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => addArrayItem("greetings")} className="text-[#D8B982] hover:text-[#D8B982] text-sm font-medium inline-flex items-center gap-1" data-testid="greeting-add">
                <Plus className="w-4 h-4"/> Add greeting
              </button>
            </Section>

            {/* Example messages */}
            <Section title="Example messages" hint="Short lines that match your character's voice. Helps keep them consistent.">
              {form.example_messages.map((m, i) => (
                <div key={i} className="flex gap-2" data-testid={`example-row-${i}`}>
                  <input value={m} onChange={(e) => setArrayField("example_messages", i, e.target.value)}
                    placeholder={`e.g. "Ha! That's exactly something I'd say."`}
                    className="lore-input flex-1" data-testid={`example-${i}`}/>
                  <button type="button" onClick={() => removeArrayItem("example_messages", i)} className="text-[#6E7585] hover:text-red-400 px-2" data-testid={`example-remove-${i}`}>
                    <Trash2 className="w-4 h-4"/>
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => addArrayItem("example_messages")} className="text-[#D8B982] hover:text-[#D8B982] text-sm font-medium inline-flex items-center gap-1" data-testid="example-add">
                <Plus className="w-4 h-4"/> Add example
              </button>
            </Section>

            {/* Persona */}
            <Section title="Persona">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PERSONA_FIELDS.map((f) => (
                  <FormField key={f.key} label={f.label} className={f.textarea ? "sm:col-span-2" : ""}>
                    {f.textarea ? (
                      <textarea rows={2} value={form[f.key]} placeholder={f.placeholder}
                        onChange={(e) => set(f.key, e.target.value)} className="lore-input resize-none" data-testid={`field-${f.key}`}/>
                    ) : (
                      <input value={form[f.key]} placeholder={f.placeholder}
                        onChange={(e) => set(f.key, e.target.value)} className="lore-input" data-testid={`field-${f.key}`}/>
                    )}
                  </FormField>
                ))}
              </div>
            </Section>

            {/* Public toggle */}
            <Section title="Visibility">
              <label className="flex items-center justify-between gap-4 p-4 bg-[#13151B] border border-[#22252D] rounded-lg cursor-pointer" data-testid="visibility-toggle">
                <div>
                  <p className="font-medium text-[#E8EAED]">Public character</p>
                  <p className="text-sm text-[#9DA3AE]">Others can discover and chat with them. You stay the owner.</p>
                </div>
                <input type="checkbox" checked={form.is_public} onChange={(e) => set("is_public", e.target.checked)}
                  className="w-5 h-5 accent-[#D8B982]" data-testid="is-public"/>
              </label>
            </Section>

            {/* Voice */}
            <VoiceSection form={form} set={set} />

            <div className="flex gap-3 pt-4">
              <button type="submit" disabled={busy}
                className="px-6 py-2.5 bg-[#D8B982] hover:bg-[#E0C798] text-white rounded-lg font-medium disabled:opacity-50"
                data-testid="character-save-btn">
                {busy ? "Saving…" : editing ? "Save changes" : "Create character"}
              </button>
              <button type="button" onClick={() => nav(-1)} className="px-6 py-2.5 text-[#9DA3AE] hover:text-[#E8EAED] font-medium" data-testid="character-cancel-btn">
                Cancel
              </button>
            </div>
          </form>

          <style>{`
            .lore-input {
              width: 100%; background: #13151B; border: 1px solid #22252D;
              color: #E8EAED; border-radius: 0.5rem; padding: 0.625rem 0.875rem;
              font-size: 0.9rem; outline: none; transition: border-color .15s, box-shadow .15s;
            }
            .lore-input::placeholder { color: #6E7585; }
            .lore-input:focus { border-color: #6366F1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
          `}</style>
        </div>
      </div>
    </AppShell>
  );
}

function Section({ title, hint, children }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-semibold text-[#E8EAED]">{title}</h3>
        {hint && <p className="text-xs text-[#9DA3AE] mt-0.5">{hint}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function FormField({ label, required, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-sm text-[#9DA3AE] mb-1.5">{label}{required && <span className="text-[#D8B982]"> *</span>}</span>
      {children}
    </label>
  );
}

const VOICES = [];

function VoiceSection({ form, set }) {
  const sampleRef = React.useRef(null);

  const pickSample = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const fd = new FormData();
      fd.append("file", f);
      const r = await api.post("/upload?folder=voicesamples", fd, { headers: { "Content-Type": "multipart/form-data" } });
      set("voice_sample_path", r.data.path);
      toast.success("Sample uploaded — used as a tone reference.");
    } catch { toast.error("Upload failed"); }
    e.target.value = "";
  };

  return (
    <Section title="Voice (optional)" hint="Upload a short audio sample to give your character's voice a tone reference. Audio is for playback only — never used for cloning or biometric ID.">
      <div className="mt-1">
        <label className="block">
          <span className="block text-sm text-[#9DA3AE] mb-1.5">Voice sample</span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => sampleRef.current?.click()} className="px-4 py-2 bg-[#211B18] hover:bg-[#241F1C] border border-[#3A2F2A] text-[#F7EFE6] rounded-xl text-sm font-medium" data-testid="voice-sample-upload">
              {form.voice_sample_path ? "Replace sample" : "Upload sample"}
            </button>
            {form.voice_sample_path && (
              <span className="text-xs text-[#A99B91] truncate">Saved as reference</span>
            )}
            <input ref={sampleRef} type="file" accept="audio/mp3,audio/mpeg,audio/m4a,audio/wav,audio/x-m4a" hidden onChange={pickSample} data-testid="voice-sample-input"/>
          </div>
          <p className="text-xs text-[#A99B91] mt-1.5">MP3 / M4A / WAV · up to 60s · max 10MB.</p>
        </label>
      </div>
    </Section>
  );
}
