/**
 * speech.js - Text-to-Speech utilities using browser SpeechSynthesis
 *
 * Implements Feature 4: Voice query with voice answer (hi-IN)
 * e.g., "Ramesh ka kitna baaki hai?" -> app speaks "Ramesh ka 1250 rupaye baaki hai"
 */

let cachedVoices = [];

function loadVoices() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    cachedVoices = window.speechSynthesis.getVoices();
  }
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  loadVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

/**
 * Speaks text out loud using browser SpeechSynthesis
 * @param {string} text - text in Hindi/Hinglish to speak
 * @param {string} lang - language code (default "hi-IN")
 * @param {Function} onEnd - callback when speech finishes
 */
export function speak(text, lang = "hi-IN", onEnd = null) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    console.warn("SpeechSynthesis not supported on this device/browser.");
    if (onEnd) onEnd();
    return;
  }

  // Cancel any ongoing utterance before speaking new text
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.95; // slightly slower for better kirana store clarity
  utterance.pitch = 1.0;

  if (cachedVoices.length === 0) {
    cachedVoices = window.speechSynthesis.getVoices();
  }

  // Look for a Hindi voice if available
  const hindiVoice = cachedVoices.find(
    (v) => v.lang === "hi-IN" || v.lang.startsWith("hi")
  );
  if (hindiVoice) {
    utterance.voice = hindiVoice;
  }

  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }

  window.speechSynthesis.speak(utterance);
}

/**
 * Returns formatted spoken answer and triggers speech synthesis
 */
export function speakBalance(customerName, balance) {
  let spokenText = "";
  if (balance <= 0) {
    spokenText = `${customerName} ka koi baaki nahi hai. Saaf hisaab hai.`;
  } else {
    // Format whole numbers cleanly
    const formattedAmount = Math.round(balance) === balance ? balance : balance.toFixed(2);
    spokenText = `${customerName} ka ${formattedAmount} rupaye baaki hai.`;
  }

  speak(spokenText, "hi-IN");
  return spokenText;
}
