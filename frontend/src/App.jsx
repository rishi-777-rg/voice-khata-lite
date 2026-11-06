/**
 * App.jsx - Root component with routing
 *
 * Routes:
 *   /           -> HomePage (mic entry + dashboard)
 *   /customers  -> CustomersPage (list + balances)
 *   /customers/:id -> CustomerDetailPage (history)
 */
import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import HomePage from "./pages/HomePage.jsx";
import CustomersPage from "./pages/CustomersPage.jsx";
import CustomerDetailPage from "./pages/CustomerDetailPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navigation bar */}
      <Navbar />

      {/* Page content */}
      <main className="max-w-2xl mx-auto px-4 pb-24">
        <Routes>
          <Route path="/"             element={<HomePage />} />
          <Route path="/customers"    element={<CustomersPage />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
          <Route path="/dashboard"    element={<DashboardPage />} />
        </Routes>
      </main>
    </div>
  );
}
