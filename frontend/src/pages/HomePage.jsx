/**
 * HomePage.jsx - Primary Voice Khata Entry & Query Screen
 *
 * Implements:
 * 1. Big Mic button entry with animated states (idle / listening / processing) + live transcript
 *    + typed fallback
 * 2. Confirmation card with in-place edits and Save/Cancel
 * 4. Voice query + voice answer (SpeechSynthesis hi-IN + screen display)
 * 6. Voice confirmation ("haan" / "save" -> saves; "nahi" / "cancel" -> cancels)
 */
import React, { useState, useCallback, useEffect, useRef } from "react";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition.js";
import ConfirmationCard from "../components/ConfirmationCard.jsx";
import { api } from "../utils/api.js";
import { speak, speakBalance } from "../utils/speech.js";

export default function HomePage() {
  const [typedInput, setTypedInput] = useState("");
  const [parsedData, setParsedData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [queryResult, setQueryResult] = useState(null); // { customerName, balance, spokenText }

  // State for voice confirmation mode
  const [isVoiceConfirmActive, setIsVoiceConfirmActive] = useState(false);
  const [voiceConfirmTranscript, setVoiceConfirmTranscript] = useState("");

  const pendingParsedRef = useRef(null);
  pendingParsedRef.current = parsedData;

  // Handle Speech Recognition for main entry OR voice confirmation
  const handleFinalSpeech = useCallback(async (finalText) => {
    const textLower = finalText.toLowerCase().trim();

    // If confirmation card is already open, check for haan/nahi voice commands!
    if (pendingParsedRef.current) {
      setVoiceConfirmTranscript(finalText);
      const isAffirmative =
        textLower.includes("haan") ||
        textLower.includes("ha") ||
        textLower.includes("save") ||
        textLower.includes("yes") ||
        textLower.includes("theek") ||
        textLower.includes("sahi") ||
        textLower.includes("kar do") ||
        textLower.includes("likh do");

      const isNegative =
        textLower.includes("nahi") ||
        textLower.includes("nahin") ||
        textLower.includes("cancel") ||
        textLower.includes("no") ||
        textLower.includes("mat");

      if (isAffirmative) {
        // Trigger save with the current parsed details
        saveParsedTransaction(pendingParsedRef.current);
        return;
      } else if (isNegative) {
        // Trigger cancel
        cancelParsedTransaction();
        speak("Cancel kar diya gaya.", "hi-IN");
        return;
      }
    }

    // Normal workflow: parse the spoken command
    setTypedInput(finalText);
    await processText(finalText);
  }, []);

  const handleSpeechError = useCallback((msg) => {
    setErrorMessage(msg);
  }, []);

  const {
    state: micState,
    transcript: liveTranscript,
    start: startListening,
    stop: stopListening,
    isSupported: isSpeechSupported,
  } = useSpeechRecognition({
    onResult: handleFinalSpeech,
    onError: handleSpeechError,
  });

  // Process text through /api/parse
  async function processText(text) {
    if (!text || !text.trim()) return;

    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    setQueryResult(null);

    try {
      const data = await api.parse(text);

      // Handle QUERY_BALANCE immediately if customer was matched
      if (data.intent === "QUERY_BALANCE") {
        if (data.matched_customer_id) {
          const balData = await api.getBalance(data.matched_customer_id);
          const spoken = speakBalance(balData.customer_name, balData.balance);
          setQueryResult({
            customerName: balData.customer_name,
            balance: balData.balance,
            spokenText: spoken,
            raw: text,
          });
          setParsedData(null);
        } else {
          // If customer not matched, show confirmation card so shopkeeper can select/edit
          setParsedData(data);
          setIsVoiceConfirmActive(true);
        }
      } else {
        // ADD_UDHAAR, ADD_PAYMENT, or UNKNOWN
        setParsedData(data);
        setIsVoiceConfirmActive(true);
      }
    } catch (err) {
      setErrorMessage(err.message || "Parse karne mein error aayi.");
    } finally {
      setIsLoading(false);
    }
  }

  // Save transaction handler
  async function saveParsedTransaction(dataToSave) {
    setIsLoading(true);
    setErrorMessage("");
    try {
      if (dataToSave.intent === "QUERY_BALANCE") {
        if (dataToSave.matched_customer_id) {
          const balData = await api.getBalance(dataToSave.matched_customer_id);
          const spoken = speakBalance(balData.customer_name, balData.balance);
          setQueryResult({
            customerName: balData.customer_name,
            balance: balData.balance,
            spokenText: spoken,
            raw: dataToSave.raw_transcript,
          });
        }
        setParsedData(null);
        setIsVoiceConfirmActive(false);
        setIsLoading(false);
        return;
      }

      const payload = {
        type: dataToSave.type,
        amount: dataToSave.amount,
        items_text: dataToSave.items_text || "",
        raw_transcript: dataToSave.raw_transcript || "",
      };

      if (dataToSave.matched_customer_id) {
        payload.customer_id = dataToSave.matched_customer_id;
      } else {
        payload.customer_name = dataToSave.customer_name;
      }

      await api.saveTransaction(payload);

      const typeLabel = dataToSave.type === "udhaar" ? "Udhaar" : "Payment";
      const confirmVoice = `${dataToSave.customer_name} ka ${dataToSave.amount} rupaye ${typeLabel} save ho gaya hai.`;
      setSuccessMessage(`✅ ${confirmVoice}`);
      speak(confirmVoice, "hi-IN");

      // Reset card state
      setParsedData(null);
      setTypedInput("");
      setVoiceConfirmTranscript("");
      setIsVoiceConfirmActive(false);
    } catch (err) {
      setErrorMessage("Save nahi ho saka: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function cancelParsedTransaction() {
    setParsedData(null);
    setVoiceConfirmTranscript("");
    setIsVoiceConfirmActive(false);
  }

  // Mic click handler
  function handleMicClick() {
    setErrorMessage("");
    setSuccessMessage("");
    setQueryResult(null);

    if (micState === "listening") {
      stopListening();
    } else {
      startListening();
    }
  }

  return (
    <div className="py-6 space-y-6">
      {/* Page Heading */}
      <div className="text-center sm:text-left">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          Kirana Voice Khata 🎙️
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Hinglish mein bolein: Jaise{" "}
          <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
            "Ramesh ko 200 ka udhaar, 2 kilo cheeni"
          </span>
        </p>
      </div>

      {/* Alert Messages */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm p-4 rounded-2xl flex items-start gap-2 fade-in">
          <span className="text-lg">❌</span>
          <div className="flex-1 font-medium">{errorMessage}</div>
          <button
            onClick={() => setErrorMessage("")}
            className="text-rose-500 hover:text-rose-800 text-xs font-bold"
          >
            DISMISS
          </button>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm p-4 rounded-2xl flex items-center gap-2 fade-in shadow-sm font-semibold">
          <span className="text-xl">🎉</span>
          <div className="flex-1">{successMessage}</div>
        </div>
      )}

      {/* Query Result Card (Feature 4) */}
      {queryResult && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-3xl p-6 shadow-md fade-in space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
              Hisaab Jawab (Balance Query)
            </span>
            <button
              onClick={() => speak(queryResult.spokenText, "hi-IN")}
              className="text-xs bg-blue-600 text-white font-bold px-3 py-1.5 rounded-xl hover:bg-blue-700 flex items-center gap-1 shadow"
            >
              🔊 Dobara Sunein
            </button>
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-800">{queryResult.customerName}</h3>
            <p className="text-3xl font-black text-blue-900 mt-1">
              ₹ {Math.abs(queryResult.balance).toLocaleString("en-IN")}{" "}
              <span className="text-sm font-semibold text-gray-500">
                {queryResult.balance > 0 ? "baaki hai" : "saaf hisaab"}
              </span>
            </p>
          </div>

          <p className="text-sm text-blue-950 bg-white/70 p-3 rounded-2xl border border-blue-100 italic">
            🗣️ "{queryResult.spokenText}"
          </p>
        </div>
      )}

      {/* If confirmation card is present, show it */}
      {parsedData ? (
        <ConfirmationCard
          parsed={parsedData}
          onSave={saveParsedTransaction}
          onCancel={cancelParsedTransaction}
          isListeningVoiceConfirm={micState === "listening"}
          voiceConfirmTranscript={liveTranscript || voiceConfirmTranscript}
          onToggleVoiceConfirm={handleMicClick}
        />
      ) : (
        /* Mic Entry & Typed fallback */
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 flex flex-col items-center text-center space-y-6">
          {/* Big Mic Button with state animation */}
          <div className="relative flex items-center justify-center">
            {micState === "listening" && (
              <>
                <div className="absolute w-36 h-36 rounded-full bg-rose-400/30 animate-ping pointer-events-none" />
                <div className="absolute w-44 h-44 rounded-full bg-rose-300/20 mic-pulse pointer-events-none" />
              </>
            )}

            <button
              type="button"
              onClick={handleMicClick}
              disabled={isLoading}
              className={`relative z-10 w-28 h-28 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-xl select-none ${
                micState === "listening"
                  ? "bg-rose-600 text-white shadow-rose-500/40 scale-105"
                  : micState === "processing" || isLoading
                  ? "bg-amber-500 text-white shadow-amber-500/40 animate-pulse"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 hover:scale-105 active:scale-95"
              }`}
              title="Bolein"
            >
              <span className="text-4xl leading-none">
                {micState === "listening" ? "⏹️" : micState === "processing" || isLoading ? "⏳" : "🎙️"}
              </span>
              <span className="text-[11px] font-black uppercase tracking-wider mt-1.5">
                {micState === "listening"
                  ? "Listening"
                  : micState === "processing" || isLoading
                  ? "Processing"
                  : "Tap to Speak"}
              </span>
            </button>
          </div>

          {/* Live Transcript / Status feedback */}
          <div className="min-h-[50px] w-full max-w-md flex flex-col items-center justify-center">
            {micState === "listening" ? (
              <div className="w-full bg-rose-50 border border-rose-200 rounded-2xl p-3 text-rose-900 fade-in">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                  <span className="text-xs font-bold uppercase tracking-wider">Awaaz Sun Raha Hai...</span>
                </div>
                <p className="text-sm font-medium italic">
                  {liveTranscript ? `"${liveTranscript}"` : "Kuch bolein..."}
                </p>
              </div>
            ) : micState === "processing" || isLoading ? (
              <div className="text-amber-800 text-sm font-semibold flex items-center gap-2">
                <span className="animate-spin text-lg">⚙️</span> Samajh raha hai...
              </div>
            ) : (
              <p className="text-xs text-gray-400 font-medium">
                Mic daba kar bolein: Udhaar, Payment ya Hisaab
              </p>
            )}

            {!isSpeechSupported && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-2">
                ⚠️ Aapka browser Web Speech API support nahi karta. Google Chrome use karein ya niche type karein.
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="w-full max-w-md flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ya Type Karein</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Typed Fallback Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              processText(typedInput);
            }}
            className="w-full max-w-md flex gap-2"
          >
            <input
              type="text"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              placeholder="e.g. Ramesh ne 500 diye ya Mohan ka kitna baaki hai"
              className="flex-1 text-sm text-gray-800 px-4 py-3 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !typedInput.trim()}
              className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold px-5 py-3 rounded-2xl text-sm transition-all shadow-md active:scale-95"
            >
              Bhejein
            </button>
          </form>

          {/* Quick Example Chips */}
          <div className="w-full max-w-md text-left pt-2">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Try karein (Click to test):
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Ramesh ko 200 ka udhaar 2 kilo cheeni",
                "Sunita ne paanch sau diye",
                "Mohan ka kitna baaki hai",
                "रमेश को डेढ़ सौ का उधार",
              ].map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => {
                    setTypedInput(ex);
                    processText(ex);
                  }}
                  className="text-xs bg-gray-100 hover:bg-emerald-50 hover:text-emerald-800 text-gray-700 px-3 py-1.5 rounded-xl border border-gray-200 transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
