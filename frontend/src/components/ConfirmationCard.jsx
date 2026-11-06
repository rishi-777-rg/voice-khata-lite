/**
 * ConfirmationCard.jsx - Confirmation Card with Voice Confirmation
 *
 * Implements Feature 2 & Feature 6:
 * - Shows parsed customer, transaction type (udhaar / payment), amount, items
 * - Allows in-place editing before saving
 * - Supports buttons: Save, Edit, Cancel
 * - Voice confirmation: Saying "haan" or "save" triggers Save; "nahi" or "cancel" triggers Cancel
 */
import React, { useState } from "react";

export default function ConfirmationCard({
  parsed,
  onSave,
  onCancel,
  isListeningVoiceConfirm = false,
  voiceConfirmTranscript = "",
  onToggleVoiceConfirm = null,
}) {
  const [customerName, setCustomerName] = useState(parsed.customer_name || "");
  const [amount, setAmount] = useState(
    parsed.amount !== null && parsed.amount !== undefined ? parsed.amount : ""
  );
  const [itemsText, setItemsText] = useState(parsed.items_text || "");
  const [txnType, setTxnType] = useState(
    parsed.intent === "ADD_PAYMENT" ? "payment" : "udhaar"
  );
  const [isEditing, setIsEditing] = useState(false);

  const isQuery = parsed.intent === "QUERY_BALANCE";

  const intentBadges = {
    ADD_UDHAAR: { label: "Udhaar (Credit)", bg: "bg-rose-100 text-rose-800 border-rose-300" },
    ADD_PAYMENT: { label: "Payment (Jama)", bg: "bg-emerald-100 text-emerald-800 border-emerald-300" },
    QUERY_BALANCE: { label: "Hisaab Pucha", bg: "bg-blue-100 text-blue-800 border-blue-300" },
    UNKNOWN: { label: "Samajh Nahi Aaya", bg: "bg-amber-100 text-amber-800 border-amber-300" },
  };

  const badge = intentBadges[parsed.intent] || intentBadges.UNKNOWN;
  const isConfidenceLow = (parsed.confidence || 0) < 0.6;
  const isAmountMissing = !isQuery && (!amount || Number(amount) <= 0);

  function handleSaveClick() {
    if (!customerName.trim()) {
      alert("Kripya customer ka naam daalein.");
      return;
    }
    if (!isQuery && isAmountMissing) {
      alert("Kripya sahi amount daalein.");
      return;
    }

    onSave({
      customer_name: customerName.trim(),
      matched_customer_id: parsed.matched_customer_id,
      is_new_customer: parsed.is_new_customer,
      type: txnType,
      amount: isQuery ? 0 : Number(amount),
      items_text: itemsText.trim(),
      raw_transcript: parsed.raw,
      intent: parsed.intent,
    });
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden fade-in transition-all">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-gray-50 to-emerald-50 px-5 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">📋</span>
          <div>
            <h2 className="text-base font-bold text-gray-800">Confirmation Card</h2>
            <p className="text-xs text-gray-500">Save karne se pehle check karein</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${badge.bg}`}>
            {badge.label}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              parsed.confidence >= 0.8
                ? "bg-green-100 text-green-700"
                : parsed.confidence >= 0.5
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-100 text-red-700"
            }`}
            title="Parser Confidence"
          >
            {Math.round((parsed.confidence || 0) * 100)}%
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Raw voice heard */}
        <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Aapne Kaha:</p>
          <p className="text-sm font-medium text-gray-800 italic mt-0.5">"{parsed.raw}"</p>
        </div>

        {/* Low confidence or missing amount warning */}
        {(isConfidenceLow || isAmountMissing) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2.5">
            <span className="text-amber-600 text-lg">⚠️</span>
            <div className="text-xs text-amber-800">
              <p className="font-bold">Kripya details verify karein</p>
              <p className="mt-0.5">
                {isAmountMissing
                  ? "Rupaye/Amount nahi mila ya adhoora hai. Kripya niche amount bharein."
                  : "Confidence kam hai, check kar lijiye customer naam aur amount sahi hain."}
              </p>
            </div>
          </div>
        )}

        {/* Form fields */}
        <div className="space-y-3">
          {/* Customer Name */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-gray-600">Graahak (Customer)</label>
              {parsed.is_new_customer && (
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  ✨ Naya Graahak
                </span>
              )}
            </div>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Graahak ka naam"
              className="w-full text-base font-semibold text-gray-800 px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {!isQuery && (
            <>
              {/* Type Switcher (Udhaar vs Payment) */}
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Type (Kism)</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setTxnType("udhaar")}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      txnType === "udhaar"
                        ? "bg-rose-600 text-white shadow"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    📕 Udhaar (Diya)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxnType("payment")}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      txnType === "payment"
                        ? "bg-emerald-600 text-white shadow"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    📗 Payment (Aaya)
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Rupaye (Amount in ₹)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-gray-500 font-bold text-lg">₹</span>
                  <input
                    type="number"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full text-xl font-bold text-gray-900 pl-8 pr-3.5 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Items Text */}
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">
                  Saman ke items <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={itemsText}
                  onChange={(e) => setItemsText(e.target.value)}
                  placeholder="Jaise: 2 kilo cheeni, 1 packet chai"
                  className="w-full text-sm text-gray-800 px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </>
          )}
        </div>

        {/* Voice Confirmation Banner (Feature 2 & 6) */}
        <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-2xl p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`text-lg ${isListeningVoiceConfirm ? "animate-pulse" : ""}`}>
              {isListeningVoiceConfirm ? "🎙️" : "🗣️"}
            </span>
            <div className="text-xs text-emerald-950">
              <p className="font-semibold">Awaaz se confirm karein:</p>
              <p className="text-[11px] text-emerald-800">
                Bolein <span className="font-bold">"Haan"</span> ya <span className="font-bold">"Save"</span>, cancel ke liye <span className="font-bold">"Nahi"</span>
              </p>
              {voiceConfirmTranscript && (
                <p className="text-[11px] font-bold text-emerald-900 mt-0.5">
                  Suna: "{voiceConfirmTranscript}"
                </p>
              )}
            </div>
          </div>
          {onToggleVoiceConfirm && (
            <button
              type="button"
              onClick={onToggleVoiceConfirm}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                isListeningVoiceConfirm
                  ? "bg-rose-500 text-white animate-pulse"
                  : "bg-emerald-700 text-white hover:bg-emerald-800"
              }`}
            >
              {isListeningVoiceConfirm ? "Stop Mic" : "Mic On"}
            </button>
          )}
        </div>

        {/* Action Buttons: Save, Edit, Cancel */}
        <div className="pt-2 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3.5 px-4 rounded-2xl border-2 border-gray-300 text-gray-700 font-bold text-sm hover:bg-gray-100 transition-colors flex items-center justify-center gap-1"
          >
            ❌ Cancel (Nahi)
          </button>
          <button
            type="button"
            onClick={handleSaveClick}
            className="flex-[1.5] py-3.5 px-4 rounded-2xl bg-emerald-600 text-white font-bold text-base shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
          >
            ✅ Save (Haan)
          </button>
        </div>
      </div>
    </div>
  );
}
