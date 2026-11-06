import React from "react";
import { NavLink } from "react-router-dom";

export default function Navbar() {
  const navItems = [
    { to: "/", label: "🎙️ Naya Entry" },
    { to: "/customers", label: "👥 Graahak" },
    { to: "/dashboard", label: "📊 Dashboard" },
  ];

  return (
    <header className="bg-emerald-700 text-white shadow-md sticky top-0 z-50">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2 font-bold text-lg tracking-wide hover:opacity-90">
          <span className="text-2xl">📓</span>
          <div>
            <span className="block leading-none">Voice Khata</span>
            <span className="text-[10px] text-emerald-200 uppercase tracking-widest font-semibold">Kirana Lite</span>
          </div>
        </NavLink>

        <nav className="flex gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center gap-1 ${
                  isActive
                    ? "bg-white text-emerald-800 shadow"
                    : "text-emerald-100 hover:bg-emerald-600/70"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
