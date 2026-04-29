import React from "react";
import AuthImage from "./AuthImage";

const COLORS = [
  "bg-[#D8B982]/15 text-[#D8B982]",
  "bg-[#3A2F2A] text-[#F7EFE6]",
  "bg-[#241F1C] text-[#D8B982]",
  "bg-[#5B463C]/40 text-[#F7EFE6]",
];

function pickColor(seed = "") {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

export default function Avatar({ name = "?", path = "", size = 40, className = "" }) {
  const initials = (name || "?").trim().slice(0, 1).toUpperCase();
  const style = { width: size, height: size, fontSize: Math.max(12, Math.floor(size / 2.4)) };
  const colorClass = pickColor(name);
  return (
    <div
      style={style}
      className={`relative shrink-0 overflow-hidden rounded-full flex items-center justify-center font-semibold ${path ? "" : colorClass} ${className}`}
    >
      {path ? (
        <AuthImage path={path} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
