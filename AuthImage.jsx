import React, { useEffect, useState } from "react";
import { api } from "../lib/api";

// Renders an authenticated image fetched from /api/files/{path}.
// If `path` is an absolute URL (http/https), renders it directly without auth.
// Long-press save menus are suppressed via onContextMenu preventDefault.
export default function AuthImage({ path, alt = "", className = "", style }) {
  const isExternal = typeof path === "string" && /^https?:\/\//i.test(path);
  const [src, setSrc] = useState(isExternal ? path : null);

  useEffect(() => {
    if (isExternal) { setSrc(path); return; }
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
  }, [path, isExternal]);

  if (!path) return null;
  if (!src) return <div className={`bg-[#1A1D24] animate-pulse ${className}`} style={style} />;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
