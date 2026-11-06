/**
 * useSpeechRecognition.js - Web Speech API Hook (hi-IN)
 *
 * Implements Feature 1:
 * - States: idle, listening, processing
 * - Live transcript stream
 * - Friendly error handling for microphone permissions & network
 */
import { useState, useRef, useCallback, useEffect } from "react";

export function useSpeechRecognition({ onResult, onError } = {}) {
  const [state, setState] = useState("idle"); // "idle" | "listening" | "processing"
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);

  const isSupported =
    typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // Ignore stop errors if already stopped
      }
    }
    setState("idle");
  }, []);

  const start = useCallback(() => {
    if (!isSupported) {
      if (onError) {
        onError("Aapka browser Speech to Text support nahi karta. Kripya Google Chrome use karein.");
      }
      return;
    }

    // Stop any existing instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRec();
    recognitionRef.current = recognition;

    recognition.lang = "hi-IN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    setTranscript("");

    recognition.onstart = () => {
      setState("listening");
    };

    recognition.onresult = (event) => {
      let interim = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i];
        if (item.isFinal) {
          finalTranscript += item[0].transcript;
        } else {
          interim += item[0].transcript;
        }
      }

      const currentText = finalTranscript || interim;
      setTranscript(currentText);

      if (finalTranscript.trim()) {
        setState("processing");
        if (onResult) {
          onResult(finalTranscript.trim());
        }
      }
    };

    recognition.onerror = (event) => {
      setState("idle");
      let msg = "Awaaz pehchanne mein samasya aayi.";
      if (event.error === "not-allowed") {
        msg = "Mic permission allow nahi hai. Browser settings mein jaakar mic enable karein.";
      } else if (event.error === "no-speech") {
        msg = "Koi awaaz sunayi nahi di. Dobara mic daba kar bolein.";
      } else if (event.error === "network") {
        msg = "Internet connectivity samasya. Kripya connection check karein.";
      } else if (event.error === "audio-capture") {
        msg = "Mic capture nahi ho raha. Check karein mic connected hai ya nahi.";
      }
      if (onError) {
        onError(msg);
      }
    };

    recognition.onend = () => {
      setState((prev) => (prev === "listening" ? "idle" : prev));
    };

    try {
      recognition.start();
    } catch (err) {
      setState("idle");
      if (onError) {
        onError("Mic shuru nahi ho saka. Kripya reload karke try karein.");
      }
    }
  }, [isSupported, onError, onResult]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  return {
    state,
    setState,
    transcript,
    setTranscript,
    start,
    stop,
    isSupported,
  };
}
