"""
seed.py - Populates the database with demo data for development and testing.

Run this once to get 8-10 customers and ~40 transactions so the app
looks realistic when you open it.

Usage:
  cd backend
  python seed.py

WARNING: This will DELETE all existing data first, then re-create it.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from datetime import datetime, timedelta
import random
import models

# ---------------------------------------------------------------------------
# Seed data definitions
# ---------------------------------------------------------------------------

CUSTOMERS = [
    {"name": "Ramesh Kumar",  "phone": "9876543210"},
    {"name": "Sunita Devi",   "phone": "9812345678"},
    {"name": "Mohan Lal",     "phone": "9898989898"},
    {"name": "Priya Sharma",  "phone": "9911223344"},
    {"name": "Raju Bhai",     "phone": "9955667788"},
    {"name": "Geeta Rani",    "phone": "9900112233"},
    {"name": "Anil Gupta",    "phone": "9933445566"},
    {"name": "Kavita Ben",    "phone": "9944556677"},
    {"name": "Deepak Singh",  "phone": "9922334455"},
    {"name": "Meena Kumari",  "phone": "9977889900"},
]

# Transactions are relative to today (negative days = past)
# Format: (customer_index, type, amount, items_text, days_ago)
TRANSACTIONS = [
    # Ramesh - active customer with significant dues
    (0, "udhaar",  200.0, "2 kilo cheeni, 1 packet chai",       14),
    (0, "udhaar",  350.0, "ek packet atta, doodh",               10),
    (0, "payment", 100.0, "",                                     8),
    (0, "udhaar",  180.0, "2 sabun, 1 toothpaste",               6),
    (0, "payment", 200.0, "",                                     3),
    (0, "udhaar",  500.0, "5 kilo atta",                         1),

    # Sunita - almost settled
    (1, "udhaar",  300.0, "3 kilo chawal",                       20),
    (1, "udhaar",  150.0, "tel, namak",                          15),
    (1, "payment", 400.0, "",                                     7),
    (1, "udhaar",  100.0, "1 litre doodh",                       2),

    # Mohan - large outstanding
    (2, "udhaar",  800.0, "atta, chawal, tel",                   30),
    (2, "udhaar",  500.0, "ghee 1 kg, doodh",                   25),
    (2, "udhaar",  300.0, "sabun, shampoo, cream",               18),
    (2, "payment", 500.0, "",                                    10),
    (2, "udhaar",  400.0, "biscuit, namkeen",                    5),

    # Priya - recent customer
    (3, "udhaar",  250.0, "2 kilo chawal, 1 kilo dal",           12),
    (3, "udhaar",  175.0, "cheeni, chai patti",                   7),
    (3, "payment", 250.0, "",                                     4),
    (3, "udhaar",  300.0, "1 litre tel, sabun",                  2),

    # Raju - mostly settled
    (4, "udhaar",  500.0, "5 kilo atta",                         25),
    (4, "payment", 300.0, "",                                    20),
    (4, "udhaar",  200.0, "doodh, cheeni",                       15),
    (4, "payment", 350.0, "",                                    10),

    # Geeta - consistent customer
    (5, "udhaar",  400.0, "4 kilo atta, 2 kilo cheeni",          20),
    (5, "udhaar",  200.0, "tel 1 litre, namak",                  14),
    (5, "payment", 300.0, "",                                     9),
    (5, "udhaar",  250.0, "chawal, dal",                          4),
    (5, "udhaar",  150.0, "biscuit, chai",                        1),

    # Anil - new customer, small dues
    (6, "udhaar",  120.0, "1 kilo cheeni",                        5),
    (6, "udhaar",  80.0,  "sabun",                                3),

    # Kavita - good payment history
    (7, "udhaar",  600.0, "ration ka saman",                     35),
    (7, "payment", 600.0, "",                                    30),
    (7, "udhaar",  350.0, "3 kilo atta, tel",                    10),
    (7, "payment", 200.0, "",                                     5),
    (7, "udhaar",  200.0, "doodh, cheeni, chai",                  2),

    # Deepak - large dues
    (8, "udhaar",  1000.0, "month ka ration",                    40),
    (8, "payment",  500.0, "",                                    30),
    (8, "udhaar",   700.0, "ghee, tel, masale",                  20),
    (8, "udhaar",   300.0, "biscuit, juice, cold drink",         10),

    # Meena - small regular purchases
    (9, "udhaar",  100.0, "cheeni 1 kg",                          8),
    (9, "udhaar",  150.0, "sabun, surf",                          5),
    (9, "payment", 100.0, "",                                     2),
    (9, "udhaar",  120.0, "chai, biscuit",                        0),
]


def run_seed():
    """
    Drops all data and re-inserts seed data.
    Creates the tables first if needed.
    """
    print("Initializing database...")
    models.init_db()

    conn = models.get_db()

    # Clear existing data (order matters due to foreign key constraints)
    print("Clearing old data...")
    conn.execute("DELETE FROM transactions")
    conn.execute("DELETE FROM customers")
    conn.execute("DELETE FROM sqlite_sequence WHERE name IN ('customers', 'transactions')")
    conn.commit()

    # Insert customers
    print(f"Inserting {len(CUSTOMERS)} customers...")
    customer_ids = []
    base_time = datetime.utcnow()

    for i, c in enumerate(CUSTOMERS):
        created = base_time - timedelta(days=60 - i)
        cursor = conn.execute(
            "INSERT INTO customers (name, phone, created_at) VALUES (?, ?, ?)",
            (c["name"], c["phone"], created.isoformat())
        )
        customer_ids.append(cursor.lastrowid)

    conn.commit()

    # Insert transactions
    print(f"Inserting {len(TRANSACTIONS)} transactions...")
    for (cust_idx, txn_type, amount, items_text, days_ago) in TRANSACTIONS:
        created = base_time - timedelta(days=days_ago)
        # Add a small random time offset so entries aren't all at midnight
        created += timedelta(hours=random.randint(8, 20), minutes=random.randint(0, 59))
        conn.execute("""
            INSERT INTO transactions (customer_id, type, amount, items_text, raw_transcript, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            customer_ids[cust_idx],
            txn_type,
            amount,
            items_text,
            f"[seed] {txn_type} {amount}",
            created.isoformat(),
        ))

    conn.commit()
    conn.close()

    print("\n[OK] Seed complete!")
    print(f"   Customers: {len(CUSTOMERS)}")
    print(f"   Transactions: {len(TRANSACTIONS)}")
    print("\nYou can now start the server: python app.py")


if __name__ == "__main__":
    run_seed()

