"""
parser.py - Rule-based Hinglish/Hindi parser for Voice Khata Lite

This is the CORE of the project. It converts speech like:
  "Ramesh ko 200 ka udhaar, 2 kilo cheeni"  -> udhaar, Ramesh, 200, "2 kilo cheeni"
  "Sunita ne paanch sau diye"               -> payment, Sunita, 500
  "Ramesh ka kitna baaki hai?"              -> query, Ramesh

Design philosophy:
  - No ML/LLM. Pure rule-based with regex + keyword matching.
  - Each function does ONE job and is independently testable.
  - Handles both Roman Hinglish ("paanch sau") and Devanagari.

Returns a confidence score 0.0 - 1.0. Low confidence = ask user to correct.
"""

import re
from rapidfuzz import process, fuzz

# ---------------------------------------------------------------------------
# Devanagari -> Roman transliteration map (common words only)
# ---------------------------------------------------------------------------
DEVANAGARI_MAP = {
    "रमेश": "ramesh",
    "सुनीता": "sunita",
    "सुनिता": "sunita",
    "मोहन": "mohan",
    "उधार": "udhaar",
    "उधर": "udhaar",
    "रुपये": "rupaye",
    "रुपए": "rupaye",
    "दिए": "diye",
    "दिया": "diya",
    "बाकी": "baaki",
    "कितना": "kitna",
    "हिसाब": "hisaab",
    "सौ": "sau",
    "हजार": "hazaar",
    "एक": "ek",
    "दो": "do",
    "तीन": "teen",
    "चार": "char",
    "पांच": "paanch",
    "पाँच": "paanch",
    "छह": "chhe",
    "छः": "chhe",
    "सात": "saat",
    "आठ": "aath",
    "नौ": "nau",
    "दस": "das",
    "बीस": "bees",
    "तीस": "tees",
    "चालीस": "chaalees",
    "पचास": "pachaas",
    "साठ": "saath",
    "सत्तर": "sattar",
    "अस्सी": "assi",
    "नब्बे": "nabbe",
    "डेढ़": "dedh",
    "ढाई": "dhai",
    "पौने": "paune",
    "सवा": "sawa",
    "आधा": "aadha",
    "को": "ko",
    "ने": "ne",
    "का": "ka",
    "की": "ki",
    "के": "ke",
}

# ---------------------------------------------------------------------------
# Number word definitions
# ---------------------------------------------------------------------------

UNITS = {
    "ek": 1,
    "do": 2,
    "teen": 3,
    "char": 4,
    "chaar": 4,
    "paanch": 5,
    "panch": 5,
    "chhe": 6, "chhah": 6, "chha": 6,
    "saat": 7,
    "aath": 8,
    "nau": 9,
    "das": 10,
    "gyarah": 11, "gyarha": 11,
    "baarah": 12, "baara": 12,
    "terah": 13, "tera": 13,
    "chaudah": 14,
    "pandrah": 15,
    "solah": 16,
    "satrah": 17,
    "atharah": 18,
    "unnees": 19,
}

TENS = {
    "bees": 20,
    "tees": 30,
    "chaalees": 40, "chaalis": 40, "chalis": 40,
    "pachaas": 50, "pachas": 50,
    "saath": 60,
    "sattar": 70,
    "assi": 80,
    "nabbe": 90,
}

MULTIPLIERS = {
    "sau": 100,
    "hazaar": 1000,
    "hazar": 1000,
    "lakh": 100000,
}

# Set of ALL recognized number words (used in extract_amount regex)
ALL_NUMBER_WORDS = (
    set(UNITS.keys()) | set(TENS.keys()) | set(MULTIPLIERS.keys()) |
    {"aadha", "dedh", "dhai", "dhaai", "paune", "sawa"}
)


def normalize(text: str) -> str:
    """
    Cleans and standardizes input text before parsing.

    Steps:
      1. Transliterate common Devanagari words to Roman
      2. Lowercase everything
      3. Replace rupee symbols and variants with a space
      4. Strip punctuation (keep spaces)
      5. Collapse multiple spaces
    """
    if not text:
        return ""

    # Step 1: Replace Devanagari words (longest first to avoid partial matches)
    for devanagari, roman in sorted(DEVANAGARI_MAP.items(), key=lambda x: -len(x[0])):
        text = text.replace(devanagari, " " + roman + " ")

    # Step 2: Lowercase
    text = text.lower()

    # Step 3: Normalize rupee variants
    text = re.sub(r"₹|rs\.?|rupees?|rupaye", " ", text)

    # Step 4: Remove punctuation except spaces
    text = re.sub(r"[^\w\s]", " ", text)

    # Step 5: Collapse multiple spaces
    text = re.sub(r"\s+", " ", text).strip()

    return text


def words_to_number(text: str) -> float | None:
    """
    Converts a string of Hindi number words (or plain digits) to a float.

    Handles:
      - Plain digits: "200", "1,500"
      - Simple words: "paanch" -> 5, "sau" -> 100
      - Compound: "do sau pachaas" -> 250
      - Special fractions BEFORE a multiplier:
          "dedh sau" -> 150, "dhai sau" -> 250
          "sawa sau" -> 125, "paune do sau" -> 175
      - Mixed: "ek hazaar paanch sau" -> 1500

    Returns None if no valid number found.
    """
    if not text:
        return None

    text = text.strip()

    # --- Try plain digit first ---
    plain = text.replace(",", "")
    try:
        val = float(plain)
        return val
    except ValueError:
        pass

    words = text.split()
    total = 0.0    # running total (accumulates after each multiplier)
    current = 0.0  # current chunk before the next multiplier
    i = 0

    while i < len(words):
        w = words[i]

        # ---- Special standalone fractions ----
        if w == "aadha" and len(words) == 1:
            return 0.5
        if w == "dedh" and len(words) == 1:
            return 1.5
        if w in ("dhai", "dhaai") and len(words) == 1:
            return 2.5

        # ---- Fraction prefixes that modify the FOLLOWING multiplier ----
        if w == "dedh" and i + 1 < len(words) and words[i + 1] in MULTIPLIERS:
            mult = MULTIPLIERS[words[i + 1]]
            current += 1.5 * mult
            i += 2
            continue

        if w in ("dhai", "dhaai") and i + 1 < len(words) and words[i + 1] in MULTIPLIERS:
            mult = MULTIPLIERS[words[i + 1]]
            current += 2.5 * mult
            i += 2
            continue

        if w == "sawa":
            if i + 2 < len(words) and words[i + 1] in UNITS and words[i + 2] in MULTIPLIERS:
                base = UNITS[words[i + 1]]
                mult = MULTIPLIERS[words[i + 2]]
                current += (base + 0.25) * mult
                i += 3
                continue
            elif i + 1 < len(words) and words[i + 1] in MULTIPLIERS:
                mult = MULTIPLIERS[words[i + 1]]
                current += 1.25 * mult
                i += 2
                continue

        if w == "paune":
            if i + 2 < len(words) and words[i + 1] in UNITS and words[i + 2] in MULTIPLIERS:
                base = UNITS[words[i + 1]]
                mult = MULTIPLIERS[words[i + 2]]
                current += (base - 0.25) * mult
                i += 3
                continue
            elif i + 1 < len(words) and words[i + 1] in MULTIPLIERS:
                mult = MULTIPLIERS[words[i + 1]]
                current += 0.75 * mult
                i += 2
                continue

        # ---- Units (1-19) ----
        if w in UNITS:
            current += UNITS[w]
            i += 1
            continue

        # ---- Tens (20-90) ----
        if w in TENS:
            current += TENS[w]
            i += 1
            continue

        # ---- Multipliers (100, 1000, ...) ----
        if w in MULTIPLIERS:
            mult = MULTIPLIERS[w]
            if current == 0:
                current = 1  # bare "sau" = 100
            total += current * mult
            current = 0  # reset after applying multiplier
            i += 1
            continue

        # Unknown word - skip
        i += 1

    total += current
    return total if total > 0 else None


def detect_intent(text: str) -> str:
    """
    Determines what the shopkeeper wants to do.

    Returns one of:
      - "ADD_UDHAAR"    : recording credit given to customer
      - "ADD_PAYMENT"   : recording money received from customer
      - "QUERY_BALANCE" : asking for outstanding balance
      - "UNKNOWN"       : couldn't determine
    """
    normalized = normalize(text)

    # Payment keywords - check BEFORE udhaar to properly handle "udhaar chuka diya"
    payment_keywords = [
        "chuka diya", "chuka diye", "chuka dia", "chuka dya", "chukaya", "chuka",
        "diye", "de diye", "dia", "de dia", "diya", "de diya",
        "jama", "jama kiye", "jama karwaye",
        "wapas", "mile", "mil gaye",
        "paid", "payment", "ada kiya",
        "bheja", "bhej diya",
    ]

    udhaar_keywords = [
        "udhaar", "udhar",
        "likh do", "likh le", "likho",
        "baaki likho", "credit",
        "dena hai", "khata mein likho", "khata",
    ]

    query_keywords = [
        "kitna baaki", "baaki kitna", "baaki hai", "kitna hai",
        "hisaab", "balance", "kitna banta", "banta hai", "banta",
        "kya baaki", "total kitna",
    ]

    # Check query first (most unambiguous)
    for kw in query_keywords:
        if kw in normalized:
            return "QUERY_BALANCE"

    # Check payment before udhaar
    for kw in payment_keywords:
        if kw in normalized:
            return "ADD_PAYMENT"

    for kw in udhaar_keywords:
        if kw in normalized:
            return "ADD_UDHAAR"

    return "UNKNOWN"


def extract_customer(text: str, existing_customers: list) -> dict:
    """
    Finds the customer name from the text.

    Strategy:
      1. Look for name around structural Hindi words: "X ko", "X ne", "X ka"
      2. Fuzzy-match the extracted name against known customers.
         Uses partial_ratio which handles first-name matches against full names.
      3. If no structural word found, use the first word.

    Args:
      text: raw (unnormalized) text
      existing_customers: list of (id, name) tuples from the database

    Returns dict with customer_name, matched_customer_id, is_new_customer, match_score.
    """
    normalized = normalize(text)
    structural_words = ["ko", "ne", "ka", "ki", "ke", "se"]

    extracted_name = None

    for sw in structural_words:
        # Match word(s) immediately before structural word
        pattern = rf"\b([a-z]{{2,}}(?:\s+[a-z]{{2,}})?)\s+{sw}\b"
        match = re.search(pattern, normalized)
        if match:
            candidate = match.group(1).strip()
            # Skip common non-name words
            skip_words = {
                "do", "ek", "teen", "char", "chaar", "paanch", "sau", "hazaar",
                "aaj", "kal", "rupaye", "kilo", "liter", "packet", "kul", "total"
            }
            if candidate not in skip_words and len(candidate) >= 2:
                extracted_name = candidate.title()
                break

    # Fallback: first meaningful word
    if not extracted_name:
        words = [w for w in normalized.split() if len(w) >= 3]
        if words:
            extracted_name = words[0].title()

    if not extracted_name:
        return {"customer_name": None, "matched_customer_id": None,
                "is_new_customer": True, "match_score": 0}

    # Fuzzy match against existing customers
    if existing_customers:
        names = [name for _, name in existing_customers]

        # Use partial_ratio: "Ramesh" matches "Ramesh Kumar" with high score
        result = process.extractOne(
            extracted_name,
            names,
            scorer=fuzz.partial_ratio,
        )
        if result and result[1] >= 75:  # 75% threshold
            matched_name, score, idx = result
            matched_id = existing_customers[idx][0]
            return {
                "customer_name": matched_name,
                "matched_customer_id": matched_id,
                "is_new_customer": False,
                "match_score": score,
            }

    return {
        "customer_name": extracted_name,
        "matched_customer_id": None,
        "is_new_customer": True,
        "match_score": 0,
    }


def extract_amount(text: str) -> float | None:
    """
    Finds the monetary amount in the text.

    Strategy:
      1. Clean out verb uses of "do" like "likh do", "de do", "udhaar do"
         so they aren't parsed as the number 2.
      2. If digits exist that are NOT item quantities (e.g. "80 rupaye", "500 ka udhaar",
         not "1 litre" or "2 kilo"), use the digit as the monetary amount.
      3. Scan Hindi number word sequences (e.g. "paanch sau", "dedh sau", "dhai sau").
      4. Fallback to digits if no number words found.
    """
    normalized = normalize(text)

    # Clean out verb uses of "do" like "likh do", "de do", "udhaar do"
    clean = re.sub(r"\b(likh|de|udhaar|udhar)\s+do\b", r"\1", normalized)

    # List of unit words that signify a quantity rather than rupee amount
    qty_units = r"(?:kilo|kg|gram|g|litre|liter|ltr|packet|pkt|bottle|btl|piece|pcs|pc|dozen|box|bag|bori|thela)"

    # Look for digits that are NOT followed by item quantity units
    digit_matches = list(re.finditer(r"\b([\d,]+(?:\.\d+)?)\b", clean))
    standalone_digits = []
    for m in digit_matches:
        val_str = m.group(1).replace(",", "")
        try:
            val = float(val_str)
            # Check what follows this match
            after_text = clean[m.end():].strip()
            # If immediately followed by an item unit, it's a quantity (like 1 litre, 2 kilo)
            if re.match(r"^" + qty_units + r"\b", after_text):
                continue
            if val > 0:
                standalone_digits.append(val)
        except ValueError:
            pass

    # Scan Hindi number word sequences
    words = clean.split()
    best_word_value = None
    best_len = 0

    for start in range(len(words)):
        if words[start] not in ALL_NUMBER_WORDS:
            continue
        end = start
        while end < len(words) and words[end] in ALL_NUMBER_WORDS:
            end += 1
        seq = " ".join(words[start:end])
        val = words_to_number(seq)
        if val and val > 0:
            # Check if this sequence is followed by an item unit (like "ek packet")
            after_word = words[end] if end < len(words) else ""
            if re.match(r"^" + qty_units + r"$", after_word) and val < 10 and end - start == 1:
                continue
            if (end - start > best_len) or (end - start == best_len and val > (best_word_value or 0)):
                best_word_value = val
                best_len = end - start

    # If we found a multi-word sequence (e.g. "dedh sau" = 150), prefer it over a standalone digit from item
    if best_word_value and best_len > 1:
        return best_word_value

    # If we have a standalone rupee digit (e.g. 500, 80), use it
    if standalone_digits:
        return standalone_digits[0]

    # Otherwise return single-word value (e.g. "sau", "hazaar", "pachaas")
    if best_word_value:
        return best_word_value

    # Absolute fallback to any digit
    if digit_matches:
        try:
            return float(digit_matches[0].group(1).replace(",", ""))
        except ValueError:
            pass

    return None


def extract_items(text: str) -> str:
    """
    Extracts item descriptions from the text.
    Looks for patterns: (quantity) + (unit) + (item name).
    Returns a cleaned string. Empty string if nothing found.
    Items are stored as free text (not structured data per spec).
    """
    normalized = normalize(text)
    units = [
        "kilo", "kg", "gram", "g", "litre", "liter", "ltr",
        "packet", "pkt", "bottle", "btl", "piece", "pcs", "pc",
        "dozen", "box", "bag",
    ]

    items_found = []
    for unit in units:
        pattern = rf"(\w+)\s+{unit}\s+([\w]+)"
        match = re.search(pattern, normalized)
        if match:
            qty = match.group(1)
            item = match.group(2).strip()
            items_found.append(f"{qty} {unit} {item}")

    return ", ".join(items_found)


def parse(text: str, existing_customers: list = None) -> dict:
    """
    Main entry point. Orchestrates all parsing sub-functions.

    Args:
      text: raw speech or typed text (Hindi/Hinglish)
      existing_customers: list of (id, name) tuples for fuzzy matching

    Returns a structured dict with intent, customer info, amount, etc.
    Confidence < 0.6 means the UI should ask user to correct before saving.
    """
    if existing_customers is None:
        existing_customers = []

    raw = text
    intent = detect_intent(text)
    customer_info = extract_customer(text, existing_customers)
    amount = extract_amount(text)
    items_text = extract_items(text)

    # Compute confidence score
    confidence = 1.0

    if intent == "UNKNOWN":
        confidence -= 0.4

    if customer_info["customer_name"] is None:
        confidence -= 0.3
    elif customer_info["is_new_customer"]:
        confidence -= 0.1

    if intent in ("ADD_UDHAAR", "ADD_PAYMENT") and amount is None:
        confidence -= 0.3

    confidence = max(0.0, round(confidence, 2))

    return {
        "intent": intent,
        "customer_name": customer_info["customer_name"],
        "matched_customer_id": customer_info["matched_customer_id"],
        "is_new_customer": customer_info["is_new_customer"],
        "amount": amount,
        "items_text": items_text,
        "confidence": confidence,
        "raw": raw,
    }

