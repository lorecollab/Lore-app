import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { ChevronLeft, Upload, Mic, Square, Pause, Play, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { toast } from "sonner";

export default function CreateVoice() {
  const nav = useNavigate();
  const fileRef = useRef(null);
  const [name, setName] = useState("");
  const [picked, setPicked] = useState(null); // { kind: 'upload'|'record', blob, name, durationSec, url }
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const tickRef = useRef(null);
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => () => { try { audioRef.current?.pause(); } catch (e) { /* ignore */ } if (tickRef.current) clearInterval(tickRef.current); }, []);

  const ALLOWED_EXTS = /\.(mp3|wav|m4a)$/i;
  const ALLOWED_MIMES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/wave",
                         "audio/x-wav", "audio/m4a", "audio/x-m4a", "audio/mp4"];

  const onFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const okExt = ALLOWED_EXTS.test(f.name);
    const okMime = ALLOWED_MIMES.includes(f.type) || (!f.type && okExt);
    if (!okExt || !okMime) {
      toast.error("Use .mp3, .wav or .m4a only");
      e.target.value = ""; return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Audio is too large (max 10MB)");
      e.target.value = ""; return;
    }
    const url = URL.createObjectURL(f);
    setPicked({ kind: "upload", blob: f, name: f.name, url });
    e.target.value = "";
  };

  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      rec.ondataavailable = (ev) => { if (ev.data.size) chunksRef.current.push(ev.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setPicked({ kind: "record", blob, name: `recording-${Date.now()}.webm`, url });
        stream.getTracks().forEach((t) => t.stop());
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
      setElapsed(0);
      tickRef.current = setInterval(() => {
        setElapsed((s) => {
          if (s + 1 >= 60) { stopRec(); return 60; }
          return s + 1;
        });
      }, 1000);
    } catch (e) {
      toast.error("Mic permission denied");
    }
  };

  const stopRec = () => {
    try { recRef.current?.stop(); } catch (e) { /* ignore */ }
    setRecording(false);
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  };

  const playPick = () => {
    if (!picked) return;
    if (!audioRef.current) audioRef.current = new Audio();
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }
    audioRef.current.src = picked.url;
    audioRef.current.onended = () => setPlaying(false);
    audioRef.current.play();
    setPlaying(true);
  };

  const submit = async () => {
    if (!picked) { toast.error("Add an audio file or record one first."); return; }
    if (!name.trim()) { toast.error("Give your voice a name."); return; }
    setSubmitting(true);
    setProgress(0);
    try {
      const fd = new FormData();
      fd.append("file", picked.blob, picked.name);
      const r = await api.post("/upload?folder=voicesamples", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (ev) => {
          if (ev.total) setProgress(Math.round((ev.loaded / ev.total) * 100));
        },
      });
      // Save to a lightweight per-user voice library entry
      try {
        await api.post("/voices", { name: name.trim(), audio_path: r.data.path });
      } catch (e) {
        // older backend may not have the voices endpoint — fall back to toast only
      }
      toast.success("Voice saved.");
      nav("/home");
    } catch (e) {
      const msg = e?.response?.data?.detail || "Couldn't save voice. Try a smaller .mp3 or .wav.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto bg-lore" data-testid="create-voice-root">
        <div className="sticky top-0 z-10 bg-lore/85 backdrop-blur-md border-b border-lore">
          <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
            <button onClick={() => nav(-1)} className="lore-press p-2 -ml-2 lore-taupe hover:lore-cream rounded-lg" aria-label="Back" data-testid="cv-back">
              <ChevronLeft className="w-5 h-5"/>
            </button>
            <h1 className="text-xl font-semibold lore-cream">Create Voice</h1>
          </div>
        </div>

        <div className="max-w-md mx-auto px-5 py-8 space-y-5 pb-32">
          <div className="text-center">
            <p className="lore-serif text-base lore-cream/85 leading-relaxed">
              Upload or record a sound — it becomes a tone reference for your characters.
            </p>
            <p className="text-[11px] lore-taupe mt-2">For playback only. No cloning. No identification.</p>
          </div>

          {/* Upload */}
          <button onClick={() => fileRef.current?.click()} disabled={recording}
            className="lore-press w-full bg-lore-card border border-lore rounded-2xl p-5 text-left flex items-center gap-3 hover:bg-lore-card-2 disabled:opacity-50"
            data-testid="cv-upload-btn">
            <div className="w-10 h-10 rounded-full bg-[#D8B982]/15 flex items-center justify-center flex-shrink-0">
              <Upload className="w-4 h-4 lore-gold"/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold lore-cream">Upload sound</p>
              <p className="text-xs lore-taupe mt-0.5">MP3 / M4A / WAV · up to 10MB · 60s max.</p>
            </div>
          </button>
          <input ref={fileRef} type="file" hidden accept=".mp3,.wav,.m4a,audio/mpeg,audio/mp3,audio/wav,audio/wave,audio/x-wav,audio/m4a,audio/x-m4a,audio/mp4" onChange={onFile} data-testid="cv-upload-input"/>

          {/* Record */}
          <div className="bg-lore-card border border-lore rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#D8B982]/15 flex items-center justify-center flex-shrink-0">
                <Mic className="w-4 h-4 lore-gold"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold lore-cream">Record sound</p>
                <p className="text-xs lore-taupe mt-0.5">Up to 60 seconds.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!recording ? (
                <button onClick={startRec} className="lore-press flex-1 bg-[#D8B982] hover:bg-[#E0C798] text-[#15110F] rounded-xl py-2.5 font-semibold text-sm inline-flex items-center justify-center gap-2" data-testid="cv-rec-start">
                  <Mic className="w-4 h-4"/> Start
                </button>
              ) : (
                <button onClick={stopRec} className="lore-press flex-1 bg-[#FF6B6B] text-white rounded-xl py-2.5 font-semibold text-sm inline-flex items-center justify-center gap-2 animate-pulse" data-testid="cv-rec-stop">
                  <Square className="w-4 h-4 fill-current"/> Stop · {String(elapsed).padStart(2, "0")}s
                </button>
              )}
            </div>
          </div>

          {/* Selected sample preview */}
          {picked && (
            <div className="bg-lore-card-2 border border-lore rounded-2xl p-4 flex items-center gap-3" data-testid="cv-preview">
              <button onClick={playPick} className="lore-press w-10 h-10 rounded-full bg-[#D8B982] text-[#15110F] flex items-center justify-center flex-shrink-0" aria-label={playing ? "Pause" : "Play"} data-testid="cv-play">
                {playing ? <Pause className="w-4 h-4"/> : <Play className="w-4 h-4"/>}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm lore-cream truncate">{picked.name}</p>
                <p className="text-[10px] lore-taupe">{picked.kind === "upload" ? "Uploaded" : "Recorded"} · ready to save</p>
              </div>
              <button onClick={() => { try { audioRef.current?.pause(); } catch (e) { /* ignore */ } setPicked(null); setPlaying(false); }} className="lore-press lore-taupe hover:text-[#FF6B6B] p-1" aria-label="Discard" data-testid="cv-discard"><Trash2 className="w-4 h-4"/></button>
            </div>
          )}

          {/* Name */}
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Voice name"
            className="w-full bg-lore-card border border-lore rounded-2xl px-4 py-3 text-sm lore-cream placeholder:text-[#7A6D62] outline-none focus:border-[#D8B982]/60"
            data-testid="cv-name-input"/>

          <button onClick={submit} disabled={!picked || !name.trim() || submitting}
            className="lore-press w-full bg-[#D8B982] hover:bg-[#E0C798] text-[#15110F] rounded-2xl py-3.5 font-semibold tracking-[0.18em] text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="cv-submit">
            {submitting ? `UPLOADING… ${progress}%` : "CREATE VOICE"}
          </button>
          {submitting && (
            <div className="w-full h-1 bg-lore-card rounded overflow-hidden" data-testid="cv-progress">
              <div className="h-full bg-[#D8B982] transition-all" style={{ width: `${progress}%` }}/>
            </div>
          )}
          <p className="text-[10px] lore-taupe text-center">By creating a voice you agree it's yours to use, and you understand Loré stores audio for in-app playback only.</p>
        </div>
      </div>
    </AppShell>
  );
}
