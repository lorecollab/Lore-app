import React, { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import Avatar from "../components/Avatar";
import AuthImage from "../components/AuthImage";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Heart, X, Plus, Trash2, Instagram, Twitter, Facebook, Home, Car, Briefcase, Coins, Plane, Gem, Users as UsersIcon, MessageCircle, Share2, Bookmark, Zap, BadgeCheck, Pencil, Image as ImageIcon, Send } from "lucide-react";

const TABS = [
  { id: "social", label: "Social" },
  { id: "relationships", label: "People" },
  { id: "assets", label: "Lifestyle" },
  { id: "activities", label: "Activities" },
  { id: "findlove", label: "Find Love" },
];

export default function World() {
  const [tab, setTab] = useState("social");
  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10 pb-24">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="world-title">World</h1>
          <p className="text-sm text-[#9DA3AE] mt-1">The life around your chats. Subtle context that makes characters feel grounded.</p>

          <div className="mt-5 flex gap-1 overflow-x-auto border-b border-[#1E222B]" data-testid="world-tabs">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px ${tab === t.id ? "border-[#D8B982] text-[#E8EAED]" : "border-transparent text-[#9DA3AE] hover:text-[#E8EAED]"}`}
                data-testid={`world-tab-${t.id}`}>{t.label}</button>
            ))}
          </div>

          <div className="mt-6">
            {tab === "social" && <SocialTab/>}
            {tab === "relationships" && <RelationshipsTab/>}
            {tab === "assets" && <AssetsTab/>}
            {tab === "activities" && <ActivitiesTab/>}
            {tab === "findlove" && <FindLoveTab/>}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function SocialTab() {
  const [profiles, setProfiles] = useState([]);
  const [posts, setPosts] = useState([]);
  const [editingProfile, setEditingProfile] = useState(null);
  const [creating, setCreating] = useState(false);
  const [composer, setComposer] = useState({ open: false, profile_id: "", caption: "", image_path: "", uploading: false });
  const [editingPost, setEditingPost] = useState(null);
  const [openPost, setOpenPost] = useState(null);
  const [postDetail, setPostDetail] = useState(null);
  const [characters, setCharacters] = useState([]);
  const composerFile = React.useRef(null);

  const load = async () => {
    try {
      const [a, b, ch] = await Promise.all([
        api.get("/social/profiles"),
        api.get("/social/posts"),
        api.get("/discover").catch(() => ({ data: [] })),
      ]);
      setProfiles(a.data); setPosts(b.data); setCharacters(ch.data || []);
      if (a.data.length && !composer.profile_id) setComposer((c) => ({ ...c, profile_id: a.data[0].id }));
    } catch { /* silent */ }
  };
  useEffect(() => { load(); }, []);

  const Icon = ({ p }) => p === "twitter" ? <Twitter className="w-4 h-4"/> : p === "facebook" ? <Facebook className="w-4 h-4"/> : <Instagram className="w-4 h-4"/>;
  const fmt = (n) => { n = Number(n) || 0; if (n >= 1e6) return (n/1e6).toFixed(1).replace(/\.0$/,"")+"M"; if (n >= 1e3) return (n/1e3).toFixed(1).replace(/\.0$/,"")+"K"; return String(n); };

  const submitProfile = async (form) => {
    try {
      if (form.id) await api.put(`/social/profiles/${form.id}`, form);
      else await api.post("/social/profiles", form);
      setEditingProfile(null); setCreating(false); load();
      toast.success(form.id ? "Updated" : "Created");
    } catch { toast.error("Failed"); }
  };

  const delProfile = async (pid) => {
    if (!window.confirm("Delete this profile and all its posts?")) return;
    try { await api.delete(`/social/profiles/${pid}`); load(); }
    catch { toast.error("Failed"); }
  };

  const pickComposerImage = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setComposer((c) => ({ ...c, uploading: true }));
    try {
      const fd = new FormData(); fd.append("file", f);
      const r = await api.post("/upload?folder=social", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setComposer((c) => ({ ...c, image_path: r.data.path, uploading: false }));
    } catch { toast.error("Upload failed"); setComposer((c) => ({ ...c, uploading: false })); }
    e.target.value = "";
  };

  const submitPost = async () => {
    if (!composer.profile_id) return toast.error("Pick a profile");
    if (!composer.caption.trim() && !composer.image_path) return;
    try {
      await api.post("/social/posts", {
        profile_id: composer.profile_id, caption: composer.caption, image_path: composer.image_path,
      });
      setComposer({ ...composer, open: false, caption: "", image_path: "" });
      load(); toast.success("Posted — characters will see it on the next chat message");
    } catch { toast.error("Post failed"); }
  };

  const savePostEdits = async () => {
    if (!editingPost) return;
    try {
      const { id, profile_id, ...rest } = editingPost;
      await api.put(`/social/posts/${id}`, rest);
      setEditingPost(null); load(); toast.success("Saved");
    } catch { toast.error("Failed"); }
  };

  const boost = async (pid) => {
    try {
      const r = await api.post(`/social/posts/${pid}/boost`);
      toast.success(`+${r.data.added_likes} likes · +${r.data.added_comments} comments`);
      load();
      if (openPost?.id === pid) openPostDetail(pid);
    } catch { toast.error("Boost failed"); }
  };

  const openPostDetail = async (pid) => {
    setOpenPost(posts.find((p) => p.id === pid));
    try { const r = await api.get(`/social/posts/${pid}`); setPostDetail(r.data); }
    catch { toast.error("Couldn't open"); }
  };

  const delPost = async (pid) => {
    if (!window.confirm("Delete this post?")) return;
    try { await api.delete(`/social/posts/${pid}`); setOpenPost(null); setPostDetail(null); load(); }
    catch { toast.error("Failed"); }
  };

  return (
    <div className="space-y-6" data-testid="world-social">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Profiles</h2>
        <button onClick={() => setCreating(true)} className="px-3 py-1.5 bg-[#D8B982] hover:bg-[#E0C798] text-white rounded-lg text-sm font-medium inline-flex items-center gap-1" data-testid="social-new-profile">
          <Plus className="w-4 h-4"/> New profile
        </button>
      </div>

      {creating && (
        <ProfileEditor
          characters={characters}
          onCancel={() => setCreating(false)}
          onSave={submitProfile}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {profiles.map((p) => (
          <div key={p.id} className="bg-[#13151B] border border-[#1E222B] rounded-2xl p-4" data-testid={`social-profile-${p.id}`}>
            <div className="flex items-start gap-3">
              <Avatar name={p.handle} path={p.avatar_path} size={42}/>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Icon p={p.platform}/>
                  <p className="font-semibold truncate">@{p.handle}</p>
                  {p.verified && <BadgeCheck className="w-4 h-4 text-[#D8B982] flex-shrink-0"/>}
                </div>
                <p className="text-xs text-[#9DA3AE] truncate">{p.display_name || p.bio || p.platform}</p>
                <p className="text-xs text-[#6E7585] mt-1">
                  {fmt(p.followers)} followers · {fmt(p.following)} following · {p.account_type || "normal"}
                  {typeof p.fame_score === "number" && <span className="ml-1 text-amber-400">· fame {p.fame_score}</span>}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => setEditingProfile(p)} className="text-[#9DA3AE] hover:text-[#D8B982] p-1" aria-label="Edit" data-testid={`social-profile-edit-${p.id}`}>
                  <Pencil className="w-3.5 h-3.5"/>
                </button>
                <button onClick={() => delProfile(p.id)} className="text-[#9DA3AE] hover:text-red-400 p-1" aria-label="Delete">
                  <Trash2 className="w-3.5 h-3.5"/>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editingProfile && (
        <ProfileEditor
          initial={editingProfile}
          characters={characters}
          onCancel={() => setEditingProfile(null)}
          onSave={(f) => submitProfile({ ...editingProfile, ...f, id: editingProfile.id })}
        />
      )}

      {profiles.length > 0 && (
        <>
          <div className="bg-[#13151B] border border-[#1E222B] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">New post</h2>
            </div>
            <select value={composer.profile_id} onChange={(e) => setComposer({ ...composer, profile_id: e.target.value })}
              className="w-full bg-[#0E1015] border border-[#22252D] rounded-lg px-3 py-2 text-[#E8EAED] mb-2" data-testid="post-profile">
              {profiles.map((p) => <option key={p.id} value={p.id}>@{p.handle} ({p.platform})</option>)}
            </select>
            <textarea value={composer.caption} onChange={(e) => setComposer({ ...composer, caption: e.target.value })} rows={2}
              placeholder="What's on your mind?" className="w-full bg-[#0E1015] border border-[#22252D] rounded-lg px-3 py-2 text-[#E8EAED] resize-none" data-testid="post-text"/>
            {composer.image_path && (
              <p className="text-xs text-[#6E7585] mt-1">Image attached <button onClick={() => setComposer({ ...composer, image_path: "" })} className="text-red-400 hover:underline ml-1">remove</button></p>
            )}
            <div className="flex gap-2 mt-2">
              <button onClick={() => composerFile.current?.click()} disabled={composer.uploading}
                className="px-3 py-1.5 bg-[#0E1015] hover:bg-[#1A1D24] border border-[#22252D] rounded-lg text-sm inline-flex items-center gap-1.5"
                data-testid="post-image-btn">
                <ImageIcon className="w-4 h-4"/> {composer.uploading ? "Uploading…" : "Add image"}
              </button>
              <input ref={composerFile} type="file" accept="image/*" hidden onChange={pickComposerImage}/>
              <button onClick={submitPost} className="ml-auto px-4 py-1.5 bg-[#D8B982] hover:bg-[#E0C798] text-white rounded-lg text-sm font-medium" data-testid="post-create">Post</button>
            </div>
          </div>

          <div className="space-y-3">
            {posts.map((p) => {
              const prof = profiles.find((x) => x.id === p.profile_id);
              return (
                <div key={p.id} className="bg-[#13151B] border border-[#1E222B] rounded-2xl overflow-hidden" data-testid={`post-${p.id}`}>
                  <div className="flex items-center gap-2 px-4 py-2.5">
                    {prof && <Icon p={prof.platform}/>}
                    <p className="text-sm font-medium">@{prof?.handle || "Unknown"}</p>
                    {prof?.verified && <BadgeCheck className="w-3.5 h-3.5 text-[#D8B982]"/>}
                    <span className="text-xs text-[#6E7585] ml-auto">{new Date(p.created_at).toLocaleString()}</span>
                  </div>
                  {p.image_path && <AuthImage path={p.image_path} className="w-full max-h-96 object-cover"/>}
                  {p.caption && <p className="text-sm text-[#E8EAED] whitespace-pre-wrap px-4 pt-2">{p.caption}</p>}
                  <div className="flex items-center gap-3 px-4 py-2 text-xs text-[#9DA3AE]">
                    <button onClick={async () => { await api.post(`/social/posts/${p.id}/like`); load(); }} className="hover:text-pink-400 inline-flex items-center gap-1" data-testid={`post-like-${p.id}`}>
                      <Heart className="w-3.5 h-3.5"/> {fmt(p.likes)}
                    </button>
                    <button onClick={() => openPostDetail(p.id)} className="hover:text-[#D8B982] inline-flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5"/> {fmt(p.comments_count)}
                    </button>
                    <span className="inline-flex items-center gap-1"><Share2 className="w-3.5 h-3.5"/>{fmt(p.shares)}</span>
                    <span className="inline-flex items-center gap-1"><Bookmark className="w-3.5 h-3.5"/>{fmt(p.saves)}</span>
                    <button onClick={() => boost(p.id)} className="ml-auto inline-flex items-center gap-1 hover:text-amber-400" data-testid={`post-boost-${p.id}`}>
                      <Zap className="w-3.5 h-3.5"/> boost
                    </button>
                    <button onClick={() => setEditingPost({ ...p })} className="hover:text-[#D8B982]" aria-label="Edit" data-testid={`post-edit-${p.id}`}>
                      <Pencil className="w-3.5 h-3.5"/>
                    </button>
                    <button onClick={() => delPost(p.id)} className="hover:text-red-400" aria-label="Delete">
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {editingPost && (
        <PostEditor post={editingPost} characters={characters}
          onCancel={() => setEditingPost(null)} onChange={setEditingPost} onSave={savePostEdits}/>
      )}

      {openPost && postDetail && (
        <PostDetailModal detail={postDetail}
          onClose={() => { setOpenPost(null); setPostDetail(null); }}
          onChanged={() => openPostDetail(openPost.id)}
          onBoost={() => boost(openPost.id)}
        />
      )}
    </div>
  );
}

function ProfileEditor({ initial, characters, onCancel, onSave }) {
  const [f, setF] = useState({
    platform: initial?.platform || "instagram",
    handle: initial?.handle || "",
    display_name: initial?.display_name || "",
    bio: initial?.bio || "",
    avatar_path: initial?.avatar_path || "",
    banner_path: initial?.banner_path || "",
    verified: initial?.verified || false,
    is_public: initial?.is_public !== false,
    followers: initial?.followers || 0,
    following: initial?.following || 0,
    account_type: initial?.account_type || "normal",
    linked_character_id: initial?.linked_character_id || "",
    linked_persona_id: initial?.linked_persona_id || "",
  });
  const avatarRef = React.useRef(null);
  const bannerRef = React.useRef(null);
  const upload = async (kind, e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await api.post("/upload?folder=social", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setF((s) => ({ ...s, [kind === "avatar" ? "avatar_path" : "banner_path"]: r.data.path }));
    } catch { toast.error("Upload failed"); }
    e.target.value = "";
  };
  return (
    <div className="bg-[#13151B] border border-[#1E222B] rounded-2xl p-4 space-y-3" data-testid="profile-editor">
      <h3 className="font-semibold">{initial ? "Edit profile" : "New profile"}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value })} className="bg-[#0E1015] border border-[#22252D] rounded-lg px-3 py-2 text-sm" data-testid="profile-platform">
          <option value="instagram">Instagram</option>
          <option value="twitter">Twitter / X</option>
          <option value="facebook">Facebook</option>
          <option value="tiktok">TikTok</option>
        </select>
        <select value={f.account_type} onChange={(e) => setF({ ...f, account_type: e.target.value })} className="bg-[#0E1015] border border-[#22252D] rounded-lg px-3 py-2 text-sm" data-testid="profile-account-type">
          <option value="normal">Normal</option>
          <option value="fan">Fan</option>
          <option value="influencer">Influencer</option>
          <option value="celebrity">Celebrity</option>
          <option value="brand">Brand</option>
        </select>
        <input value={f.handle} onChange={(e) => setF({ ...f, handle: e.target.value.replace(/^@/, "") })} placeholder="handle" className="bg-[#0E1015] border border-[#22252D] rounded-lg px-3 py-2 text-sm" data-testid="profile-handle"/>
        <input value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })} placeholder="Display name" className="bg-[#0E1015] border border-[#22252D] rounded-lg px-3 py-2 text-sm" data-testid="profile-display-name"/>
      </div>
      <textarea value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} placeholder="Bio" rows={2} className="w-full bg-[#0E1015] border border-[#22252D] rounded-lg px-3 py-2 text-sm resize-none" data-testid="profile-bio"/>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-[#9DA3AE] mb-1">Followers</p>
          <input type="number" value={f.followers} onChange={(e) => setF({ ...f, followers: +e.target.value })} className="w-full bg-[#0E1015] border border-[#22252D] rounded-lg px-3 py-2 text-sm" data-testid="profile-followers"/>
        </div>
        <div>
          <p className="text-xs text-[#9DA3AE] mb-1">Following</p>
          <input type="number" value={f.following} onChange={(e) => setF({ ...f, following: +e.target.value })} className="w-full bg-[#0E1015] border border-[#22252D] rounded-lg px-3 py-2 text-sm" data-testid="profile-following"/>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm flex items-center gap-1.5"><input type="checkbox" checked={f.verified} onChange={(e) => setF({ ...f, verified: e.target.checked })} className="accent-[#D8B982]" data-testid="profile-verified"/> Verified</label>
        <label className="text-sm flex items-center gap-1.5"><input type="checkbox" checked={f.is_public} onChange={(e) => setF({ ...f, is_public: e.target.checked })} className="accent-[#D8B982]" data-testid="profile-public"/> Public</label>
        <button onClick={() => avatarRef.current?.click()} className="px-2 py-1 text-xs bg-[#0E1015] hover:bg-[#1A1D24] border border-[#22252D] rounded-md inline-flex items-center gap-1" data-testid="profile-upload-avatar">
          <ImageIcon className="w-3 h-3"/> {f.avatar_path ? "Replace avatar" : "Avatar"}
        </button>
        <input ref={avatarRef} type="file" accept="image/*" hidden onChange={(e) => upload("avatar", e)}/>
        <button onClick={() => bannerRef.current?.click()} className="px-2 py-1 text-xs bg-[#0E1015] hover:bg-[#1A1D24] border border-[#22252D] rounded-md inline-flex items-center gap-1">
          <ImageIcon className="w-3 h-3"/> {f.banner_path ? "Replace banner" : "Banner"}
        </button>
        <input ref={bannerRef} type="file" accept="image/*" hidden onChange={(e) => upload("banner", e)}/>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select value={f.linked_character_id || ""} onChange={(e) => setF({ ...f, linked_character_id: e.target.value || null })} className="bg-[#0E1015] border border-[#22252D] rounded-lg px-3 py-2 text-sm" data-testid="profile-linked-char">
          <option value="">— Link to character (optional) —</option>
          {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input value={f.linked_persona_id || ""} onChange={(e) => setF({ ...f, linked_persona_id: e.target.value || null })} placeholder="Linked persona id (optional)" className="bg-[#0E1015] border border-[#22252D] rounded-lg px-3 py-2 text-sm"/>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={() => onSave(f)} disabled={!f.handle.trim()} className="px-3 py-1.5 bg-[#D8B982] hover:bg-[#E0C798] disabled:opacity-40 text-white rounded-lg text-sm font-medium" data-testid="profile-save">{initial ? "Save" : "Create"}</button>
        <button onClick={onCancel} className="px-3 py-1.5 text-sm text-[#9DA3AE] hover:text-white">Cancel</button>
      </div>
    </div>
  );
}

function PostEditor({ post, characters, onCancel, onChange, onSave }) {
  const set = (patch) => onChange({ ...post, ...patch });
  const toggleTag = (cid) => {
    const list = post.tagged_character_ids || [];
    set({ tagged_character_ids: list.includes(cid) ? list.filter((x) => x !== cid) : [...list, cid] });
  };
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" data-testid="post-editor">
      <div className="absolute inset-0 bg-black/70" onClick={onCancel}/>
      <div className="relative bg-[#13151B] border border-[#1E222B] rounded-2xl p-5 max-w-md w-full max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Edit post</h3>
          <button onClick={onCancel} className="text-[#9DA3AE] hover:text-white p-1"><X className="w-5 h-5"/></button>
        </div>
        <textarea value={post.caption || ""} onChange={(e) => set({ caption: e.target.value })} rows={3} className="w-full bg-[#0E1015] border border-[#22252D] rounded-lg px-3 py-2 text-sm resize-none mb-3" data-testid="post-edit-caption"/>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Field label="Likes"><input type="number" value={post.likes ?? 0} onChange={(e) => set({ likes: +e.target.value })} data-testid="post-edit-likes"/></Field>
          <Field label="Comments"><input type="number" value={post.comments_count ?? 0} onChange={(e) => set({ comments_count: +e.target.value })} data-testid="post-edit-comments"/></Field>
          <Field label="Shares"><input type="number" value={post.shares ?? 0} onChange={(e) => set({ shares: +e.target.value })} data-testid="post-edit-shares"/></Field>
          <Field label="Saves"><input type="number" value={post.saves ?? 0} onChange={(e) => set({ saves: +e.target.value })} data-testid="post-edit-saves"/></Field>
        </div>
        <Field label="Posted at">
          <input type="datetime-local" value={(post.posted_at || "").slice(0, 16)} onChange={(e) => set({ posted_at: e.target.value ? new Date(e.target.value).toISOString() : null })} data-testid="post-edit-posted-at"/>
        </Field>
        <Field label="Locations (comma separated)">
          <input value={(post.tagged_locations || []).join(", ")} onChange={(e) => set({ tagged_locations: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}/>
        </Field>
        {characters.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-[#9DA3AE] mb-1">Tag characters</p>
            <div className="flex flex-wrap gap-1.5">
              {characters.slice(0, 12).map((c) => {
                const on = (post.tagged_character_ids || []).includes(c.id);
                return (
                  <button key={c.id} onClick={() => toggleTag(c.id)} type="button"
                    className={`px-2 py-1 rounded-full text-xs border ${on ? "bg-[#D8B982]/15 border-[#D8B982]/40 text-[#D8B982]" : "border-[#22252D] text-[#9DA3AE]"}`}
                    data-testid={`post-tag-char-${c.id}`}>@{c.name}</button>
                );
              })}
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={onSave} className="px-3 py-1.5 bg-[#D8B982] hover:bg-[#E0C798] text-white rounded-lg text-sm font-medium" data-testid="post-edit-save">Save</button>
          <button onClick={onCancel} className="px-3 py-1.5 text-sm text-[#9DA3AE] hover:text-white">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-2">
      <p className="text-xs text-[#9DA3AE] mb-1">{label}</p>
      {React.Children.map(children, (c) => React.cloneElement(c, { className: "w-full bg-[#0E1015] border border-[#22252D] rounded-lg px-3 py-1.5 text-sm" }))}
    </div>
  );
}

function PostDetailModal({ detail, onClose, onChanged, onBoost }) {
  const [text, setText] = useState("");
  const since = (iso) => { try { const sec = (Date.now() - new Date(iso).getTime())/1000; if (sec < 60) return "just now"; if (sec < 3600) return `${Math.floor(sec/60)}m`; if (sec < 86400) return `${Math.floor(sec/3600)}h`; return `${Math.floor(sec/86400)}d`; } catch { return ""; } };
  const submit = async () => {
    if (!text.trim()) return;
    try { await api.post(`/social/posts/${detail.post.id}/comments`, { text: text.trim() }); setText(""); onChanged(); }
    catch { toast.error("Failed"); }
  };
  const del = async (cid) => { try { await api.delete(`/social/comments/${cid}`); onChanged(); } catch { toast.error("Failed"); } };
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" data-testid="post-detail-modal">
      <div className="absolute inset-0 bg-black/70" onClick={onClose}/>
      <div className="relative bg-[#13151B] border border-[#1E222B] rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">@{detail.profile.handle}</h3>
          <button onClick={onClose} className="text-[#9DA3AE] hover:text-white p-1"><X className="w-5 h-5"/></button>
        </div>
        {detail.post.image_path && <AuthImage path={detail.post.image_path} className="w-full max-h-72 object-cover rounded-xl mb-2"/>}
        {detail.post.caption && <p className="text-sm whitespace-pre-wrap mb-2">{detail.post.caption}</p>}
        <button onClick={onBoost} className="w-full mb-3 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-xs font-medium text-amber-400 inline-flex items-center justify-center gap-1.5"><Zap className="w-3.5 h-3.5"/> Boost time — bring more reactions</button>
        <div className="space-y-1.5 mb-3">
          {(detail.comments || []).map((c) => (
            <div key={c.id} className={`flex items-start gap-2 px-2 py-1.5 rounded-lg ${
              c.is_brand ? "bg-amber-500/5 border border-amber-500/20" :
              c.is_user ? "bg-[#D8B982]/15 border border-[#D8B982]/40" : ""
            }`}>
              <div className="flex-1 min-w-0">
                <p className="text-xs"><span className={`font-medium ${c.is_brand ? "text-amber-400" : "text-[#E8EAED]"}`}>@{c.username}</span><span className="text-[#6E7585] ml-1.5">{since(c.created_at)}</span></p>
                <p className="text-sm text-[#E8EAED] whitespace-pre-wrap">{c.text}</p>
              </div>
              {c.is_user && <button onClick={() => del(c.id)} className="text-[#6E7585] hover:text-red-400 p-1"><Trash2 className="w-3 h-3"/></button>}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Add a comment…" className="flex-1 bg-[#0E1015] border border-[#22252D] rounded-full px-3 py-1.5 text-sm" data-testid="post-detail-comment-input"/>
          <button onClick={submit} disabled={!text.trim()} className="px-3 py-1.5 bg-[#D8B982] hover:bg-[#E0C798] disabled:opacity-40 rounded-full text-xs font-medium inline-flex items-center gap-1"><Send className="w-3 h-3"/></button>
        </div>
      </div>
    </div>
  );
}

function RelationshipsTab() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: "", kind: "friend", status: "", strength: 60, notes: "" });
  const load = () => api.get("/relationships").then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  const create = async () => {
    if (!form.name.trim()) return;
    await api.post("/relationships", form); setForm({ name: "", kind: "friend", status: "", strength: 60, notes: "" }); load();
  };
  const remove = async (id) => { await api.delete(`/relationships/${id}`); load(); };
  return (
    <div className="space-y-4" data-testid="world-relationships">
      <div className="bg-[#13151B] border border-[#1E222B] rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className="bg-[#0E1015] border border-[#22252D] rounded-lg px-3 py-2" data-testid="rel-name"/>
        <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="bg-[#0E1015] border border-[#22252D] rounded-lg px-3 py-2" data-testid="rel-kind">
          <option value="family">Family</option><option value="friend">Friend</option>
          <option value="partner">Partner</option><option value="ex">Ex</option><option value="other">Other</option>
        </select>
        <input value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} placeholder="Status (e.g. close, distant)" className="bg-[#0E1015] border border-[#22252D] rounded-lg px-3 py-2" data-testid="rel-status"/>
        <input type="range" min={0} max={100} value={form.strength} onChange={(e) => setForm({ ...form, strength: +e.target.value })} className="accent-[#D8B982]" data-testid="rel-strength"/>
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" rows={2} className="sm:col-span-2 bg-[#0E1015] border border-[#22252D] rounded-lg px-3 py-2 resize-none" data-testid="rel-notes"/>
        <button onClick={create} className="sm:col-span-2 px-4 py-2 bg-[#D8B982] hover:bg-[#E0C798] text-white rounded-lg text-sm font-medium" data-testid="rel-create"><Plus className="inline w-4 h-4 mr-1"/>Add</button>
      </div>
      {items.map((r) => (
        <div key={r.id} className="bg-[#13151B] border border-[#1E222B] rounded-2xl p-4" data-testid={`rel-${r.id}`}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-medium">{r.name} <span className="text-xs text-[#9DA3AE] uppercase tracking-wide ml-1">{r.kind}</span></p>
              {r.status && <p className="text-xs text-[#9DA3AE]">{r.status}</p>}
            </div>
            <button onClick={() => remove(r.id)} className="text-[#6E7585] hover:text-red-400"><Trash2 className="w-4 h-4"/></button>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-[#22252D] overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#D8B982] to-[#E0C798]" style={{ width: `${r.strength || 0}%` }}/>
          </div>
          {r.notes && <p className="text-xs text-[#9DA3AE] mt-2">{r.notes}</p>}
        </div>
      ))}
    </div>
  );
}

function AssetsTab() {
  const [data, setData] = useState({ items: [], finance: {} });
  const [form, setForm] = useState({ kind: "estate", name: "", value: "", notes: "" });
  const ICONS = { estate: Home, vehicle: Car, business: Briefcase, investment: Coins, belonging: Gem, collectible: Gem, private_jet: Plane };
  const load = () => api.get("/assets").then((r) => setData(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  const create = async () => {
    if (!form.name.trim()) return;
    try { await api.post("/assets", form); setForm({ kind: "estate", name: "", value: "", notes: "" }); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };
  const setFin = async (patch) => {
    const next = { ...data.finance, ...patch };
    await api.put("/finance", next); load();
  };
  return (
    <div className="space-y-4" data-testid="world-assets">
      <div className="bg-[#13151B] border border-[#1E222B] rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input value={data.finance.bank_balance || ""} onChange={(e) => setFin({ bank_balance: e.target.value })} placeholder="Bank balance (e.g. $124,800)" className="bg-[#0E1015] border border-[#22252D] rounded-lg px-3 py-2" data-testid="finance-bank"/>
        <select value={data.finance.luxury_level || "modest"} onChange={(e) => setFin({ luxury_level: e.target.value })} className="bg-[#0E1015] border border-[#22252D] rounded-lg px-3 py-2" data-testid="finance-luxury">
          <option value="modest">Modest</option><option value="comfortable">Comfortable</option>
          <option value="wealthy">Wealthy</option><option value="very_wealthy">Very wealthy</option>
        </select>
      </div>
      <div className="bg-[#13151B] border border-[#1E222B] rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="bg-[#0E1015] border border-[#22252D] rounded-lg px-3 py-2" data-testid="asset-kind">
          <option value="estate">Estate / Home</option><option value="vehicle">Vehicle</option>
          <option value="business">Business</option><option value="investment">Investment</option>
          <option value="belonging">Belonging</option><option value="collectible">Collectible</option>
          <option value="private_jet">Private jet (very wealthy only)</option>
        </select>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name (e.g. Lakeside cabin)" className="bg-[#0E1015] border border-[#22252D] rounded-lg px-3 py-2" data-testid="asset-name"/>
        <input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="Value" className="bg-[#0E1015] border border-[#22252D] rounded-lg px-3 py-2" data-testid="asset-value"/>
        <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="bg-[#0E1015] border border-[#22252D] rounded-lg px-3 py-2" data-testid="asset-notes"/>
        <button onClick={create} className="sm:col-span-2 px-4 py-2 bg-[#D8B982] hover:bg-[#E0C798] text-white rounded-lg text-sm font-medium" data-testid="asset-create"><Plus className="inline w-4 h-4 mr-1"/>Add asset</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.items.map((a) => {
          const I = ICONS[a.kind] || Home;
          return (
            <div key={a.id} className="bg-[#13151B] border border-[#1E222B] rounded-2xl p-4 flex items-start gap-3" data-testid={`asset-${a.id}`}>
              <I className="w-5 h-5 text-[#D8B982] mt-1"/>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{a.name}</p>
                <p className="text-xs text-[#9DA3AE] uppercase tracking-wide">{a.kind.replace("_"," ")} {a.value && `· ${a.value}`}</p>
                {a.notes && <p className="text-xs text-[#9DA3AE] mt-1">{a.notes}</p>}
              </div>
              <button onClick={async () => { await api.delete(`/assets/${a.id}`); load(); }} className="text-[#6E7585] hover:text-red-400"><Trash2 className="w-4 h-4"/></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActivitiesTab() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ kind: "self_improvement", title: "", notes: "" });
  const load = () => api.get("/activities").then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  const create = async () => {
    if (!form.title.trim()) return;
    await api.post("/activities", form); setForm({ kind: form.kind, title: "", notes: "" }); load();
  };
  return (
    <div className="space-y-4" data-testid="world-activities">
      <div className="bg-[#13151B] border border-[#1E222B] rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="bg-[#0E1015] border border-[#22252D] rounded-lg px-3 py-2" data-testid="act-kind">
          <option value="self_improvement">Self-improvement</option>
          <option value="nightlife">Nightlife</option>
          <option value="movies">Movies</option>
          <option value="family">Family interactions</option>
          <option value="lawsuit">Lawsuit</option>
          <option value="loan">Loan</option>
          <option value="investments">Investments</option>
        </select>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="bg-[#0E1015] border border-[#22252D] rounded-lg px-3 py-2" data-testid="act-title"/>
        <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="sm:col-span-2 bg-[#0E1015] border border-[#22252D] rounded-lg px-3 py-2" data-testid="act-notes"/>
        <button onClick={create} className="sm:col-span-2 px-4 py-2 bg-[#D8B982] hover:bg-[#E0C798] text-white rounded-lg text-sm font-medium" data-testid="act-create"><Plus className="inline w-4 h-4 mr-1"/>Log activity</button>
      </div>
      <div className="space-y-2">
        {items.map((a) => (
          <div key={a.id} className="bg-[#13151B] border border-[#1E222B] rounded-2xl p-4" data-testid={`act-${a.id}`}>
            <p className="font-medium">{a.title} <span className="text-xs text-[#9DA3AE] uppercase ml-1">{a.kind.replace("_"," ")}</span></p>
            {a.notes && <p className="text-xs text-[#9DA3AE] mt-1">{a.notes}</p>}
            <p className="text-[10px] text-[#6E7585] mt-1">{new Date(a.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FindLoveTab() {
  const [candidates, setCandidates] = useState([]);
  const [idx, setIdx] = useState(0);
  const nav = useNavigate();
  useEffect(() => { api.get("/findlove/candidates").then((r) => setCandidates(r.data)).catch(() => {}); }, []);
  const act = async (action) => {
    const c = candidates[idx]; if (!c) return;
    const r = await api.post("/findlove/action", { character_id: c.id, action });
    if (action === "like" && r.data.matched) {
      toast.success(`Matched with ${c.name}!`);
      setTimeout(() => nav(`/chat/${c.id}`), 600);
    }
    setIdx((i) => i + 1);
  };
  const c = candidates[idx];
  if (!c) return (
    <div className="text-center py-16 border border-dashed border-[#22252D] rounded-2xl text-[#9DA3AE]" data-testid="findlove-empty">
      <p>No more candidates right now. Check back later, or make some characters public.</p>
    </div>
  );
  return (
    <div className="max-w-sm mx-auto" data-testid="world-findlove">
      <div className="relative bg-[#13151B] border border-[#1E222B] rounded-3xl overflow-hidden" data-testid={`findlove-card-${c.id}`}>
        <div className="aspect-[3/4] bg-gradient-to-br from-pink-500/20 via-[#1A1D24] to-[#22252D] relative">
          {c.avatar_path ? (
            <AuthImage path={c.avatar_path} className="w-full h-full object-cover"/>
          ) : <Avatar name={c.name} size={400} className="!rounded-none w-full h-full"/>}
          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <h3 className="text-2xl font-bold text-white">{c.name}</h3>
            <p className="text-sm text-white/85 line-clamp-2">{c.description || c.role}</p>
          </div>
        </div>
        <div className="flex items-center justify-around p-4">
          <button onClick={() => act("pass")} className="w-14 h-14 rounded-full bg-[#22252D] hover:bg-[#2A2D36] text-[#E8EAED] flex items-center justify-center" data-testid="findlove-pass"><X className="w-6 h-6"/></button>
          <button onClick={() => act("like")} className="w-16 h-16 rounded-full bg-pink-500 hover:bg-pink-400 text-white flex items-center justify-center shadow-lg shadow-pink-500/30" data-testid="findlove-like"><Heart className="w-7 h-7 fill-current"/></button>
        </div>
      </div>
    </div>
  );
}
