"""
models.py - Database setup and helper functions

Uses Python's built-in sqlite3. Two tables:
  - customers: people who have a credit account at the store
  - transactions: each udhaar (credit given) or payment received

Balance = sum of all udhaar amounts - sum of all payment amounts for a customer.
"""

import sqlite3
import os
from datetime import datetime

# Database file path - sits next to this file
DB_PATH = os.path.join(os.path.dirname(__file__), "khata.db")


def get_db():
    """
    Returns a new SQLite connection with row_factory set to Row,
    so we can access columns by name (like a dict).
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row   # enables row["column_name"] syntax
    return conn


def init_db():
    """
    Creates the tables if they don't exist yet.
    Safe to call on every startup.
    """
    conn = get_db()
    cursor = conn.cursor()

    # customers table: basic info about each customer
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS customers (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            phone       TEXT    DEFAULT '',
            created_at  TEXT    NOT NULL
        )
    """)

    # transactions table: every credit or payment entry
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id    INTEGER NOT NULL,
            type           TEXT    NOT NULL CHECK(type IN ('udhaar', 'payment')),
            amount         REAL    NOT NULL,
            items_text     TEXT    DEFAULT '',
            raw_transcript TEXT    DEFAULT '',
            created_at     TEXT    NOT NULL,
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        )
    """)

    conn.commit()
    conn.close()


def get_all_customer_names():
    """
    Returns a list of (id, name) tuples for all customers.
    Used by the parser for fuzzy name matching.
    """
    conn = get_db()
    rows = conn.execute("SELECT id, name FROM customers ORDER BY name").fetchall()
    conn.close()
    return [(r["id"], r["name"]) for r in rows]


def get_customer_balance(customer_id):
    """
    Calculates outstanding balance for a customer.
    Balance = total udhaar - total payments
    A positive balance means the customer owes the shop money.
    """
    conn = get_db()
    row = conn.execute("""
        SELECT
            COALESCE(SUM(CASE WHEN type='udhaar'   THEN amount ELSE 0 END), 0) AS total_udhaar,
            COALESCE(SUM(CASE WHEN type='payment'  THEN amount ELSE 0 END), 0) AS total_paid
        FROM transactions
        WHERE customer_id = ?
    """, (customer_id,)).fetchone()
    conn.close()
    return round(row["total_udhaar"] - row["total_paid"], 2)
