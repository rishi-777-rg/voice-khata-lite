/**
 * api.js - API client for Voice Khata Lite backend
 *
 * All requests talk to the Flask backend (proxied via Vite at /api in dev).
 */

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  // Parse speech or typed text into structured khata intent
  parse: (text) =>
    request("/parse", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  // List all customers with balances
  getCustomers: () => request("/customers"),

  // Create a customer
  createCustomer: (name, phone = "") =>
    request("/customers", {
      method: "POST",
      body: JSON.stringify({ name, phone }),
    }),

  // Customer transactions + current balance
  getCustomerTransactions: (id) => request(`/customers/${id}/transactions`),

  // Get specific balance
  getBalance: (id) => request(`/customers/${id}/balance`),

  // Save a confirmed transaction
  saveTransaction: (payload) =>
    request("/transactions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Mini dashboard metrics
  getDashboard: () => request("/dashboard"),

  // Shop config (name, UPI)
  getConfig: () => request("/config"),
};
