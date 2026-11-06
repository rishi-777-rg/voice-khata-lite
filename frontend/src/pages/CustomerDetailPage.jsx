/**
 * CustomerDetailPage.jsx - Customer Details & Full Transaction History
 *
 * Implements Feature 3 & Feature 5:
 * - Full transaction ledger for a selected customer
 * - Clear balance display
 * - One-tap WhatsApp reminder
 */
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../utils/api.js";

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [config, setConfig] = useState({ shop_name: "Kirana Store", upi_id: "shopkeeper@upi" });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTransactions();
  }, [id]);

  async function loadTransactions() {
    setIsLoading(true);
    setError("");
    try {
      const [res, cfg] = await Promise.all([
        api.getCustomerTransactions(id),
        api.getConfig(),
      ]);
      setData(res);
      if (cfg) setConfig(cfg);
    } catch (err) {
      setError(err.message || "Transactions load nahi ho sake.");
    } finally {
      setIsLoading(false);
    }
  }

  function getWhatsAppUrl() {
    if (!data || !data.customer) return "#";
    const { customer, balance } = data;
    const cleanPhone = (customer.phone || "").replace(/\D/g, "");
    const phoneParam = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const message = `Namaste ${customer.name} ji! Aapka ${config.shop_name} par ₹${balance} ka udhaar baaki hai. Kripya jald se jald jama karein.\n\nAap hamare UPI ID par payment kar sakte hain:\nUPI ID: ${config.upi_id}\n\nShukriya! 🙏`;

    const encoded = encodeURIComponent(message);
    return phoneParam
      ? `https://wa.me/${phoneParam}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
  }

  function formatDate(isoString) {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return isoString;
    }
  }

  if (isLoading) {
    return (
      <div className="py-16 text-center text-gray-400">
        <div className="text-3xl animate-spin mb-3">⏳</div>
        <p className="font-medium text-sm">Hisaab load ho raha hai...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-8 space-y-4">
        <button
          onClick={() => navigate("/customers")}
          className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
        >
          ← Waapis Graahak List
        </button>
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl font-semibold text-sm">
          {error || "Customer data nahi mila"}
        </div>
      </div>
    );
  }

  const { customer, transactions, balance } = data;
  const hasDues = balance > 0;

  return (
    <div className="py-6 space-y-5">
      {/* Back Button */}
      <button
        onClick={() => navigate("/customers")}
        className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl hover:bg-emerald-100 flex items-center gap-1 transition-colors"
      >
        ← Graahak List
      </button>

      {/* Customer Header Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl select-none ${
                hasDues ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">{customer.name}</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {customer.phone ? `📞 ${customer.phone}` : "No phone number registered"}
              </p>
              <p className="text-[11px] text-gray-400">
                Khata Shuru: {formatDate(customer.created_at)}
              </p>
            </div>
          </div>

          {/* Outstanding Balance */}
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Kul Baaki (Balance)
            </p>
            <p
              className={`text-2xl font-black tracking-tight ${
                hasDues ? "text-rose-600" : "text-emerald-700"
              }`}
            >
              ₹ {Math.abs(balance).toLocaleString("en-IN")}
            </p>
            <span
              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                hasDues
                  ? "bg-rose-100 text-rose-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {hasDues ? "Dena Baaki Hai" : "Hisaab Barabar"}
            </span>
          </div>
        </div>

        {/* Feature 5: WhatsApp reminder button */}
        {hasDues && (
          <div className="pt-2">
            <a
              href={getWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm py-3 px-4 rounded-2xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
            >
              <span className="text-lg">💬</span>
              <span>WhatsApp Par Yaad Dilao (₹{balance})</span>
            </a>
            <p className="text-[11px] text-gray-400 text-center mt-1.5">
              WhatsApp message mein dukaan ka UPI ID ({config.upi_id}) shaamil hoga
            </p>
          </div>
        )}
      </div>

      {/* Transaction History Ledger */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-black text-gray-700 uppercase tracking-wider">
            Transaction Itihaas ({transactions.length})
          </h2>
          <span className="text-xs text-gray-400 font-medium">Naye pehle</span>
        </div>

        {transactions.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-gray-200 text-gray-400">
            <p className="text-2xl mb-1">📖</p>
            <p className="text-sm font-semibold">Abhi tak koi transaction darj nahi hai.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {transactions.map((txn) => {
              const isUdhaar = txn.type === "udhaar";
              return (
                <div
                  key={txn.id}
                  className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold mt-0.5 ${
                        isUdhaar
                          ? "bg-rose-100 text-rose-700"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {isUdhaar ? "📕" : "📗"}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            isUdhaar
                              ? "bg-rose-50 text-rose-800 border border-rose-200"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {isUdhaar ? "Udhaar (Credit)" : "Payment (Jama)"}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {formatDate(txn.created_at)}
                        </span>
                      </div>

                      {/* Items Text */}
                      {txn.items_text && (
                        <p className="text-sm font-semibold text-gray-800 mt-1">
                          🛒 {txn.items_text}
                        </p>
                      )}

                      {/* Raw Transcript (Useful for Viva / evaluation proof) */}
                      {txn.raw_transcript && (
                        <p className="text-[11px] text-gray-400 italic mt-0.5">
                          Awaaz: "{txn.raw_transcript}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Transaction Amount */}
                  <div className="text-right flex-shrink-0">
                    <span
                      className={`text-base font-black ${
                        isUdhaar ? "text-rose-600" : "text-emerald-700"
                      }`}
                    >
                      {isUdhaar ? "+" : "-"} ₹ {txn.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
