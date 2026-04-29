// Split message text into a list of segments: { type: 'dialogue' | 'action', text }
// Asterisk-wrapped tokens are actions: *like this*. Everything else is dialogue.
const ACTION_RE = /(\*[^*]+\*)/g;

export function splitDialogueAction(text) {
  if (!text) return [];
  return text
    .split(ACTION_RE)
    .filter(Boolean)
    .map((part) => part.startsWith("*") && part.endsWith("*")
      ? { type: "action", text: part.slice(1, -1).trim() }
      : { type: "dialogue", text: part });
}

export function dialogueOnly(text) {
  if (!text) return "";
  return text.replace(ACTION_RE, " ").replace(/\s+/g, " ").trim();
}
