import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import AuthImage from "../components/AuthImage";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Camera } from "lucide-react";

const FIELDS = [
  { key: "age", label: "Age", placeholder: "27" },
  { key: "gender", label: "Gender", placeholder: "Female" },
  { key: "pronouns", label: "Pronouns", placeholder: "she/her" },
  { key: "height", label: "Height", placeholder: "5'6\"" },
  { key: "ethnicity", label: "Ethnicity", placeholder: "Japanese-American" },
  { key: "appearance", label: "Appearance", placeholder: "Freckles, soft features", textarea: true },
  { key: "hair_color", label: "Hair colour", placeholder: "Auburn" },
  { key: "hairstyle", label: "Hairstyle", placeholder: "Wavy, shoulder-length" },
  { key: "dress_code", label: "Dress code / fashion", placeholder: "Vintage thrift, oversized blazers", textarea: true },
  { key: "personality", label: "Personality", placeholder: "Curious, dry humor", textarea: true },
  { key: "background", label: "Background / lore", placeholder: "Grew up in Seattle…", textarea: true },
  { key: "family", label: "Family members", placeholder: "Two younger brothers", textarea: true },
  { key: "relationship_status", label: "Relationship status", placeholder: "Single" },
  { key: "occupation", label: "Occupation", placeholder: "Freelance photographer" },
  { key: "money_situation", label: "Money situation", placeholder: "Comfortable, paycheck to paycheck" },
  { key: "place_of_birth", label: "Place of birth", placeholder: "Portland, OR" },
  { key: "current_location", label: "Current location", placeholder: "Tokyo" },
  { key: "extra_details", label: "Extra details", placeholder: "Allergic to cats, can't drive", textarea: true },
];

const DEF_LIMIT = 32000;

export default function PersonaForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const nav = useNavigate();
  const fileRef = useRef(null);
  const [form, setForm] = useState(() => ({
    name: "", avatar_path: "", definition: "",
    ...Object.fromEntries(FIELDS.map((f) => [f.key, ""])),
  }));
  const [busy, setBusy] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");

  useEffect(() => {
    if (!editing) return;
    api.get(`/personas/${id}`).then((r) => setForm({ ...form, ...r.data }))
      .catch(() => toast.error("Could not load persona"));
    // eslint-disable-next-line
  }, [id, editing]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const pickAvatar = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarPreview(URL.createObjectURL(f));
    try {
      const fd = new FormData();
      fd.append("file", f);
      const r = await api.post("/upload?folder=personas", fd, { headers: { "Content-Type": "multipart/form-data" } });
      set("avatar_path", r.data.path);
      toast.success("Photo uploaded");
    } catch { toast.error("Upload failed"); }
    e.target.value = "";
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if ((form.definition || "").length > DEF_LIMIT) { toast.error(`Definition exceeds ${DEF_LIMIT} characters`); return; }
    setBusy(true);
    try {
      if (editing) { await api.put(`/personas/${id}`, form); toast.success("Saved"); }
      else { await api.post("/personas", form); toast.success("Persona created"); }
      nav("/personas");
    } catch { toast.error("Save failed"); }
    finally { setBusy(false); }
  };

  const defLen = (form.definition || "").length;

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2" data-testid="persona-form-title">
            {editing ? "Edit Persona" : "Create Persona"}
          </h1>
          <p className="text-sm text-[#A99B91] mb-8">
            Define who you are in the story. The character will respond to you as this person.
          </p>

          <form onSubmit={submit} className="space-y-8" data-testid="persona-form">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-[#241F1C] overflow-hidden flex items-center justify-center border border-[#3A2F2A]">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="w-full h-full object-cover"/>
                ) : form.avatar_path ? (
                  <AuthImage path={form.avatar_path} alt="avatar" className="w-full h-full object-cover"/>
                ) : (
                  <Camera className="w-6 h-6 text-[#7A6D62]"/>
                )}
              </div>
              <div>
                <button type="button" onClick={() => fileRef.current?.click()} className="px-4 py-2 bg-[#241F1C] hover:bg-[#3A2F2A] border border-[#3A2F2A] text-[#F7EFE6] rounded-lg text-sm font-medium" data-testid="persona-avatar-upload">
                  {form.avatar_path ? "Change photo" : "Upload photo"}
                </button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickAvatar} data-testid="persona-avatar-input"/>
                <p className="text-xs text-[#7A6D62] mt-1.5">JPG, PNG, or WEBP · up to 5MB</p>
              </div>
            </div>

            <Section title="Identity">
              <FormField label="Name" required>
                <input required value={form.name} onChange={(e) => set("name", e.target.value)}
                  placeholder="Aria Chen" className="lore-input" data-testid="persona-name-input"/>
              </FormField>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FIELDS.filter((f) => !f.textarea).map((f) => (
                  <FormField key={f.key} label={f.label}>
                    <input value={form[f.key]} placeholder={f.placeholder}
                      onChange={(e) => set(f.key, e.target.value)} className="lore-input"
                      data-testid={`persona-field-${f.key}`}/>
                  </FormField>
                ))}
              </div>
            </Section>

            <Section title="About you">
              {FIELDS.filter((f) => f.textarea).map((f) => (
                <FormField key={f.key} label={f.label}>
                  <textarea rows={2} value={form[f.key]} placeholder={f.placeholder}
                    onChange={(e) => set(f.key, e.target.value)} className="lore-input resize-none"
                    data-testid={`persona-field-${f.key}`}/>
                </FormField>
              ))}
            </Section>

            <Section title="Persona definition" hint="Up to 32,000 characters of detailed lore, history, voice, and visual reference. The AI uses this every reply.">
              <div className="relative">
                <textarea
                  rows={12}
                  value={form.definition}
                  onChange={(e) => set("definition", e.target.value.slice(0, DEF_LIMIT))}
                  placeholder="Aria has been photographing strangers since she was 15. Her mother taught her to develop film in the family bathtub..."
                  className="lore-input resize-y font-mono text-sm leading-relaxed"
                  style={{ minHeight: "260px" }}
                  data-testid="persona-definition-input"
                />
                <div className={`absolute right-3 bottom-3 text-xs px-2 py-1 rounded-full pointer-events-none ${
                  defLen > DEF_LIMIT * 0.9 ? "bg-amber-500/20 text-amber-300" : "bg-[#3A2F2A] text-[#A99B91]"
                }`} data-testid="persona-definition-counter">
                  {defLen.toLocaleString()} / {DEF_LIMIT.toLocaleString()}
                </div>
              </div>
            </Section>

            <div className="flex gap-3 pt-4">
              <button type="submit" disabled={busy}
                className="px-6 py-2.5 bg-[#D8B982] hover:bg-[#E0C798] text-white rounded-lg font-medium disabled:opacity-50"
                data-testid="persona-save-btn">
                {busy ? "Saving…" : editing ? "Save changes" : "Create persona"}
              </button>
              <button type="button" onClick={() => nav(-1)} className="px-6 py-2.5 text-[#A99B91] hover:text-[#F7EFE6] font-medium" data-testid="persona-cancel-btn">
                Cancel
              </button>
            </div>
          </form>

          <style>{`
            .lore-input {
              width: 100%; background: #13151B; border: 1px solid #3A2F2A;
              color: #F7EFE6; border-radius: 0.5rem; padding: 0.625rem 0.875rem;
              font-size: 0.9rem; outline: none; transition: border-color .15s, box-shadow .15s;
            }
            .lore-input::placeholder { color: #7A6D62; }
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
        <h3 className="font-semibold text-[#F7EFE6]">{title}</h3>
        {hint && <p className="text-xs text-[#A99B91] mt-0.5">{hint}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function FormField({ label, required, children }) {
  return (
    <label className="block">
      <span className="block text-sm text-[#A99B91] mb-1.5">{label}{required && <span className="text-[#D8B982]"> *</span>}</span>
      {children}
    </label>
  );
}
