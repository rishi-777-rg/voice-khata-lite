"""
test_parser.py - pytest tests for parser.py

Run with:
  cd tests
  pytest test_parser.py -v

Or from project root:
  .\backend\venv\Scripts\pytest tests\test_parser.py -v
"""

import sys
import os

# Add backend directory to path so we can import parser.py
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import parser as p

# ============================================================
# Tests for normalize()
# ============================================================

class TestNormalize:
    def test_lowercase(self):
        assert p.normalize("Ramesh KO Sau") == "ramesh ko sau"

    def test_removes_rupee_symbol(self):
        result = p.normalize("₹200 ka udhaar")
        assert "₹" not in result
        assert "200" in result

    def test_removes_rs(self):
        result = p.normalize("rs 500 diye")
        assert "rs" not in result

    def test_removes_rupaye(self):
        result = p.normalize("paanch sau rupaye diye")
        assert "rupaye" not in result

    def test_strips_punctuation(self):
        result = p.normalize("Ramesh, ko 200 ka udhaar!")
        assert "," not in result
        assert "!" not in result

    def test_collapses_spaces(self):
        result = p.normalize("ramesh   ko   200")
        assert "  " not in result

    def test_devanagari_udhaar(self):
        result = p.normalize("रमेश को उधार")
        # Should transliterate key words
        assert "ramesh" in result
        assert "udhaar" in result

    def test_devanagari_dedh_sau(self):
        result = p.normalize("डेढ़ सौ")
        assert "dedh" in result
        assert "sau" in result

    def test_empty_string(self):
        assert p.normalize("") == ""


# ============================================================
# Tests for words_to_number()
# ============================================================

class TestWordsToNumber:
    def test_plain_digit(self):
        assert p.words_to_number("200") == 200.0

    def test_plain_digit_with_comma(self):
        assert p.words_to_number("1,500") == 1500.0

    def test_ek(self):
        assert p.words_to_number("ek") == 1.0

    def test_paanch(self):
        assert p.words_to_number("paanch") == 5.0

    def test_sau_alone(self):
        assert p.words_to_number("sau") == 100.0

    def test_hazaar_alone(self):
        assert p.words_to_number("hazaar") == 1000.0

    def test_do_sau(self):
        assert p.words_to_number("do sau") == 200.0

    def test_paanch_sau(self):
        assert p.words_to_number("paanch sau") == 500.0

    def test_do_sau_pachaas(self):
        assert p.words_to_number("do sau pachaas") == 250.0

    def test_ek_hazaar(self):
        assert p.words_to_number("ek hazaar") == 1000.0

    def test_ek_hazaar_paanch_sau(self):
        assert p.words_to_number("ek hazaar paanch sau") == 1500.0

    def test_aadha(self):
        # aadha = 0.5 (half)
        assert p.words_to_number("aadha") == 0.5

    def test_dedh(self):
        # dedh = 1.5
        assert p.words_to_number("dedh") == 1.5

    def test_dhai(self):
        # dhai = 2.5
        assert p.words_to_number("dhai") == 2.5

    def test_dedh_sau(self):
        # dedh sau = 150
        assert p.words_to_number("dedh sau") == 150.0

    def test_dhai_sau(self):
        # dhai sau = 250
        assert p.words_to_number("dhai sau") == 250.0

    def test_sawa_sau(self):
        # sawa sau = 125
        assert p.words_to_number("sawa sau") == 125.0

    def test_paune_do_sau(self):
        # paune do sau = 175
        assert p.words_to_number("paune do sau") == 175.0

    def test_bees(self):
        assert p.words_to_number("bees") == 20.0

    def test_tees(self):
        assert p.words_to_number("tees") == 30.0

    def test_pachaas(self):
        assert p.words_to_number("pachaas") == 50.0

    def test_none_for_empty(self):
        assert p.words_to_number("") is None

    def test_none_for_non_number(self):
        # "udhaar" is not a number
        result = p.words_to_number("udhaar")
        assert result is None or result == 0


# ============================================================
# Tests for detect_intent()
# ============================================================

class TestDetectIntent:
    def test_udhaar_keyword(self):
        assert p.detect_intent("Ramesh ko 200 ka udhaar") == "ADD_UDHAAR"

    def test_likh_do(self):
        assert p.detect_intent("Ramesh ko 200 likh do") == "ADD_UDHAAR"

    def test_payment_diye(self):
        assert p.detect_intent("Sunita ne 500 diye") == "ADD_PAYMENT"

    def test_payment_jama(self):
        assert p.detect_intent("Mohan ne 300 jama kiye") == "ADD_PAYMENT"

    def test_payment_wapas(self):
        assert p.detect_intent("200 wapas mile") == "ADD_PAYMENT"

    def test_query_kitna_baaki(self):
        assert p.detect_intent("Ramesh ka kitna baaki hai") == "QUERY_BALANCE"

    def test_query_hisaab(self):
        assert p.detect_intent("Mohan ka hisaab batao") == "QUERY_BALANCE"

    def test_query_balance(self):
        assert p.detect_intent("Sunita ka balance kya hai") == "QUERY_BALANCE"

    def test_chuka_diye_is_payment(self):
        # "chuka diye" means "paid off" - even though udhaar is mentioned, intent is payment
        assert p.detect_intent("Ramesh ne udhaar chuka diye") == "ADD_PAYMENT"

    def test_unknown(self):
        assert p.detect_intent("aaj mausam achha hai") == "UNKNOWN"

    def test_devanagari_udhaar(self):
        # After normalization, should detect udhaar
        result = p.detect_intent("रमेश को उधार")
        assert result == "ADD_UDHAAR"


# ============================================================
# Tests for extract_customer()
# ============================================================

class TestExtractCustomer:
    # Sample existing customers for fuzzy matching tests
    CUSTOMERS = [
        (1, "Ramesh Kumar"),
        (2, "Sunita Devi"),
        (3, "Mohan Lal"),
        (4, "Priya Sharma"),
    ]

    def test_extract_with_ko(self):
        result = p.extract_customer("Ramesh ko 200 ka udhaar", self.CUSTOMERS)
        assert result["customer_name"] == "Ramesh Kumar"
        assert result["matched_customer_id"] == 1
        assert result["is_new_customer"] == False

    def test_extract_with_ne(self):
        result = p.extract_customer("Sunita ne 500 diye", self.CUSTOMERS)
        assert result["customer_name"] == "Sunita Devi"
        assert result["matched_customer_id"] == 2

    def test_extract_with_ka(self):
        result = p.extract_customer("Mohan ka kitna baaki hai", self.CUSTOMERS)
        assert result["customer_name"] == "Mohan Lal"
        assert result["matched_customer_id"] == 3

    def test_new_customer(self):
        result = p.extract_customer("Vijay ko 300 ka udhaar", self.CUSTOMERS)
        assert result["is_new_customer"] == True
        assert result["matched_customer_id"] is None

    def test_fuzzy_typo(self):
        # "Ramesh" should match "Ramesh Kumar" even with minor spelling variations
        result = p.extract_customer("Ramesh ko 100 dena", self.CUSTOMERS)
        assert result["matched_customer_id"] == 1

    def test_empty_customer_list(self):
        result = p.extract_customer("Ramesh ko 200 dena", [])
        assert result["is_new_customer"] == True


# ============================================================
# Tests for extract_amount()
# ============================================================

class TestExtractAmount:
    def test_plain_digit(self):
        assert p.extract_amount("Ramesh ko 200 ka udhaar") == 200.0

    def test_paanch_sau(self):
        assert p.extract_amount("Sunita ne paanch sau diye") == 500.0

    def test_dedh_sau(self):
        assert p.extract_amount("dedh sau ka udhaar") == 150.0

    def test_dhai_sau(self):
        assert p.extract_amount("dhai sau diye") == 250.0

    def test_do_sau_pachaas(self):
        assert p.extract_amount("do sau pachaas rupaye") == 250.0

    def test_no_amount(self):
        assert p.extract_amount("Ramesh ka kitna baaki hai") is None

    def test_with_rupee_symbol(self):
        assert p.extract_amount("₹1500 ka udhaar") == 1500.0

    def test_ek_hazaar(self):
        assert p.extract_amount("ek hazaar ka udhaar") == 1000.0


# ============================================================
# Tests for extract_items()
# ============================================================

class TestExtractItems:
    def test_kilo_item(self):
        result = p.extract_items("2 kilo cheeni likh do")
        assert "kilo" in result
        assert "cheeni" in result

    def test_no_items(self):
        result = p.extract_items("Ramesh ne 500 diye")
        assert result == ""


# ============================================================
# Integration tests for parse()
# ============================================================

class TestParse:
    CUSTOMERS = [
        (1, "Ramesh Kumar"),
        (2, "Sunita Devi"),
        (3, "Mohan Lal"),
    ]

    def test_udhaar_with_items(self):
        """Core test from the spec"""
        result = p.parse("Ramesh ko 200 ka udhaar 2 kilo cheeni", self.CUSTOMERS)
        assert result["intent"] == "ADD_UDHAAR"
        assert result["matched_customer_id"] == 1
        assert result["amount"] == 200.0
        assert "cheeni" in result["items_text"]
        assert result["confidence"] >= 0.7

    def test_payment(self):
        """Core test from the spec"""
        result = p.parse("Sunita ne paanch sau diye", self.CUSTOMERS)
        assert result["intent"] == "ADD_PAYMENT"
        assert result["matched_customer_id"] == 2
        assert result["amount"] == 500.0

    def test_query(self):
        """Core test from the spec"""
        result = p.parse("Mohan ka kitna baaki hai", self.CUSTOMERS)
        assert result["intent"] == "QUERY_BALANCE"
        assert result["matched_customer_id"] == 3

    def test_devanagari_udhaar(self):
        """Core test from the spec - Devanagari input"""
        result = p.parse("रमेश को डेढ़ सौ का उधार", self.CUSTOMERS)
        assert result["intent"] == "ADD_UDHAAR"
        assert result["amount"] == 150.0
        # Ramesh should be recognized via transliteration
        assert result["matched_customer_id"] == 1

    def test_raw_preserved(self):
        raw = "Ramesh ko 200 ka udhaar"
        result = p.parse(raw, self.CUSTOMERS)
        assert result["raw"] == raw

    def test_low_confidence_without_amount(self):
        result = p.parse("Ramesh ko udhaar", self.CUSTOMERS)
        # Amount missing for udhaar -> lower confidence
        assert result["confidence"] < 0.8

    def test_new_customer_flagged(self):
        result = p.parse("Vijay ko 300 ka udhaar", self.CUSTOMERS)
        assert result["is_new_customer"] == True
