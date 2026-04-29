import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import {
  X, Heart, MessageCircle, Share2, Bookmark, Zap, Instagram, Twitter, Facebook,
  Search, BadgeCheck, Trash2, Plus, Image as ImageIcon, Send,
} from "lucide-react";
import AuthMedia from "./AuthMedia";

const platformIcon = (p) => {
  const cn = "w-3.5 h-3.5";
  if (p === "instagram") return <Instagram className={cn}/>;
  if (p === "twitter") return <Twitter className={cn}/>;
  if (p === "facebook") return <Facebook className={cn}/>;
  return <Instagram className={cn}/>;
};

const fmt = (n) => {
  n = Number(n) || 0;
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
};

const since = (iso) => {
  try {
    const d = new Date(iso);
    const sec = Math.max(0, (Date.now() - d.getTime()) / 1000);
    if (sec < 60) return "just now";
    if (sec < 3600) return `${Math.floor(sec / 60)}m`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
    return `${Math.floor(sec / 86400)}d`;
  } catch { return ""; }
};

export default function ChatSocialDrawer({ open, onClose }) {
  const [profiles, setProfiles] = useState([]);
  const [posts, setPosts] = useState([]);
  const [search, setSearch] = useState("");
  const [openPostId, setOpenPostId] = useState(null);
  const [postDetail, setPostDetail] = useState(null);
  const [composer, setComposer] = useState({ open: false, profile_id: "", caption: "", image_path: "" });
  const [uploading, setUploading] = useState(false);
  const fileRef = React.useRef(null);
  const [newComment, setNewComment] = useState("");

  const load = async () => {
    try {
      const [a, b] = await Promise.all([api.get("/social/profiles"), api.get("/social/posts")]);
      setProfiles(a.data); setPosts(b.data);
      if (a.data.length && !composer.profile_id) setComposer((c) => ({ ...c, profile_id: a.data[0].id }));
    } catch { /* silent */ }
  };
  useEffect(() => { if (open) load(); }, [open]);

  const openDetail = async (pid) => {
    setOpenPostId(pid);
    setPostDetail(null);
    try {
      const r = await api.get(`/social/posts/${pid}`);
      setPostDetail(r.data);
    } catch { toast.error("Couldn't open"); }
  };

  const boost = async (pid) => {
    try {
      const r = await api.post(`/social/posts/${pid}/boost`);
      toast.success(`+${r.data.added_likes} likes · +${r.data.added_comments} comments`);
      if (openPostId === pid) await openDetail(pid);
      load();
    } catch { toast.error("Boost failed"); }
  };

  const like = async (pid) => {
    try { await api.post(`/social/posts/${pid}/like`); if (openPostId === pid) openDetail(pid); load(); }
    catch { toast.error("Failed"); }
  };

  const delPost = async (pid) => {
    if (!window.confirm("Delete this post?")) return;
    try { await api.delete(`/social/posts/${pid}`); setOpenPostId(null); setPostDetail(null); load(); }
    catch { toast.error("Failed"); }
  };

  const addComment = async () => {
    if (!newComment.trim() || !openPostId) return;
    try {
      await api.post(`/social/posts/${openPostId}/comments`, { text: newComment.trim() });
      setNewComment("");
      openDetail(openPostId);
    } catch { toast.error("Failed"); }
  };

  const delComment = async (cid) => {
    try { await api.delete(`/social/comments/${cid}`); openDetail(openPostId); }
    catch { toast.error("Failed"); }
  };

  const pickImage = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", f);
      const r = await api.post("/upload?folder=social", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setComposer((c) => ({ ...c, image_path: r.data.path }));
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); }
    e.target.value = "";
  };

  const submitPost = async () => {
    if (!composer.profile_id) return toast.error("Pick a profile first");
    if (!composer.caption.trim() && !composer.image_path) return;
    try {
      await api.post("/social/posts", {
        profile_id: composer.profile_id,
        caption: composer.caption,
        image_path: composer.image_path,
      });
      toast.success("Posted — character will see it on your next message");
      setComposer({ open: false, profile_id: composer.profile_id, caption: "", image_path: "" });
      load();
    } catch { toast.error("Post failed"); }
  };

  if (!open) return null;

  const q = search.trim().toLowerCase();
  const filteredPosts = q
    ? posts.filter((p) => {
        const prof = profiles.find((x) => x.id === p.profile_id);
        return (prof?.handle || "").toLowerCase().includes(q) || (p.caption || "").toLowerCase().includes(q);
      })
    : posts;

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-end" data-testid="chat-social-drawer">
      <div className="absolute inset-0 bg-black/60" onClick={onClose}/>
      <div className="relative bg-[#0E1015] border-l border-[#1E222B] w-full sm:max-w-md h-full sm:h-[92vh] sm:rounded-l-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E222B] flex-shrink-0">
          <div>
            <h3 className="font-semibold">Your social world</h3>
            <p className="text-xs text-[#6E7585]">Posts here are seen by characters in chat.</p>
          </div>
          <button onClick={onClose} className="text-[#9DA3AE] hover:text-white p-1.5" data-testid="social-drawer-close" aria-label="Close"><X className="w-5 h-5"/></button>
        </div>

        {!openPostId && (
          <>
            <div className="px-4 py-2 border-b border-[#1E222B] flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6E7585]"/>
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search handle or caption…"
                  className="w-full bg-[#13151B] border border-[#22252D] rounded-lg pl-9 pr-3 py-2 text-sm text-[#E8EAED] outline-none focus:border-[#D8B982]/40"
                  data-testid="social-drawer-search"/>
              </div>
              {profiles.length > 0 && (
                <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                  {profiles.map((p) => (
                    <div key={p.id} className="flex-shrink-0 px-2.5 py-1 bg-[#13151B] border border-[#22252D] rounded-full inline-flex items-center gap-1.5 text-xs">
                      {platformIcon(p.platform)} <span className="font-medium">@{p.handle}</span>
                      {p.verified && <BadgeCheck className="w-3 h-3 text-[#D8B982]"/>}
                      <span className="text-[#6E7585]">· {fmt(p.followers)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-3">
                {filteredPosts.length === 0 && (
                  <div className="text-center py-12 text-sm text-[#6E7585]">
                    {profiles.length === 0
                      ? "Create a profile in World tab first."
                      : "No posts yet — tap + to share something."}
                  </div>
                )}
                {filteredPosts.map((p) => {
                  const prof = profiles.find((x) => x.id === p.profile_id) || {};
                  return (
                    <div key={p.id} onClick={() => openDetail(p.id)}
                      className="bg-[#13151B] border border-[#1E222B] rounded-2xl overflow-hidden cursor-pointer hover:border-[#D8B982]/40 transition"
                      data-testid={`social-feed-post-${p.id}`}>
                      <div className="flex items-center gap-2 px-3 py-2">
                        {platformIcon(prof.platform)}
                        <span className="text-sm font-medium">@{prof.handle}</span>
                        {prof.verified && <BadgeCheck className="w-3.5 h-3.5 text-[#D8B982]"/>}
                        <span className="ml-auto text-[10px] text-[#6E7585]">{since(p.created_at)}</span>
                      </div>
                      {p.image_path && (
                        <div className="w-full bg-black">
                          <AuthMedia path={p.image_path} className="w-full max-h-72 object-cover"/>
                        </div>
                      )}
                      {p.caption && <p className="text-sm px-3 pt-2 whitespace-pre-wrap line-clamp-3">{p.caption}</p>}
                      <div className="flex items-center gap-3 px-3 py-2 text-xs text-[#9DA3AE]">
                        <span className="inline-flex items-center gap-1"><Heart className="w-3.5 h-3.5"/>{fmt(p.likes)}</span>
                        <span className="inline-flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5"/>{fmt(p.comments_count)}</span>
                        <span className="inline-flex items-center gap-1"><Share2 className="w-3.5 h-3.5"/>{fmt(p.shares)}</span>
                        <span className="inline-flex items-center gap-1"><Bookmark className="w-3.5 h-3.5"/>{fmt(p.saves)}</span>
                        <button onClick={(e) => { e.stopPropagation(); boost(p.id); }}
                          className="ml-auto inline-flex items-center gap-1 hover:text-amber-400" data-testid={`social-boost-${p.id}`}>
                          <Zap className="w-3.5 h-3.5"/> boost
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {profiles.length > 0 && (
              <div className="border-t border-[#1E222B] p-3 flex-shrink-0">
                {composer.open ? (
                  <div className="space-y-2">
                    <select value={composer.profile_id} onChange={(e) => setComposer({ ...composer, profile_id: e.target.value })}
                      className="w-full bg-[#13151B] border border-[#22252D] rounded-lg px-2 py-1.5 text-sm" data-testid="social-composer-profile">
                      {profiles.map((p) => <option key={p.id} value={p.id}>@{p.handle} ({p.platform})</option>)}
                    </select>
                    <textarea value={composer.caption} onChange={(e) => setComposer({ ...composer, caption: e.target.value })}
                      placeholder="What's on your mind?" rows={2}
                      className="w-full bg-[#13151B] border border-[#22252D] rounded-lg px-2 py-1.5 text-sm resize-none"
                      data-testid="social-composer-caption"/>
                    {composer.image_path && (
                      <div className="text-[11px] text-[#6E7585]">Image attached ✓ <button onClick={() => setComposer({ ...composer, image_path: "" })} className="hover:text-red-400">remove</button></div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => fileRef.current?.click()} disabled={uploading}
                        className="px-2 py-1.5 bg-[#13151B] border border-[#22252D] rounded-lg text-xs inline-flex items-center gap-1.5 hover:bg-[#1A1D24]"
                        data-testid="social-composer-image">
                        <ImageIcon className="w-3.5 h-3.5"/> {uploading ? "Uploading…" : "Add image"}
                      </button>
                      <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickImage}/>
                      <button onClick={submitPost}
                        className="ml-auto px-3 py-1.5 bg-[#D8B982] hover:bg-[#E0C798] rounded-lg text-xs font-medium inline-flex items-center gap-1"
                        data-testid="social-composer-submit">
                        <Send className="w-3 h-3"/> Post
                      </button>
                      <button onClick={() => setComposer({ ...composer, open: false, caption: "", image_path: "" })}
                        className="px-3 py-1.5 text-xs text-[#9DA3AE] hover:text-white">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setComposer({ ...composer, open: true })}
                    className="w-full px-3 py-2 bg-[#D8B982] hover:bg-[#E0C798] text-white rounded-lg text-sm font-medium inline-flex items-center justify-center gap-1.5"
                    data-testid="social-composer-open">
                    <Plus className="w-4 h-4"/> New post
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {openPostId && (
          <div className="flex-1 overflow-y-auto" data-testid="social-detail">
            <button onClick={() => { setOpenPostId(null); setPostDetail(null); }}
              className="px-4 py-2 text-xs text-[#9DA3AE] hover:text-white" data-testid="social-detail-back">← back to feed</button>
            {!postDetail ? (
              <div className="text-center py-12 text-sm text-[#6E7585]">Loading…</div>
            ) : (
              <div className="px-4 pb-4 space-y-3">
                <div className="bg-[#13151B] border border-[#1E222B] rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2">
                    {platformIcon(postDetail.profile.platform)}
                    <span className="text-sm font-medium">@{postDetail.profile.handle}</span>
                    {postDetail.profile.verified && <BadgeCheck className="w-3.5 h-3.5 text-[#D8B982]"/>}
                    <span className="ml-auto text-[10px] text-[#6E7585]">{since(postDetail.post.created_at)}</span>
                  </div>
                  {postDetail.post.image_path && (
                    <AuthMedia path={postDetail.post.image_path} className="w-full max-h-96 object-cover"/>
                  )}
                  {postDetail.post.caption && <p className="text-sm px-3 pt-2 whitespace-pre-wrap">{postDetail.post.caption}</p>}
                  <div className="flex items-center gap-3 px-3 py-2 text-xs text-[#9DA3AE]">
                    <button onClick={() => like(postDetail.post.id)} className="inline-flex items-center gap-1 hover:text-pink-400"><Heart className="w-3.5 h-3.5"/>{fmt(postDetail.post.likes)}</button>
                    <span className="inline-flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5"/>{fmt(postDetail.post.comments_count)}</span>
                    <span className="inline-flex items-center gap-1"><Share2 className="w-3.5 h-3.5"/>{fmt(postDetail.post.shares)}</span>
                    <span className="inline-flex items-center gap-1"><Bookmark className="w-3.5 h-3.5"/>{fmt(postDetail.post.saves)}</span>
                    <button onClick={() => boost(postDetail.post.id)} className="ml-auto inline-flex items-center gap-1 text-amber-400 hover:text-amber-300" data-testid="social-detail-boost">
                      <Zap className="w-3.5 h-3.5"/> boost time
                    </button>
                    <button onClick={() => delPost(postDetail.post.id)} className="hover:text-red-400" aria-label="Delete">
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {(postDetail.comments || []).map((c) => (
                    <div key={c.id} className={`flex items-start gap-2 px-2 py-1.5 rounded-lg ${
                      c.is_brand ? "bg-amber-500/5 border border-amber-500/20" :
                      c.is_user ? "bg-[#D8B982]/15 border border-[#D8B982]/40" : ""
                    }`} data-testid={`comment-${c.id}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs">
                          <span className={`font-medium ${c.is_brand ? "text-amber-400" : "text-[#E8EAED]"}`}>@{c.username}</span>
                          {c.is_brand && <BadgeCheck className="inline w-3 h-3 ml-0.5 text-amber-400"/>}
                          <span className="text-[#6E7585] ml-1.5">{since(c.created_at)}</span>
                        </p>
                        <p className="text-sm text-[#E8EAED] whitespace-pre-wrap">{c.text}</p>
                      </div>
                      {c.is_user && (
                        <button onClick={() => delComment(c.id)} className="text-[#6E7585] hover:text-red-400 p-1" aria-label="Delete">
                          <Trash2 className="w-3 h-3"/>
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 sticky bottom-0 pb-1 pt-2 bg-[#0E1015]">
                  <input value={newComment} onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addComment(); }}
                    placeholder="Add a comment…"
                    className="flex-1 bg-[#13151B] border border-[#22252D] rounded-full px-3 py-1.5 text-sm text-[#E8EAED] outline-none focus:border-[#D8B982]/40"
                    data-testid="comment-input"/>
                  <button onClick={addComment} disabled={!newComment.trim()}
                    className="px-3 py-1.5 bg-[#D8B982] hover:bg-[#E0C798] disabled:opacity-40 rounded-full text-xs font-medium inline-flex items-center gap-1"
                    data-testid="comment-submit">
                    <Send className="w-3 h-3"/>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
