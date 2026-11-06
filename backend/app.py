"""
app.py - Flask REST API for Voice Khata Lite

Endpoints:
  POST /api/parse                         - Parse Hinglish text, return structured data
  GET  /api/customers                     - List all customers with balances
  POST /api/customers                     - Create a new customer
  GET  /api/customers/<id>/transactions   - Get transaction history for a customer
  POST /api/transactions                  - Save a new transaction
  GET  /api/customers/<id>/balance        - Get current balance for a customer
  GET  /api/dashboard                     - Dashboard stats (totals, top customers)
  GET  /api/config                        - Public config (shop name, UPI ID)

All responses are JSON. Errors return {"error": "message"} with an appropriate status code.
"""

import os
from datetime import datetime, date
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

import models
import parser as khata_parser  # renamed to avoid conflict with Python built-in

# Load environment variables from .env file
load_dotenv()

# Path to built frontend static files (for full-stack single-service deployment)
FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))

app = Flask(__name__, static_folder=None)

# Allow cross-origin requests (for local dev server and decoupled deployment)
CORS(app)

# Initialize the database (creates tables if they don't exist)
models.init_db()

# -------------------------------------------------------------------------
# Helper
# -------------------------------------------------------------------------

def row_to_dict(row):
    """Convert a sqlite3.Row object to a plain Python dict."""
    return dict(row)


# -------------------------------------------------------------------------
# Config endpoint - lets the frontend know shop name and UPI ID
# -------------------------------------------------------------------------

@app.route("/api/config")
def get_config():
    return jsonify({
        "shop_name": os.getenv("SHOP_NAME", "Kirana Store"),
        "upi_id": os.getenv("SHOP_UPI_ID", "shopkeeper@upi"),
    })


# -------------------------------------------------------------------------
# Parse endpoint - the heart of the app
# -------------------------------------------------------------------------

@app.route("/api/parse", methods=["POST"])
def parse_text():
    """
    Parses a Hinglish/Hindi text string.
    
    Request body: { "text": "Ramesh ko 200 ka udhaar" }
    Response: { intent, customer_name, amount, items_text, confidence, ... }
    
    The frontend shows a confirmation card based on this response.
    Nothing is saved here - saving happens via POST /api/transactions.
    """
    data = request.get_json(silent=True)
    if not data or "text" not in data:
        return jsonify({"error": "Missing 'text' field in request body"}), 400

    text = data["text"].strip()
    if not text:
        return jsonify({"error": "Text cannot be empty"}), 400

    # Get existing customers for fuzzy name matching
    existing_customers = models.get_all_customer_names()

    result = khata_parser.parse(text, existing_customers)
    return jsonify(result)


# -------------------------------------------------------------------------
# Customers
# -------------------------------------------------------------------------

@app.route("/api/customers", methods=["GET"])
def list_customers():
    """
    Returns all customers with their current outstanding balance.
    Sorted by balance descending (highest dues first).
    """
    conn = models.get_db()
    rows = conn.execute("""
        SELECT
            c.id,
            c.name,
            c.phone,
            c.created_at,
            COALESCE(SUM(CASE WHEN t.type='udhaar'  THEN t.amount ELSE 0 END), 0)
              - COALESCE(SUM(CASE WHEN t.type='payment' THEN t.amount ELSE 0 END), 0)
              AS balance
        FROM customers c
        LEFT JOIN transactions t ON t.customer_id = c.id
        GROUP BY c.id
        ORDER BY balance DESC
    """).fetchall()
    conn.close()
    return jsonify([row_to_dict(r) for r in rows])


@app.route("/api/customers", methods=["POST"])
def create_customer():
    """
    Creates a new customer.
    Request body: { "name": "Ramesh", "phone": "9999999999" (optional) }
    """
    data = request.get_json(silent=True)
    if not data or "name" not in data:
        return jsonify({"error": "Missing 'name' field"}), 400

    name = data["name"].strip()
    phone = data.get("phone", "").strip()

    if not name:
        return jsonify({"error": "Name cannot be empty"}), 400

    conn = models.get_db()
    cursor = conn.execute(
        "INSERT INTO customers (name, phone, created_at) VALUES (?, ?, ?)",
        (name, phone, datetime.utcnow().isoformat())
    )
    conn.commit()
    new_id = cursor.lastrowid

    # Return the newly created customer
    row = conn.execute("SELECT * FROM customers WHERE id = ?", (new_id,)).fetchone()
    conn.close()
    return jsonify(row_to_dict(row)), 201


@app.route("/api/customers/<int:customer_id>/transactions", methods=["GET"])
def get_customer_transactions(customer_id):
    """
    Returns the full transaction history for one customer, newest first.
    Also includes the current balance.
    """
    conn = models.get_db()

    # Check customer exists
    customer = conn.execute(
        "SELECT * FROM customers WHERE id = ?", (customer_id,)
    ).fetchone()
    if not customer:
        conn.close()
        return jsonify({"error": "Customer not found"}), 404

    transactions = conn.execute("""
        SELECT * FROM transactions
        WHERE customer_id = ?
        ORDER BY created_at DESC
    """, (customer_id,)).fetchall()
    conn.close()

    balance = models.get_customer_balance(customer_id)

    return jsonify({
        "customer": row_to_dict(customer),
        "transactions": [row_to_dict(t) for t in transactions],
        "balance": balance,
    })


@app.route("/api/customers/<int:customer_id>/balance", methods=["GET"])
def get_balance(customer_id):
    """
    Returns just the balance for a customer.
    Used by voice query feature.
    """
    conn = models.get_db()
    customer = conn.execute(
        "SELECT * FROM customers WHERE id = ?", (customer_id,)
    ).fetchone()
    if not customer:
        conn.close()
        return jsonify({"error": "Customer not found"}), 404
    conn.close()

    balance = models.get_customer_balance(customer_id)
    return jsonify({
        "customer_id": customer_id,
        "customer_name": customer["name"],
        "balance": balance,
    })


# -------------------------------------------------------------------------
# Transactions
# -------------------------------------------------------------------------

@app.route("/api/transactions", methods=["POST"])
def create_transaction():
    """
    Saves a confirmed transaction.
    
    Request body:
    {
      "customer_id": 1,          (required, or pass customer_name for auto-create)
      "customer_name": "Ramesh", (used if customer_id not given)
      "type": "udhaar",          (required: "udhaar" or "payment")
      "amount": 200,             (required)
      "items_text": "2 kilo cheeni",  (optional)
      "raw_transcript": "..."    (optional, original speech text)
    }
    
    IMPORTANT: The frontend must show a confirmation card before calling this.
    Never call this directly without user confirmation.
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400

    # Validate required fields
    txn_type = data.get("type")
    amount = data.get("amount")

    if txn_type not in ("udhaar", "payment"):
        return jsonify({"error": "type must be 'udhaar' or 'payment'"}), 400

    if amount is None or float(amount) <= 0:
        return jsonify({"error": "amount must be a positive number"}), 400

    # Resolve customer
    customer_id = data.get("customer_id")
    if not customer_id:
        # Auto-create customer if only name is given
        customer_name = data.get("customer_name", "").strip()
        if not customer_name:
            return jsonify({"error": "Provide customer_id or customer_name"}), 400

        conn = models.get_db()
        cursor = conn.execute(
            "INSERT INTO customers (name, phone, created_at) VALUES (?, '', ?)",
            (customer_name, datetime.utcnow().isoformat())
        )
        conn.commit()
        customer_id = cursor.lastrowid
        conn.close()

    # Verify customer exists
    conn = models.get_db()
    customer = conn.execute(
        "SELECT id FROM customers WHERE id = ?", (customer_id,)
    ).fetchone()
    if not customer:
        conn.close()
        return jsonify({"error": f"Customer {customer_id} not found"}), 404

    # Insert the transaction
    cursor = conn.execute("""
        INSERT INTO transactions (customer_id, type, amount, items_text, raw_transcript, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        customer_id,
        txn_type,
        float(amount),
        data.get("items_text", ""),
        data.get("raw_transcript", ""),
        datetime.utcnow().isoformat(),
    ))
    conn.commit()
    new_id = cursor.lastrowid

    # Return the saved transaction
    row = conn.execute("SELECT * FROM transactions WHERE id = ?", (new_id,)).fetchone()
    conn.close()

    return jsonify(row_to_dict(row)), 201


# -------------------------------------------------------------------------
# Dashboard
# -------------------------------------------------------------------------

@app.route("/api/dashboard")
def dashboard():
    """
    Returns summary stats for the mini dashboard:
    - total_udhaar: total outstanding credit across ALL customers
    - todays_collection: sum of payments received today
    - top_customers: top 5 customers by pending balance (highest dues first)
    """
    conn = models.get_db()

    # Total outstanding udhaar (all udhaar - all payments)
    totals_row = conn.execute("""
        SELECT
            COALESCE(SUM(CASE WHEN type='udhaar'   THEN amount ELSE 0 END), 0) AS total_udhaar,
            COALESCE(SUM(CASE WHEN type='payment'  THEN amount ELSE 0 END), 0) AS total_paid
        FROM transactions
    """).fetchone()
    total_outstanding = round(
        totals_row["total_udhaar"] - totals_row["total_paid"], 2
    )

    # Today's collection (payments received today only)
    today_str = date.today().isoformat()  # "2024-01-15"
    today_row = conn.execute("""
        SELECT COALESCE(SUM(amount), 0) AS todays_collection
        FROM transactions
        WHERE type = 'payment'
          AND date(created_at) = ?
    """, (today_str,)).fetchone()

    # Top 5 customers by pending balance
    top_customers = conn.execute("""
        SELECT
            c.id,
            c.name,
            COALESCE(SUM(CASE WHEN t.type='udhaar'  THEN t.amount ELSE 0 END), 0)
              - COALESCE(SUM(CASE WHEN t.type='payment' THEN t.amount ELSE 0 END), 0)
              AS balance
        FROM customers c
        LEFT JOIN transactions t ON t.customer_id = c.id
        GROUP BY c.id
        HAVING balance > 0
        ORDER BY balance DESC
        LIMIT 5
    """).fetchall()

    conn.close()

    return jsonify({
        "total_outstanding": total_outstanding,
        "todays_collection": round(today_row["todays_collection"], 2),
        "top_customers": [row_to_dict(r) for r in top_customers],
    })


# -------------------------------------------------------------------------
# Frontend Static & SPA Routing (Production Deployment)
# -------------------------------------------------------------------------

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    """
    In production, serves the built React SPA from frontend/dist.
    Handles client-side routing (/customers, /dashboard) by falling back to index.html.
    """
    if path and path.startswith("api/"):
        return jsonify({"error": "Endpoint not found"}), 404

    file_path = os.path.join(FRONTEND_DIST, path)
    if path and os.path.isfile(file_path):
        return send_from_directory(FRONTEND_DIST, path)

    index_file = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(index_file):
        return send_from_directory(FRONTEND_DIST, "index.html")

    return jsonify({
        "status": "Voice Khata Lite API is running.",
        "note": "Frontend dist not found. Run 'npm run build' inside frontend/ to serve the UI."
    })


# -------------------------------------------------------------------------
# Run
# -------------------------------------------------------------------------

if __name__ == "__main__":
    port = int(os.getenv("PORT", os.getenv("FLASK_PORT", 5000)))
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    print(f"Starting Voice Khata Lite on http://0.0.0.0:{port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
