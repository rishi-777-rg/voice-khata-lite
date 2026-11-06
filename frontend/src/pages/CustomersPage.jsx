/**
 * CustomersPage.jsx - Customers List with Pending Balance & WhatsApp Reminder
 *
 * Implements Feature 3 & Feature 5:
 * - List of customers with pending balance
 * - Tap customer to open transaction history
 * - One-tap "Yaad Dilao" WhatsApp reminder with polite Hinglish message & plain text UPI ID
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api.js";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [config, setConfig] = useState({ shop_name: "Kirana Store", upi_id: "shopkeeper@upi" });
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    setError("");
    try {
      const [custList, cfg] = await Promise.all([api.getCustomers(), api.getConfig()]);
      setCustomers(custList);
      if (cfg) setConfig(cfg);
    } catch (err) {
      setError(err.message || "Graahak list load nahi ho saki.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddCustomer(e) {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      await api.createCustomer(newName.trim(), newPhone.trim());
      setNewName("");
      setNewPhone("");
      setShowAddModal(false);
      loadData();
    } catch (err) {
      alert("Graahak add karne mein error: " + err.message);
    }
  }

  // Pre-filled polite Hinglish message for WhatsApp
  function getWhatsAppUrl(customer) {
    const cleanPhone = (customer.phone || "").replace(/\D/g, "");
    const phoneParam = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const message = `Namaste ${customer.name} ji! Aapka ${config.shop_name} par ₹${customer.balance} ka udhaar baaki hai. Kripya jald se jald jama karein.\n\nAap hamare UPI ID par payment kar sakte hain:\nUPI ID: ${config.upi_id}\n\nShukriya! 🙏`;

    const encoded = encodeURIComponent(message);
    return phoneParam
      ? `https://wa.me/${phoneParam}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
  }

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm))
  );

  return (
    <div className="py-6 space-y-5">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Graahak (Customers) 👥
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Total {customers.length} graahak darj hain
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md transition-all active:scale-95"
        >
          + Naya Graahak
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <span className="absolute left-3.5 top-3 text-gray-400 text-sm">🔍</span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Graahak ka naam ya phone khojein..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
        />
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm p-4 rounded-2xl font-medium">
          {error}
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Naya Graahak Jodein</h3>
            <form onSubmit={handleAddCustomer} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Naam *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Shyam Sundar"
                  className="w-full text-sm border rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Phone Number (optional)</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full text-sm border rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700"
                >
                  Jodein
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Cards List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-2xl animate-spin mb-2">⏳</div>
          <p className="text-sm">Graahak list load ho rahi hai...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-gray-200 text-gray-400 space-y-2">
          <span className="text-4xl block">🔍</span>
          <p className="font-semibold text-gray-700">Koi graahak nahi mila</p>
          <p className="text-xs text-gray-500">Kripya naam check karein ya naya graahak jodein</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map((cust) => {
            const hasDues = (cust.balance || 0) > 0;
            return (
              <div
                key={cust.id}
                className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-3"
              >
                {/* Clickable Customer Info (Feature 3: Tap to see full history) */}
                <div
                  onClick={() => navigate(`/customers/${cust.id}`)}
                  className="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer"
                >
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg select-none flex-shrink-0 ${
                      hasDues
                        ? "bg-rose-100 text-rose-700"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {cust.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 text-base truncate flex items-center gap-1.5">
                      {cust.name}
                      <span className="text-gray-400 text-xs font-normal">›</span>
                    </h3>
                    <p className="text-xs text-gray-400 truncate">
                      {cust.phone ? `📞 ${cust.phone}` : "No phone number"}
                    </p>
                    <div className="mt-1">
                      <span
                        className={`text-xs font-black ${
                          hasDues ? "text-rose-600" : "text-emerald-700"
                        }`}
                      >
                        ₹ {Math.abs(cust.balance || 0).toLocaleString("en-IN")}{" "}
                        <span className="text-[10px] font-bold text-gray-500">
                          {hasDues ? "baaki" : "saaf hisaab"}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Feature 5: Yaad Dilao WhatsApp button */}
                {hasDues && (
                  <a
                    href={getWhatsAppUrl(cust)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
                    title="WhatsApp par reminder bhejein"
                  >
                    <span className="text-base">💬</span>
                    <span>Yaad Dilao</span>
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
