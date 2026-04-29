import React, { useEffect, useRef, useState } from "react";
import { api, API } from "../lib/api";
import { Pause, Play } from "lucide-react";

// Plays an audio file fetched from /api/files/{path} with auth header.
export default function AudioBubble({ path, accent = false }) {
  const [src, setSrc] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    let revoke = null;
    let cancelled = false;
    if (!path) return;
    (async () => {
      try {
        const r = await api.get(`/files/${path}`, { responseType: "blob" });
        if (cancelled) return;
        const url = URL.createObjectURL(r.data);
        revoke = url;
        setSrc(url);
      } catch {}
    })();
    return () => { cancelled = true; if (revoke) URL.revokeObjectURL(revoke); };
  }, [path]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause(); else audioRef.current.play();
  };

  const fmt = (s) => {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const pct = duration ? (position / duration) * 100 : 0;
  const trackBg = accent ? "bg-white/30" : "bg-[#22252D]";
  const fill = accent ? "bg-white" : "bg-[#D8B982]";
  const iconBg = accent ? "bg-white/20 hover:bg-white/30 text-white" : "bg-[#D8B982] hover:bg-[#E0C798] text-white";

  return (
    <div className={`flex items-center gap-3 min-w-[220px] max-w-[300px] ${accent ? "text-white" : "text-[#E8EAED]"}`} data-testid="audio-bubble">
      <button onClick={toggle} className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${iconBg}`} aria-label={playing ? "Pause" : "Play"} data-testid="audio-play-btn">
        {playing ? <Pause className="w-4 h-4"/> : <Play className="w-4 h-4 ml-0.5"/>}
      </button>
      <div className="flex-1">
        <div className={`relative h-1 rounded-full ${trackBg}`}>
          <div className={`absolute left-0 top-0 h-1 rounded-full ${fill}`} style={{ width: `${pct}%` }}/>
        </div>
        <div className={`text-[10px] mt-1 tabular-nums ${accent ? "text-white/80" : "text-[#9DA3AE]"}`}>
          {fmt(position)} / {fmt(duration)}
        </div>
      </div>
      {src && (
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setPosition(0); }}
          className="hidden"
        />
      )}
    </div>
  );
}
