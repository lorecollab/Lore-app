import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Avatar from "./Avatar";
import { api } from "../lib/api";
import { dialogueOnly } from "../lib/messageText";
import { detectTypingMood, typingPattern } from "../lib/typingMood";
import useVoiceRecorder, { REC_MIN_SEC, REC_MAX_SEC } from "../hooks/useVoiceRecorder";
import { Mic, Phone, X } from "lucide-react";
import { toast } from "sonner";

export default function CallScreen({ open, onClose, character, characterId, addMessage }) {
  const [phase, setPhase] = useState("idle"); // idle | recording | processing | speaking
  const [lastReply, setLastReply] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);
  const audioRef = useRef(null);
  const recorder = useVoiceRecorder({
    onError: () => toast.error("Microphone permission needed for calls"),
  });
  const mood = detectTypingMood(character);
  const pat = typingPattern(mood);

  useEffect(() => {
    if (!open) {
      try { audioRef.current?.pause(); } catch {}
      setAudioUrl(null);
      setPhase("idle");
      setLastReply("");
      recorder.cancel();
    }
    // eslint-disable-next-line
  }, [open]);

  const startRec = () => {
    if (phase !== "idle") return;
    setPhase("recording");
    recorder.start();
  };

  const stopAndSend = async () => {
    if (phase !== "recording") return;
    if (recorder.seconds < REC_MIN_SEC) {
      toast.error(`Hold for at least ${REC_MIN_SEC}s`);
      recorder.cancel();
      setPhase("idle");
      return;
    }
    recorder.stop();
    setPhase("processing");
  };

  // When recorder gives us a blob, upload + send + autoplay reply
  useEffect(() => {
    if (!recorder.blob || phase !== "processing") return;
    (async () => {
      try {
        const fd = new FormData();
        fd.append("file", recorder.blob, "call.webm");
        const up = await api.post("/upload?folder=audio", fd, { headers: { "Content-Type": "multipart/form-data" } });
        const r = await api.post(`/characters/${characterId}/messages`, { content: "", audio_path: up.data.path });
        addMessage?.(r.data.user_message, r.data.character_message);
        setLastReply(r.data.character_message.content);
        // request TTS
        const tts = await api.get(`/messages/${r.data.character_message.id}/tts`, { responseType: "blob" });
        const url = URL.createObjectURL(tts.data);
        setAudioUrl(url);
        setPhase("speaking");
      } catch (e) {
        toast.error("Couldn't reach them");
        setPhase("idle");
      } finally {
        recorder.reset();
      }
    })();
    // eslint-disable-next-line
  }, [recorder.blob, phase]);

  useEffect(() => {
    if (!audioUrl || !audioRef.current) return;
    audioRef.current.play().catch(() => {});
  }, [audioUrl]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-gradient-to-b from-[#3A2F2A]/40 via-[#0E1015] to-[#0E1015] backdrop-blur-xl flex flex-col items-center justify-between p-8"
        data-testid="call-screen"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-[#9DA3AE] hover:text-white p-2" data-testid="call-close" aria-label="End call">
          <X className="w-6 h-6"/>
        </button>

        <div className="text-center mt-12">
          <p className="text-[#9DA3AE] uppercase tracking-widest text-xs">{phase === "speaking" ? "Speaking" : phase === "recording" ? "Listening" : phase === "processing" ? "Connecting" : "On call"}</p>
          <h2 className="font-bold text-3xl mt-2" data-testid="call-character-name">{character?.name}</h2>
        </div>

        <div className="relative">
          <motion.div
            animate={phase === "speaking" ? { scale: [1, 1.05, 1] } : { scale: 1 }}
            transition={{ duration: 1.5, repeat: phase === "speaking" ? Infinity : 0 }}
            className="rounded-full"
            style={{ boxShadow: phase === "speaking" ? "0 0 80px 8px rgba(99,102,241,0.45)" : "0 0 50px 4px rgba(99,102,241,0.25)" }}
          >
            <Avatar name={character?.name} path={character?.avatar_path} size={200} className="ring-4 ring-white/10"/>
          </motion.div>
          {phase === "processing" && (
            <div className="absolute inset-x-0 -bottom-10 flex items-center justify-center gap-1.5">
              {[0,1,2].map((i) => (
                <span key={i} className="typing-dot block w-2 h-2 rounded-full" style={{ background: pat.color, animationDuration: `${pat.duration}s`, animationDelay: `${i * 0.15}s` }}/>
              ))}
            </div>
          )}
        </div>

        {lastReply && (
          <div className="max-w-md text-center text-[#E8EAED] text-base leading-relaxed bg-white/5 backdrop-blur rounded-2xl px-6 py-4 mt-6" data-testid="call-last-reply">
            "{dialogueOnly(lastReply)}"
          </div>
        )}

        <div className="mb-8 flex flex-col items-center gap-3">
          {phase === "recording" ? (
            <button
              onMouseUp={stopAndSend}
              onTouchEnd={stopAndSend}
              onClick={stopAndSend}
              className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center text-white shadow-lg shadow-red-500/30"
              data-testid="call-stop-btn"
              aria-label="Stop and send"
            >
              <span className="block w-7 h-7 rounded-md bg-white"/>
            </button>
          ) : (
            <button
              onMouseDown={startRec}
              onTouchStart={startRec}
              onClick={phase === "idle" ? startRec : undefined}
              disabled={phase !== "idle"}
              className="w-20 h-20 rounded-full bg-[#D8B982] hover:bg-[#E0C798] flex items-center justify-center text-white disabled:opacity-50 shadow-lg shadow-[#D8B982]/30"
              data-testid="call-talk-btn"
              aria-label="Hold to talk"
            >
              <Mic className="w-8 h-8"/>
            </button>
          )}
          <p className="text-xs text-[#9DA3AE]">
            {phase === "recording" ? `Recording ${recorder.seconds}s — release when done (min ${REC_MIN_SEC}s)` :
             phase === "processing" ? "They're listening…" :
             phase === "speaking" ? "Tap mic to reply" :
             "Tap mic to speak"}
          </p>
        </div>

        {audioUrl && (
          <audio ref={audioRef} src={audioUrl} onEnded={() => setPhase("idle")} className="hidden"/>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
