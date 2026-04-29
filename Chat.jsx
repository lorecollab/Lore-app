import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../lib/api";
import { toast } from "sonner";
import {
  Send, Image as ImageIcon, X, Info, MoreVertical, MapPin, ChevronLeft,
  RefreshCw, Pencil, ChevronLeft as Prev, ChevronRight as Next, Check, X as Cancel,
  Mic, Phone, Volume2, Square, Settings as Cog, Trash2, RotateCcw, Eraser,
  Sparkles, Hash,
} from "lucide-react";
import AppShell from "../components/AppShell";
import Avatar from "../components/Avatar";
import AuthImage from "../components/AuthImage";
import AuthMedia from "../components/AuthMedia";
import AudioBubble from "../components/AudioBubble";
import CallScreen from "../components/CallScreen";
import PersonaPicker from "../components/PersonaPicker";
import ChatCustomizeDrawer from "../components/ChatCustomizeDrawer";
import ChatContextDrawer from "../components/ChatContextDrawer";
import ChatSocialDrawer from "../components/ChatSocialDrawer";
import useVoiceRecorder, { REC_MIN_SEC, REC_MAX_SEC } from "../hooks/useVoiceRecorder";
import { splitDialogueAction } from "../lib/messageText";
import { detectTypingMood, typingPattern, moodGlow, atmosphereToMood } from "../lib/typingMood";
import { FEATURES } from "../lib/features";

export default function Chat() {
  const { id } = useParams();
  const nav = useNavigate();
  const [character, setCharacter] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [scene, setScene] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attached, setAttached] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [regenId, setRegenId] = useState(null);
  const [callOpen, setCallOpen] = useState(false);
  const [playingTtsId, setPlayingTtsId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);
  const [chatSettings, setChatSettings] = useState({});
  const ttsAudioRef = useRef(null);
  const scrollRef = useRef(null);
  const fileRef = useRef(null);
  const audioFileRef = useRef(null);

  const recorder = useVoiceRecorder({
    onError: () => toast.error("Microphone permission needed"),
  });

  const customTypingStyle = chatSettings.typing_style && chatSettings.typing_style !== "auto"
    ? chatSettings.typing_style : null;
  const baseMood = useMemo(() => detectTypingMood(character, scene), [character, scene]);
  const typingMood = customTypingStyle || baseMood;
  const animSpeed = chatSettings.animation_speed ?? 1.0;
  const typingPat = typingPattern(typingMood, animSpeed);

  // Aura color from current mood (used for both ambient page glow and avatar ring)
  const auraEnabled = chatSettings.glow_enabled !== false;
  const auraColor = useMemo(() => moodGlow(typingMood), [typingMood]);

  // Backwards-compat ambient background glow at top of chat
  const glow = useMemo(() => {
    if (!auraEnabled) return null;
    return auraColor;
  }, [auraEnabled, auraColor]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/characters/${id}`),
      api.get(`/characters/${id}/messages`),
      api.get(`/characters/${id}/settings`),
    ])
      .then(([c, m, s]) => {
        setCharacter(c.data);
        setChatSettings(s.data || {});
        let msgs = m.data;
        if (msgs.length === 0 && c.data.greetings?.length > 0) {
          const idx = Math.floor(Math.random() * c.data.greetings.length);
          msgs = [{
            id: `greet-${id}`, character_id: id, user_id: "",
            role: "character", content: c.data.greetings[idx], image_path: "", audio_path: "",
            versions: [{ content: c.data.greetings[idx], image_path: "", audio_path: "", edited: false, created_at: new Date().toISOString() }],
            active_version: 0, scene: null, created_at: new Date().toISOString(),
          }];
        }
        setMessages(msgs);
        setScene([...m.data].reverse().find((x) => x.scene)?.scene || null);
      }).catch(() => toast.error("Could not load chat")).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const onPickImage = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const previewUrl = URL.createObjectURL(f);
    setAttached({ kind: "image", path: null, previewUrl, uploading: true });
    try {
      const fd = new FormData();
      fd.append("file", f);
      const r = await api.post("/upload?folder=chat", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setAttached({ kind: "image", path: r.data.path, previewUrl, uploading: false });
    } catch { toast.error("Upload failed"); setAttached(null); }
    e.target.value = "";
  };

  const onPickAudio = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error("Audio is too large (max 10MB)"); e.target.value = ""; return; }
    const allowed = /\.(mp3|wav|m4a|webm)$/i;
    if (!allowed.test(f.name) && !(f.type || "").startsWith("audio/")) {
      toast.error("Use .mp3, .wav, .m4a or recorded voice"); e.target.value = ""; return;
    }
    const previewUrl = URL.createObjectURL(f);
    setAttached({ kind: "audio", path: null, previewUrl, uploading: true, name: f.name });
    try {
      const fd = new FormData();
      fd.append("file", f);
      const r = await api.post("/upload?folder=chat", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setAttached({ kind: "audio", path: r.data.path, previewUrl, uploading: false, name: f.name });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Upload failed");
      setAttached(null);
    }
    e.target.value = "";
  };

  // when recorder finishes, auto-stage the blob as an audio attachment
  useEffect(() => {
    if (!recorder.blob) return;
    if (recorder.seconds < REC_MIN_SEC) {
      toast.error(`Hold for at least ${REC_MIN_SEC}s`);
      recorder.reset();
      return;
    }
    (async () => {
      const fd = new FormData();
      fd.append("file", recorder.blob, "voice.webm");
      setAttached({ kind: "audio", path: null, previewUrl: recorder.previewUrl, uploading: true, name: `Voice (${recorder.seconds}s)` });
      try {
        const r = await api.post("/upload?folder=chat", fd, { headers: { "Content-Type": "multipart/form-data" } });
        setAttached({ kind: "audio", path: r.data.path, previewUrl: recorder.previewUrl, uploading: false, name: `Voice (${recorder.seconds}s)` });
      } catch { toast.error("Upload failed"); setAttached(null); }
      recorder.reset();
    })();
    // eslint-disable-next-line
  }, [recorder.blob]);

  const send = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    const imagePath = attached?.kind === "image" ? attached.path : "";
    const audioPath = attached?.kind === "audio" ? attached.path : "";
    if ((!text && !imagePath && !audioPath) || sending) return;
    setInput("");
    setAttached(null);
    setSending(true);
    const tempUser = {
      id: `tmp-${Date.now()}`, role: "user", content: text, image_path: imagePath, audio_path: audioPath,
      versions: [{ content: text, image_path: imagePath, audio_path: audioPath, edited: false, created_at: new Date().toISOString() }],
      active_version: 0, character_id: id, user_id: "me", created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m.filter((x) => !String(x.id).startsWith("greet-")), tempUser]);
    try {
      const r = await api.post(`/characters/${id}/messages`, { content: text, image_path: imagePath, audio_path: audioPath });
      setMessages((m) => [...m.filter((x) => x.id !== tempUser.id), r.data.user_message, r.data.character_message]);
      setScene(r.data.scene);
      if (r.data.new_memories?.length) toast.success(`${r.data.new_memories.length} memor${r.data.new_memories.length > 1 ? "ies" : "y"} saved`);
    } catch (err) {
      setMessages((m) => m.filter((x) => x.id !== tempUser.id));
      toast.error("Couldn't send");
    } finally { setSending(false); }
  };

  const regenerate = async (mid) => {
    setRegenId(mid);
    try {
      const r = await api.post(`/messages/${mid}/regenerate`);
      setMessages((arr) => arr.map((x) => x.id === mid ? r.data : x));
    } catch { toast.error("Regenerate failed"); }
    finally { setRegenId(null); }
  };

  const switchVersion = async (mid, idx) => {
    try {
      const r = await api.patch(`/messages/${mid}`, { active_version: idx });
      setMessages((arr) => arr.map((x) => x.id === mid ? r.data : x));
    } catch { toast.error("Couldn't switch"); }
  };

  const startEdit = (m) => { setEditingId(m.id); setEditingText(m.content); };
  const saveEdit = async () => {
    const mid = editingId;
    try {
      const r = await api.patch(`/messages/${mid}`, { content: editingText });
      setMessages((arr) => arr.map((x) => x.id === mid ? r.data : x));
      setEditingId(null); setEditingText("");
    } catch { toast.error("Save failed"); }
  };

  const clearHistory = async () => {
    if (!window.confirm("Clear all messages in this chat? Memories stay.")) return;
    try { await api.delete(`/characters/${id}/messages`); setMessages([]); toast.success("Cleared"); setMenuOpen(false); }
    catch { toast.error("Failed"); }
  };

  const restartChat = async () => {
    if (!window.confirm("Restart this chat? All messages will be deleted; greeting will be re-rolled.")) return;
    try {
      const r = await api.post(`/characters/${id}/restart`);
      const greetings = r.data.greetings || character?.greetings || [];
      const greetMsg = greetings.length ? [{
        id: `greet-${id}-${Date.now()}`, character_id: id, user_id: "",
        role: "character", content: greetings[Math.floor(Math.random() * greetings.length)],
        image_path: "", audio_path: "",
        versions: [], active_version: 0, scene: null, created_at: new Date().toISOString(),
      }] : [];
      setMessages(greetMsg);
      toast.success("Restarted");
      setMenuOpen(false);
    } catch { toast.error("Failed"); }
  };

  const deleteChatFull = async () => {
    if (!window.confirm("Delete this chat entirely (messages, memories, settings)?")) return;
    try { await api.delete(`/characters/${id}/chat`); toast.success("Chat deleted"); nav("/chats"); }
    catch { toast.error("Failed"); }
  };

  const playTts = async (mid) => {
    if (playingTtsId === mid) {
      try { ttsAudioRef.current?.pause(); } catch {}
      setPlayingTtsId(null);
      return;
    }
    try {
      const r = await api.get(`/messages/${mid}/tts`, { responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      if (!ttsAudioRef.current) ttsAudioRef.current = new Audio();
      ttsAudioRef.current.src = url;
      ttsAudioRef.current.onended = () => setPlayingTtsId(null);
      ttsAudioRef.current.onpause = () => {};
      await ttsAudioRef.current.play();
      setPlayingTtsId(mid);
    } catch (e) {
      const detail = e?.response?.status === 400 ? "No spoken dialogue here" : "Voice playback failed";
      toast.error(detail);
    }
  };

  const addCallMessages = (userMsg, charMsg) => {
    setMessages((arr) => [...arr, userMsg, charMsg]);
  };

  if (loading) return <AppShell><div className="flex-1 flex items-center justify-center text-[#7A6D62]">Loading chat…</div></AppShell>;
  if (!character) return null;

  const isRecording = recorder.recording;

  return (
    <AppShell>
      <div className="flex-1 flex flex-col h-full min-w-0 relative" data-testid="chat-root" style={{
        fontSize: chatSettings.font_size ? `${chatSettings.font_size}px` : undefined,
      }}>
        {/* Background image/video with blur+dim */}
        {chatSettings.background_path && (
          <div className="absolute inset-0 z-0 pointer-events-none chat-ambient" data-testid="chat-bg">
            <AuthMedia path={chatSettings.background_path} className="w-full h-full object-cover" style={{ filter: `blur(${chatSettings.background_blur ?? 6}px)` }}/>
            <div className="absolute inset-0 bg-black" style={{ opacity: (chatSettings.background_dim ?? 50) / 100 }}/>
          </div>
        )}
        {/* Mood glow */}
        {glow && (
          <div className="absolute inset-0 z-0 pointer-events-none transition-[background] duration-[1500ms] ease-out" data-testid="chat-glow"
            style={{ background: `radial-gradient(circle at 50% 0%, ${glow}, transparent 70%)` }}/>
        )}
        <div className="relative z-10 flex-1 flex flex-col min-h-0">
        {/* header */}
        <div className="border-b border-[#3A2F2A] bg-[#211B18]">
          <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-3">
            <button onClick={() => nav("/chats")} className="md:hidden text-[#A99B91] hover:text-[#F7EFE6] p-1.5 -ml-1 rounded-lg hover:bg-[#241F1C]" aria-label="Back" data-testid="chat-back-btn">
              <ChevronLeft className="w-5 h-5"/>
            </button>
            <Link to={`/characters/${id}`} className="flex items-center gap-3 flex-1 min-w-0" data-testid="chat-header-link">
              <div className="relative" data-testid="chat-header-avatar-wrap">
                {auraEnabled && (
                  <div className="aura-ring" data-testid="character-aura" style={{ background: auraColor, animationDuration: `${(2.6 / Math.max(0.5, animSpeed)).toFixed(2)}s` }}/>
                )}
                <div className="relative">
                  <Avatar name={character.name} path={character.avatar_path} size={40}/>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#F7EFE6] truncate" data-testid="chat-char-name">{character.name}</p>
                <p className="text-xs text-[#A99B91] truncate">{character.description || character.role || "Online"}</p>
              </div>
            </Link>
            <PersonaPicker characterId={id} />
            {FEATURES.callMode && (
              <button
                onClick={() => setCallOpen(true)}
                className="text-emerald-400 hover:text-emerald-300 p-2 rounded-lg hover:bg-emerald-500/10"
                title="Call"
                data-testid="call-btn"
                aria-label="Start a call"
              >
                <Phone className="w-5 h-5"/>
              </button>
            )}
            <div className="relative">
              <button onClick={() => setMenuOpen((v) => !v)} className="text-[#A99B91] hover:text-[#F7EFE6] p-2 rounded-lg hover:bg-[#241F1C]" data-testid="chat-menu-btn" aria-label="Chat options">
                <MoreVertical className="w-5 h-5"/>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-60 lore-glass rounded-2xl shadow-2xl z-40 overflow-hidden" data-testid="chat-menu">
                  <button onClick={() => { setContextOpen(true); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#241F1C] text-left text-sm lore-cream" data-testid="menu-context">
                    <Sparkles className="w-4 h-4 lore-gold"/> Context / world
                  </button>
                  <button onClick={() => { setSocialOpen(true); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#241F1C] text-left text-sm lore-cream" data-testid="menu-social">
                    <Hash className="w-4 h-4 lore-gold"/> Social feed
                  </button>
                  <Link to={`/characters/${id}`} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-[#241F1C] text-sm lore-cream" data-testid="menu-profile">
                    <Cog className="w-4 h-4 lore-taupe"/> Character profile & memories
                  </Link>
                  <div className="border-t border-lore my-1"/>
                  <button onClick={restartChat} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#241F1C] text-left text-sm lore-cream" data-testid="menu-restart">
                    <RotateCcw className="w-4 h-4 lore-taupe"/> Restart chat
                  </button>
                  <button onClick={clearHistory} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#241F1C] text-left text-sm lore-cream" data-testid="menu-clear">
                    <Eraser className="w-4 h-4 lore-taupe"/> Clear history
                  </button>
                  <button onClick={deleteChatFull} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FF6B6B]/10 text-left text-sm text-[#FF6B6B]" data-testid="menu-delete">
                    <Trash2 className="w-4 h-4"/> Delete chat
                  </button>
                </div>
              )}
            </div>
          </div>
          {scene?.location && (
            <div className="px-6 pb-2 flex items-center gap-2 text-xs text-[#7A6D62]" data-testid="scene-bar">
              <MapPin className="w-3 h-3"/>
              <span>{scene.location}{scene.time_of_day ? ` · ${scene.time_of_day}` : ""}{scene.atmosphere ? ` · ${scene.atmosphere}` : ""}</span>
            </div>
          )}
        </div>

        {/* messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto" data-testid="messages-container">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-20 text-[#7A6D62]">
                <Avatar name={character.name} path={character.avatar_path} size={64} className="mx-auto mb-4"/>
                <p className="text-[#F7EFE6] font-medium">{character.name}</p>
                <p className="text-sm mt-1">Say hi to start chatting.</p>
              </div>
            )}
            <AnimatePresence initial={false}>
              {messages.map((m) => {
                const versions = m.versions || [{ content: m.content, image_path: m.image_path, audio_path: m.audio_path, edited: false }];
                const aIdx = m.active_version ?? 0;
                const total = versions.length;
                const isCharacter = m.role === "character";
                const isEditing = editingId === m.id;
                const isPersisted = !String(m.id).startsWith("tmp-") && !String(m.id).startsWith("greet-");
                const isRegenLoading = regenId === m.id;
                const segments = splitDialogueAction(m.content);
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex items-end gap-2 ${isCharacter ? "justify-start" : "justify-end"}`}
                    data-testid={`message-${m.role}-${m.id}`}
                  >
                    {isCharacter && <Avatar name={character.name} path={character.avatar_path} size={28}/>}
                    <div className={`max-w-[78%] ${isCharacter ? "items-start" : "items-end"} flex flex-col gap-1 group/msg`}>
                      {m.image_path && (
                        <div className="rounded-2xl overflow-hidden bg-[#241F1C]">
                          <AuthImage path={m.image_path} alt="attachment" className="max-w-[320px] max-h-[400px] object-cover"/>
                        </div>
                      )}
                      {m.audio_path && (
                        <div className={`rounded-2xl px-3 py-2 ${isCharacter ? "bg-[#241F1C]" : "bg-[#D8B982]"}`}>
                          <AudioBubble path={m.audio_path} accent={!isCharacter}/>
                        </div>
                      )}
                      {isEditing ? (
                        <div className="bg-[#241F1C] rounded-2xl rounded-bl-md p-3 w-full" data-testid={`msg-edit-${m.id}`}>
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            rows={3}
                            className="w-full bg-[#13151B] border border-[#3A2F2A] focus:border-[#D8B982] outline-none rounded-lg p-2 text-sm text-[#F7EFE6] resize-none"
                            autoFocus
                            data-testid={`msg-edit-textarea-${m.id}`}
                          />
                          <div className="flex gap-2 mt-2">
                            <button onClick={saveEdit} className="px-3 py-1.5 bg-[#D8B982] hover:bg-[#E0C798] text-[#15110F] rounded-md text-xs font-medium inline-flex items-center gap-1" data-testid={`msg-edit-save-${m.id}`}>
                              <Check className="w-3 h-3"/> Save
                            </button>
                            <button onClick={() => { setEditingId(null); setEditingText(""); }} className="px-3 py-1.5 text-[#A99B91] hover:text-[#F7EFE6] text-xs inline-flex items-center gap-1" data-testid={`msg-edit-cancel-${m.id}`}>
                              <Cancel className="w-3 h-3"/> Cancel
                            </button>
                          </div>
                        </div>
                      ) : m.content ? (
                        <div className={`px-4 py-2.5 rounded-3xl text-[15px] leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
                          isCharacter ? "lore-ivory rounded-bl-lg" : "text-[#15110F] rounded-br-lg"
                        }`}
                        style={{
                          background: isCharacter
                            ? (chatSettings.char_bubble_color || "#241F1C")
                            : (chatSettings.user_bubble_color || "#D8B982"),
                        }}>
                          {segments.map((seg, i) => seg.type === "action" ? (
                            <span key={i} className={`italic ${isCharacter ? "lore-muted" : "text-[#15110F]/65"}`}>*{seg.text}*</span>
                          ) : (
                            <span key={i}>{seg.text}</span>
                          ))}
                          {versions[aIdx]?.edited && (
                            <span className="ml-1 text-[10px] opacity-60 italic">(edited)</span>
                          )}
                        </div>
                      ) : null}
                      {/* version + voice + actions for character messages */}
                      {isCharacter && isPersisted && !isEditing && (
                        <div className="flex items-center gap-1 mt-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                          {FEATURES.externalTTS && m.content && (
                            <button
                              onClick={() => playTts(m.id)}
                              className="p-1.5 bg-[#241F1C] border border-[#3A2F2A] rounded-full text-[#A99B91] hover:text-[#D8B982]"
                              title={playingTtsId === m.id ? "Stop" : "Play voice"}
                              data-testid={`msg-tts-${m.id}`}
                            >
                              {playingTtsId === m.id ? <Square className="w-3 h-3"/> : <Volume2 className="w-3 h-3"/>}
                            </button>
                          )}
                          {total > 1 && (
                            <div className="flex items-center bg-[#241F1C] border border-[#3A2F2A] rounded-full" data-testid={`msg-version-counter-${m.id}`}>
                              <button
                                onClick={() => switchVersion(m.id, Math.max(0, aIdx - 1))}
                                disabled={aIdx === 0}
                                className="p-1 text-[#A99B91] hover:text-[#F7EFE6] disabled:opacity-30 disabled:cursor-not-allowed"
                                data-testid={`msg-version-prev-${m.id}`}
                                aria-label="Previous version"
                              >
                                <Prev className="w-3 h-3"/>
                              </button>
                              <span className="text-[10px] text-[#A99B91] px-1 tabular-nums">{aIdx + 1}/{total}</span>
                              <button
                                onClick={() => switchVersion(m.id, Math.min(total - 1, aIdx + 1))}
                                disabled={aIdx >= total - 1}
                                className="p-1 text-[#A99B91] hover:text-[#F7EFE6] disabled:opacity-30 disabled:cursor-not-allowed"
                                data-testid={`msg-version-next-${m.id}`}
                                aria-label="Next version"
                              >
                                <Next className="w-3 h-3"/>
                              </button>
                            </div>
                          )}
                          <button
                            onClick={() => regenerate(m.id)}
                            disabled={isRegenLoading}
                            className="p-1.5 bg-[#241F1C] border border-[#3A2F2A] rounded-full text-[#A99B91] hover:text-[#D8B982] disabled:opacity-50"
                            title="Regenerate"
                            data-testid={`msg-regenerate-${m.id}`}
                          >
                            <RefreshCw className={`w-3 h-3 ${isRegenLoading ? "animate-spin" : ""}`}/>
                          </button>
                          <button
                            onClick={() => startEdit(m)}
                            className="p-1.5 bg-[#241F1C] border border-[#3A2F2A] rounded-full text-[#A99B91] hover:text-[#D8B982]"
                            title="Edit"
                            data-testid={`msg-edit-btn-${m.id}`}
                          >
                            <Pencil className="w-3 h-3"/>
                          </button>
                        </div>
                      )}
                          {!isCharacter && isPersisted && !isEditing && m.content && (
                            <div className="flex items-center gap-1 mt-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                              <button
                                onClick={() => startEdit(m)}
                                className="p-1.5 bg-[#241F1C] border border-[#3A2F2A] rounded-full text-[#A99B91] hover:text-[#D8B982]"
                                title="Edit"
                                data-testid={`msg-edit-btn-${m.id}`}
                              >
                                <Pencil className="w-3 h-3"/>
                              </button>
                            </div>
                          )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {sending && (
              <div className="flex items-end gap-2" data-testid="typing-indicator">
                <Avatar name={character.name} path={character.avatar_path} size={28}/>
                <div className="bg-[#241F1C] rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1" title={`${typingMood} · ${typingPat.label}`} data-testid={`typing-mood-${typingMood}`}>
                  {[0,1,2].map((i) => (
                    <span key={i} className="typing-dot block w-1.5 h-1.5 rounded-full" style={{
                      background: typingPat.color,
                      animationDuration: `${typingPat.duration}s`,
                      animationDelay: `${typingPat.rhythm[i]}s`,
                      transform: `scaleY(${typingPat.bounce})`,
                    }}/>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* composer */}
        <form onSubmit={send} className="border-t border-[#3A2F2A] bg-[#211B18] p-3 sm:p-4" data-testid="chat-input-form">
          <div className="max-w-3xl mx-auto">
            {attached && (
              <div className="mb-2 inline-flex items-center gap-2 bg-[#13151B] border border-[#3A2F2A] rounded-xl p-2 max-w-full" data-testid="attachment-preview">
                {attached.kind === "image" ? (
                  <img src={attached.previewUrl} alt="" className="h-16 rounded-lg object-cover"/>
                ) : (
                  <div className="flex items-center gap-2 px-2 py-1">
                    <Volume2 className="w-4 h-4 text-[#D8B982]"/>
                    <span className="text-sm text-[#F7EFE6] truncate max-w-[180px]">{attached.name || "Audio"}</span>
                  </div>
                )}
                {attached.uploading && <span className="text-xs text-[#A99B91]">Uploading…</span>}
                <button type="button" onClick={() => setAttached(null)} className="text-[#A99B91] hover:text-white p-1" aria-label="Remove">
                  <X className="w-3 h-3"/>
                </button>
              </div>
            )}
            {isRecording && (
              <div className="mb-2 flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2" data-testid="recording-indicator">
                <span className="block w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
                <span className="text-sm text-[#F7EFE6]">Recording…</span>
                <span className="text-xs text-[#A99B91] tabular-nums ml-auto">{recorder.seconds}s / {REC_MAX_SEC}s</span>
                <button type="button" onClick={() => recorder.cancel()} className="text-xs text-[#A99B91] hover:text-white">Cancel</button>
                <button type="button" onClick={() => recorder.stop()} disabled={recorder.seconds < 1}
                  className="px-3 py-1 bg-red-500 hover:bg-red-400 text-white text-xs rounded-md font-medium" data-testid="recording-stop">
                  {recorder.seconds < REC_MIN_SEC ? `Min ${REC_MIN_SEC}s` : "Stop"}
                </button>
              </div>
            )}
            <div className="flex items-end gap-2 bg-[#13151B] border border-[#3A2F2A] rounded-2xl px-2 py-1.5 focus-within:border-[#D8B982]/60 transition-colors">
              <button type="button" onClick={() => fileRef.current?.click()} className="p-2 text-[#A99B91] hover:text-[#F7EFE6]" data-testid="chat-attach-btn" aria-label="Attach image" disabled={isRecording}>
                <ImageIcon className="w-5 h-5"/>
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} data-testid="chat-file-input"/>
              <button type="button" onClick={() => audioFileRef.current?.click()} className="p-2 text-[#A99B91] hover:text-[#F7EFE6]" data-testid="chat-attach-audio-btn" aria-label="Attach audio" disabled={isRecording}>
                <Volume2 className="w-5 h-5"/>
              </button>
              <input ref={audioFileRef} type="file" accept="audio/*" hidden onChange={onPickAudio} data-testid="chat-audio-input"/>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); } }}
                placeholder={isRecording ? "Recording voice…" : `Message ${character.name}…`}
                rows={1}
                disabled={sending || isRecording}
                className="flex-1 resize-none bg-transparent text-[#F7EFE6] placeholder:text-[#7A6D62] outline-none px-2 py-2 max-h-32 disabled:opacity-50"
                data-testid="chat-input"
              />
              {!isRecording && !input.trim() && !attached?.path ? (
                <button type="button" onClick={() => recorder.start()} className="bg-[#3A2F2A] hover:bg-[#2A2D36] text-[#F7EFE6] rounded-full p-2.5" data-testid="mic-btn" aria-label="Record voice">
                  <Mic className="w-4 h-4"/>
                </button>
              ) : (
                <button
                  type="submit" disabled={sending || (!input.trim() && !attached?.path) || attached?.uploading || isRecording}
                  className="bg-[#D8B982] hover:bg-[#E0C798] disabled:opacity-40 disabled:cursor-not-allowed text-[#15110F] rounded-full p-2.5 transition-colors"
                  data-testid="chat-send"
                >
                  <Send className="w-4 h-4"/>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      </div>

      <CallScreen
        open={callOpen}
        onClose={() => setCallOpen(false)}
        character={character}
        characterId={id}
        addMessage={addCallMessages}
      />

      <ChatCustomizeDrawer
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        characterId={id}
        settings={chatSettings}
        onChange={(next) => setChatSettings(next)}
      />

      <ChatContextDrawer
        open={contextOpen}
        onClose={() => setContextOpen(false)}
        characterId={id}
        settings={chatSettings}
        onChange={(next) => setChatSettings(next)}
      />

      <ChatSocialDrawer
        open={socialOpen}
        onClose={() => setSocialOpen(false)}
      />
    </AppShell>
  );
}
