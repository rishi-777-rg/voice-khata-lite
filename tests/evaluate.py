"""
evaluate.py - Accuracy evaluation script for the parser

Reads tests/commands.csv which has 50 test commands with expected outputs.
Runs each through the parser and prints accuracy metrics.

Usage:
  cd tests
  python evaluate.py

Output:
  Intent accuracy:   XX%
  Amount accuracy:   XX%
  Customer accuracy: XX%
  Overall accuracy:  XX%
"""

import csv
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
import parser as p

def run_evaluation():
    csv_path = os.path.join(os.path.dirname(__file__), "commands.csv")

    if not os.path.exists(csv_path):
        print("ERROR: commands.csv not found. Run from the tests/ directory.")
        sys.exit(1)

    results = []

    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    if not rows:
        print("commands.csv is empty (only header row). Add test cases first.")
        sys.exit(0)

    print(f"Running evaluation on {len(rows)} test cases...\n")

    # Track accuracy per category
    intent_correct   = 0
    amount_correct   = 0
    customer_correct = 0
    total = len(rows)

    for row in rows:
        raw_text         = row["raw_text"].strip()
        expected_intent  = row["expected_intent"].strip().upper()
        expected_customer = row["expected_customer"].strip().lower()
        expected_amount_str = row["expected_amount"].strip()

        # Parse
        result = p.parse(raw_text, [])  # no existing customers for evaluation

        # Intent check
        got_intent = result["intent"]
        intent_ok = (got_intent == expected_intent)
        if intent_ok:
            intent_correct += 1

        # Amount check (within 1 rupee tolerance for floating point)
        amount_ok = False
        if expected_amount_str == "" or expected_amount_str == "NA":
            amount_ok = True  # no amount expected (e.g., query)
            amount_correct += 1
        else:
            expected_amount = float(expected_amount_str)
            got_amount = result["amount"]
            if got_amount is not None and abs(got_amount - expected_amount) <= 1.0:
                amount_ok = True
                amount_correct += 1

        # Customer name check (case-insensitive, partial match ok)
        customer_ok = False
        if expected_customer == "" or expected_customer == "na":
            customer_ok = True
            customer_correct += 1
        else:
            got_name = (result["customer_name"] or "").lower()
            # Check if expected name appears in the extracted name or vice versa
            if expected_customer in got_name or got_name in expected_customer:
                customer_ok = True
                customer_correct += 1

        # Collect result
        results.append({
            "text": raw_text,
            "intent_ok": intent_ok,
            "amount_ok": amount_ok,
            "customer_ok": customer_ok,
            "expected_intent": expected_intent,
            "got_intent": got_intent,
        })

        # Print FAIL lines for debugging
        if not intent_ok or not amount_ok or not customer_ok:
            failures = []
            if not intent_ok:    failures.append(f"intent={got_intent}(exp:{expected_intent})")
            if not amount_ok:    failures.append(f"amount={result['amount']}(exp:{expected_amount_str})")
            if not customer_ok:  failures.append(f"customer={result['customer_name']}(exp:{expected_customer})")
            print(f"FAIL | {raw_text[:50]:50} | {', '.join(failures)}")

    # Summary
    intent_pct   = round(100 * intent_correct / total, 1)
    amount_pct   = round(100 * amount_correct / total, 1)
    customer_pct = round(100 * customer_correct / total, 1)
    all_correct  = sum(1 for r in results if r["intent_ok"] and r["amount_ok"] and r["customer_ok"])
    overall_pct  = round(100 * all_correct / total, 1)

    print("\n" + "=" * 60)
    print(f"  Test cases:         {total}")
    print(f"  Intent accuracy:    {intent_correct}/{total} = {intent_pct}%")
    print(f"  Amount accuracy:    {amount_correct}/{total} = {amount_pct}%")
    print(f"  Customer accuracy:  {customer_correct}/{total} = {customer_pct}%")
    print(f"  Overall accuracy:   {all_correct}/{total} = {overall_pct}%")
    print("=" * 60)


if __name__ == "__main__":
    run_evaluation()

