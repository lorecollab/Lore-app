// Loré Phase 1 feature flags. Hide future-only surfaces without deleting code.
export const PHASE_1_ONLY = true;

export const FEATURES = {
  publicSocialFeed: !PHASE_1_ONLY,        // public Social Loré (community feed)
  externalTTS: !PHASE_1_ONLY,             // OpenAI TTS char playback (Phase 2 internal)
  callMode: !PHASE_1_ONLY,                // full-screen voice call
  findLove: !PHASE_1_ONLY,                // dating/find love module
  worldPage: !PHASE_1_ONLY,               // legacy /world page (replaced by chat panels)
  voiceLibraryPage: !PHASE_1_ONLY,        // separate voice library page
  advancedCustomize: !PHASE_1_ONLY,       // background image/video, bubble colors, font size, glow
  deepMemoryAuto: !PHASE_1_ONLY,          // auto memory extraction (Phase 1: user-controlled only)
};

export const ROTATING_LOADING_LINES = [
  "Are we clocking in?",
  "We locked in?",
  "You ready or just looking?",
  "You started this, by the way",
  "Let's see how this goes",
  "Say less",
  "Okay… let's get into it",
  "This should be interesting",
  "No backing out now",
];

export const TONE_STYLES = [
  { id: "clean",    label: "Clean",            desc: "Polished. PG-13 vibes." },
  { id: "natural",  label: "Natural",          desc: "How real people talk." },
  { id: "spicy",    label: "Spicy / Unfiltered", desc: "Sharp, raw, no-filter." },
];

export const RESPONSE_LENGTHS = [
  { id: "short",  label: "Short",  desc: "Quick replies, minimal narration." },
  { id: "normal", label: "Normal", desc: "Balanced." },
  { id: "long",   label: "Long",   desc: "Detailed, cinematic." },
];
