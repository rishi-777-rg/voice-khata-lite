/**
 * DashboardPage.jsx - Mini Dashboard
 *
 * Implements Feature 6:
 * - Total udhaar outstanding
 * - Today's collection
 * - Top 5 customers by pending amount
 * - Simple Recharts Bar Chart
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { api } from "../utils/api.js";

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [config, setConfig] = useState({ shop_name: "Kirana Store", upi_id: "shopkeeper@upi" });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setIsLoading(true);
    setError("");
    try {
      const [stats, cfg] = await Promise.all([api.getDashboard(), api.getConfig()]);
      setDashboardData(stats);
      if (cfg) setConfig(cfg);
    } catch (err) {
      setError(err.message || "Dashboard load nahi ho saka.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="py-16 text-center text-gray-400">
        <div className="text-3xl animate-spin mb-3">⏳</div>
        <p className="font-medium text-sm">Dashboard metrics taiyar ho rahe hain...</p>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="py-8 space-y-4">
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl font-semibold text-sm">
          {error || "Dashboard data unavailable"}
        </div>
      </div>
    );
  }

  const { total_outstanding, todays_collection, top_customers } = dashboardData;

  // Chart data formatting: shorten names for mobile x-axis
  const chartData = (top_customers || []).map((c) => ({
    name: c.name.length > 8 ? c.name.substring(0, 8) + ".." : c.name,
    fullName: c.name,
    amount: c.balance,
    id: c.id,
  }));

  const barColors = ["#e11d48", "#f43f5e", "#fb7185", "#fda4af", "#fecdd3"];

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          Dukaan Dashboard 📊
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {config.shop_name} • UPI: {config.upi_id}
        </p>
      </div>

      {/* Primary 2 Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Total Udhaar Outstanding */}
        <div className="bg-gradient-to-br from-rose-50 to-red-100/60 border border-rose-200/80 rounded-3xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-1.5 text-rose-700 text-xs font-black uppercase tracking-wider mb-1">
            <span>📕</span>
            <span>Total Udhaar</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-950 tracking-tight">
            ₹ {total_outstanding.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-rose-700 font-semibold mt-1">
            Bazaar mein baaki
          </p>
        </div>

        {/* Today's Collection */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-100/60 border border-emerald-200/80 rounded-3xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-black uppercase tracking-wider mb-1">
            <span>📗</span>
            <span>Aaj Ki Collection</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight">
            ₹ {todays_collection.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1">
            Aaj jama hui rashi
          </p>
        </div>
      </div>

      {/* Top 5 Customers Bar Chart (Recharts) */}
      <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Top 5 Baaki Daar (Highest Dues)
            </h2>
            <p className="text-xs text-gray-400">In graahakon ka sabse zyada udhaar hai</p>
          </div>
          <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-xl">
            Pending Udhaar
          </span>
        </div>

        {chartData.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            Kisi bhi graahak ka udhaar baaki nahi hai! 🎉
          </div>
        ) : (
          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val) => [`₹ ${val.toLocaleString("en-IN")}`, "Baaki Udhaar"]}
                  labelFormatter={(_, payload) =>
                    payload && payload[0] ? payload[0].payload.fullName : ""
                  }
                  contentStyle={{
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={barColors[index % barColors.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top 5 Customers List */}
      <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
          Top 5 Graahak Detail
        </h2>

        <div className="space-y-2">
          {top_customers.map((c, index) => (
            <div
              key={c.id}
              onClick={() => navigate(`/customers/${c.id}`)}
              className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/70 hover:bg-gray-100/80 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-800 text-xs font-black flex items-center justify-center">
                  {index + 1}
                </span>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{c.name}</h4>
                  <p className="text-[11px] text-gray-400">Tap to see ledger</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-sm font-black text-rose-600">
                  ₹ {c.balance.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
