import React, { useEffect, useState } from "react";
import { api } from "../lib/api";

// Auto-detects image vs video by extension and renders accordingly with auth headers.
const VIDEO_RE = /\.(mp4|webm|mov|ogg)$/i;

export default function AuthMedia({ path, alt = "", className = "", style }) {
  const [src, setSrc] = useState(null);
  const isVideo = VIDEO_RE.test(path || "");

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
      } catch (e) {
        // silent
      }
    })();
    return () => { cancelled = true; if (revoke) URL.revokeObjectURL(revoke); };
  }, [path]);

  if (!path) return null;
  if (!src) return <div className={`bg-[#1A1D24] animate-pulse ${className}`} style={style} />;
  if (isVideo) {
    return (
      <video
        src={src}
        className={className}
        style={style}
        autoPlay
        loop
        muted
        playsInline
      />
    );
  }
  return <img src={src} alt={alt} className={className} style={style} />;
}
