// Derive typing animation timing from character personality + last message tone.
// Each pattern returns: duration (cycle), color, label, rhythm (per-dot delay multiplier),
// dispersion (random pause chance), and bounce (amplitude scale).

const PATTERNS = {
  smooth:   { duration: 0.9,  color: "#9DA3AE", label: "typing",   rhythm: [0, 0.15, 0.30], bounce: 1.0 },
  fast:     { duration: 0.45, color: "#A0EFC8", label: "typing",   rhythm: [0, 0.07, 0.14], bounce: 0.7 },
  slow:     { duration: 1.8,  color: "#9DA3AE", label: "thinking", rhythm: [0, 0.30, 0.60], bounce: 1.4 },
  shy:      { duration: 1.6,  color: "#F3B8D6", label: "thinking", rhythm: [0, 0.40, 0.55], bounce: 1.2 },
  dramatic: { duration: 1.4,  color: "#C4A6F4", label: "pausing",  rhythm: [0, 0.45, 0.20], bounce: 1.6 },
  angry:    { duration: 0.55, color: "#F08A8A", label: "snapping", rhythm: [0, 0.05, 0.10], bounce: 0.9 },
  sad:      { duration: 2.0,  color: "#7DA8E0", label: "typing",   rhythm: [0, 0.55, 0.95], bounce: 1.3 },
  casual:   { duration: 1.0,  color: "#9DA3AE", label: "typing",   rhythm: [0, 0.18, 0.36], bounce: 1.0 },
  detailed: { duration: 1.1,  color: "#9DA3AE", label: "writing",  rhythm: [0, 0.20, 0.40], bounce: 1.0 },
  emotional:{ duration: 1.3,  color: "#F4A6C4", label: "feeling",  rhythm: [0, 0.35, 0.50], bounce: 1.5 },
  dry:      { duration: 0.8,  color: "#9DA3AE", label: "typing",   rhythm: [0, 0.10, 0.20], bounce: 0.6 },
  short:    { duration: 0.6,  color: "#9DA3AE", label: "typing",   rhythm: [0, 0.10, 0.20], bounce: 0.8 },
  long:     { duration: 1.6,  color: "#9DA3AE", label: "writing",  rhythm: [0, 0.25, 0.50], bounce: 1.2 },
  default:  { duration: 1.2,  color: "#9DA3AE", label: "typing",   rhythm: [0, 0.15, 0.30], bounce: 1.0 },
};

const KEYWORDS = [
  ["angry",    ["angry", "furious", "rage", "sharp", "hostile", "aggressive", "violent"]],
  ["sad",      ["sad", "melancholy", "depressed", "grieving", "withdrawn", "tearful", "broken"]],
  ["shy",      ["shy", "anxious", "timid", "nervous", "soft-spoken", "guarded", "introvert", "blushing"]],
  ["dramatic", ["dramatic", "theatrical", "poetic", "haunted", "intense", "mysterious", "tragic"]],
  ["smooth",   ["confident", "smooth", "charismatic", "cool", "composed", "calm", "playful", "flirty"]],
  ["fast",     ["energetic", "hyper", "quick", "excitable", "bubbly", "chatty"]],
  ["slow",     ["thoughtful", "deliberate", "measured", "wise", "philosophical", "stoic"]],
  ["emotional",["passionate", "warm", "tender", "loving", "romantic", "sensitive"]],
  ["dry",      ["sarcastic", "dry", "deadpan", "cynical", "blunt"]],
  ["detailed", ["scholar", "academic", "professor", "researcher", "analytical"]],
];

// Scene atmosphere → mood overrides (real-time, per message)
const ATMOSPHERE_MAP = [
  [/romantic|tender|warm|love|intimate/i, "emotional"],
  [/tense|fight|hostile|argument|confront/i, "angry"],
  [/sad|grief|melanchol|somber|blue|cry/i, "sad"],
  [/playful|fun|happy|amused|joy|laugh/i, "fast"],
  [/quiet|calm|peaceful|reflective/i, "slow"],
  [/myster|haunted|eerie|unsettl/i, "dramatic"],
  [/nervous|awkward|shy|embarrass/i, "shy"],
];

export function detectTypingMood(character, scene = null) {
  // Scene atmosphere wins if present (real-time mood)
  if (scene?.atmosphere) {
    for (const [re, mood] of ATMOSPHERE_MAP) {
      if (re.test(scene.atmosphere)) return mood;
    }
  }
  if (!character) return "default";
  const blob = [
    character.personality, character.speech_style, character.core_traits,
    character.description, character.role,
  ].filter(Boolean).join(" ").toLowerCase();
  for (const [key, words] of KEYWORDS) {
    if (words.some((w) => blob.includes(w))) return key;
  }
  return "default";
}

export function typingPattern(mood, speedMultiplier = 1.0) {
  const p = PATTERNS[mood] || PATTERNS.default;
  const safeMul = Math.max(0.3, Math.min(2.5, speedMultiplier || 1.0));
  return {
    ...p,
    duration: +(p.duration / safeMul).toFixed(3),
    rhythm: p.rhythm.map((r) => +(r / safeMul).toFixed(3)),
  };
}

// Map mood → glow color for the character avatar aura + chat ambient glow
export function moodGlow(mood) {
  switch (mood) {
    case "emotional": return "rgba(244,114,182,0.35)";
    case "angry":     return "rgba(239,68,68,0.40)";
    case "sad":       return "rgba(96,165,250,0.32)";
    case "fast":      return "rgba(251,191,36,0.32)";
    case "shy":       return "rgba(244,182,212,0.30)";
    case "dramatic":  return "rgba(168,85,247,0.35)";
    case "slow":      return "rgba(99,102,241,0.26)";
    default:          return "rgba(99,102,241,0.20)";
  }
}

// From scene atmosphere directly (for ambient page glow)
export function atmosphereToMood(atmosphere) {
  if (!atmosphere) return "default";
  for (const [re, mood] of ATMOSPHERE_MAP) {
    if (re.test(atmosphere)) return mood;
  }
  return "default";
}
