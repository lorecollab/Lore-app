import React, { useEffect, useRef, useState } from "react";
import AppShell from "../components/AppShell";
import Avatar from "../components/Avatar";
import AuthImage from "../components/AuthImage";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Camera, Share2 } from "lucide-react";

export default function Profile() {
  const { username } = useParams(); // optional — when present, viewing public profile
  const { user, refreshUser } = useAuth();
  const isOwn = !username || username === user?.username;
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ username: "", display_name: "", bio: "", profile_pic_path: "" });
  const fileRef = useRef(null);

  useEffect(() => {
    (async () => {
      if (isOwn) {
        const me = await api.get("/auth/me");
        const chars = await api.get("/characters");
        const voices = await api.get("/voices");
        setData({ user: me.data, public_characters: chars.data.filter((c) => c.is_public), public_voices: voices.data.filter((v) => v.is_public) });
        setForm({ username: me.data.username || "", display_name: me.data.display_name || me.data.name || "", bio: me.data.bio || "", profile_pic_path: me.data.profile_pic_path || "" });
      } else {
        try {
          const r = await api.get(`/users/${username}`);
          setData(r.data);
        } catch { toast.error("User not found"); }
      }
    })();
  }, [username, user?.username]);

  const pickPic = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      const fd = new FormData(); fd.append("file", f);
      const r = await api.post("/upload?folder=profilepics", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm({ ...form, profile_pic_path: r.data.path });
      toast.success("Photo uploaded");
    } catch { toast.error("Upload failed"); }
    e.target.value = "";
  };

  const save = async () => {
    try {
      await api.put("/users/me", form);
      toast.success("Profile saved");
      setEditing(false);
      refreshUser?.();
      // refetch
      const me = await api.get("/auth/me");
      setData((d) => ({ ...d, user: me.data }));
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Save failed");
    }
  };

  const share = () => {
    const url = `${window.location.origin}/u/${data?.user?.username}`;
    if (navigator.share) navigator.share({ url, title: data?.user?.display_name });
    else { navigator.clipboard?.writeText(url); toast.success("Link copied"); }
  };

  if (!data) return <AppShell><div className="flex-1 flex items-center justify-center lore-taupe">Loading…</div></AppShell>;
  const u = data.user;

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto bg-lore">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-10">
          <div className="flex items-start gap-4 mb-6">
            <div className="relative w-24 h-24">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-lore-card border border-lore flex items-center justify-center">
                {(editing ? form.profile_pic_path : u.profile_pic_path) ? (
                  <AuthImage path={editing ? form.profile_pic_path : u.profile_pic_path} className="w-full h-full object-cover"/>
                ) : (
                  <Avatar name={u.display_name || u.name} size={96} className="!rounded-none w-full h-full"/>
                )}
              </div>
              {editing && (
                <button onClick={() => fileRef.current?.click()} className="absolute -bottom-2 -right-2 bg-[#D8B982] hover:bg-[#E0C798] text-[#15110F] rounded-full p-2 shadow lore-press" data-testid="profile-pic-upload">
                  <Camera className="w-4 h-4"/>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickPic}/>
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-2">
                  <input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                    placeholder="Display name" className="profile-input" data-testid="profile-display-name"/>
                  <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
                    placeholder="username" className="profile-input" data-testid="profile-username"/>
                  <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={2}
                    placeholder="Bio" className="profile-input resize-none" data-testid="profile-bio"/>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold tracking-tight lore-cream" data-testid="profile-name">{u.display_name || u.name}</h1>
                  <p className="text-sm lore-taupe">@{u.username || "—"}</p>
                  {u.bio && <p className="text-sm lore-cream mt-2 leading-relaxed">{u.bio}</p>}
                </>
              )}
              <div className="flex gap-2 mt-3 flex-wrap">
                {isOwn ? (
                  editing ? (
                    <>
                      <button onClick={save} className="lore-press px-4 py-1.5 bg-[#D8B982] hover:bg-[#E0C798] text-[#15110F] rounded-xl text-sm font-semibold" data-testid="profile-save">Save</button>
                      <button onClick={() => setEditing(false)} className="px-4 py-1.5 lore-taupe hover:lore-cream text-sm" data-testid="profile-cancel">Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => setEditing(true)} className="lore-press px-4 py-1.5 bg-lore-card hover:bg-lore-card-2 border border-lore lore-cream rounded-xl text-sm font-medium" data-testid="profile-edit">Edit profile</button>
                  )
                ) : null}
                <button onClick={share} className="lore-press px-4 py-1.5 bg-lore-card hover:bg-lore-card-2 border border-lore lore-cream rounded-xl text-sm font-medium inline-flex items-center gap-1.5" data-testid="profile-share">
                  <Share2 className="w-4 h-4"/> Share
                </button>
              </div>
            </div>
          </div>

          <Section title="Public characters">
            {data.public_characters?.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" data-testid="profile-characters">
                {data.public_characters.map((c) => (
                  <Link key={c.id} to={`/characters/${c.id}`} className="bg-lore-card border border-lore rounded-2xl overflow-hidden hover:border-[#D8B982]/40 transition-colors lore-press">
                    <div className="aspect-[4/5] bg-lore-card-2 relative">
                      {c.avatar_path && <AuthImage path={c.avatar_path} className="w-full h-full object-cover"/>}
                    </div>
                    <div className="p-3"><p className="font-medium text-sm truncate lore-cream">{c.name}</p><p className="text-xs lore-taupe truncate">{c.description || c.role}</p></div>
                  </Link>
                ))}
              </div>
            ) : <p className="text-sm lore-taupe">No public characters yet.</p>}
          </Section>

          <Section title="Voice library (public)">
            {data.public_voices?.length ? (
              <div className="space-y-2" data-testid="profile-voices">
                {data.public_voices.map((v) => (
                  <div key={v.id} className="bg-lore-card border border-lore rounded-xl p-3">
                    <p className="font-medium lore-cream">{v.name}</p>
                    {v.description && <p className="text-xs lore-taupe">{v.description}</p>}
                  </div>
                ))}
              </div>
            ) : <p className="text-sm lore-taupe">No public voices yet.</p>}
          </Section>

          <style>{`
            .profile-input { width: 100%; background: #1A1614; border: 1px solid #3A2F2A; color: #F7EFE6;
              border-radius: 0.75rem; padding: 0.55rem 0.85rem; font-size: 0.9rem; outline: none; }
            .profile-input:focus { border-color: #D8B982; box-shadow: 0 0 0 3px rgba(216,185,130,0.18); }
            .profile-input::placeholder { color: #7A6D62; }
          `}</style>
        </div>
      </div>
    </AppShell>
  );
}

function Section({ title, children }) {
  return (
    <section className="mt-8">
      <h2 className="font-semibold lore-cream mb-3">{title}</h2>
      {children}
    </section>
  );
}
