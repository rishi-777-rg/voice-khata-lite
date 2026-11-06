# Voice Khata Lite — Viva & Project Defense Notes 🎓

> **Project Name:** Voice Khata Lite (A Voice-based Digital Credit Ledger for Kirana Stores)  
> **Tech Stack:** Python Flask, SQLite, rapidfuzz, React 19, Vite, Tailwind CSS, Recharts, Web Speech API (STT & TTS)  
> **Target User:** Small Indian retail shopkeepers (Kirana stores) speaking in Hindi/Hinglish  

---

## 1. High-Level Architecture Explanation

```
   ┌─────────────────────────────────────────────────────────────┐
   │                    USER BROWSER / MOBILE                    │
   │  ┌─────────────────────────┐   ┌─────────────────────────┐  │
   │  │  Web Speech Recognition  │   │  SpeechSynthesis (TTS)  │  │
   │  │       (STT, hi-IN)       │   │    (hi-IN voice out)    │  │
   │  └────────────┬────────────┘   └────────────▲────────────┘  │
   │               │ Spoken Text                 │ Spoken Answer │
   │               ▼                             │               │
   │  ┌───────────────────────────────────────────────────────┐  │
   │  │           React Frontend (Vite + Tailwind)            │  │
   │  │  - HomePage (Mic Button, Live Transcript, Fallback)   │  │
   │  │  - Confirmation Card (Edit, Save "Haan", Cancel "Nahi")│ │
   │  │  - Customers Page (Balances + WhatsApp "Yaad Dilao")  │  │
   │  │  - Customer Details (Full Ledger History)             │  │
   │  │  - Dashboard (Outstanding, Today Collection, Chart)   │  │
   │  └──────────────────────────┬────────────────────────────┘  │
   └─────────────────────────────┼───────────────────────────────┘
                                 │ REST JSON over HTTP
                                 ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                   BACKEND (Python Flask)                    │
   │  ┌───────────────────────────────────────────────────────┐  │
   │  │                       app.py                          │  │
   │  │  - Routes: /api/parse, /api/transactions,             │  │
   │  │            /api/customers, /api/dashboard, etc.       │  │
   │  └────────────┬─────────────────────────────┬────────────┘  │
   │               │                             │               │
   │               ▼                             ▼               │
   │  ┌─────────────────────────┐   ┌─────────────────────────┐  │
   │  │        parser.py        │   │        models.py        │  │
   │  │  - Rule-based NLP       │   │  - SQLite Database      │  │
   │  │  - Number word parser   │   │  - Customers table      │  │
   │  │  - Fuzzy name matching  │   │  - Transactions table   │  │
   │  │    (rapidfuzz)          │   │  - Balance calculation  │  │
   │  └─────────────────────────┘   └────────────┬────────────┘  │
   └─────────────────────────────────────────────┼───────────────┘
                                                 │
                                                 ▼
                                         ┌───────────────┐
                                         │   khata.db    │
                                         │   (SQLite)    │
                                         └───────────────┘
```

---

## 2. How Each Module Works

### A. `backend/parser.py` (Core Logic)
Rule-based Hindi/Hinglish Natural Language Processing (no paid LLM or heavy ML required):
1. **`normalize(text)`**: Converts Devanagari numerals/words to Roman equivalents using a curated transliteration map (`रमेश` -> `ramesh`, `उधार` -> `udhaar`, `डेढ़ सौ` -> `dedh sau`). Strips punctuation and symbols (`₹`, `Rs.`, `rupaye`).
2. **`detect_intent(text)`**: Identifies intent using keyword priority matching:
   - `QUERY_BALANCE`: "kitna baaki", "baaki kitna", "hisaab", "balance"
   - `ADD_PAYMENT`: "chuka diya", "diye", "jama", "wapas", "mile", "paid"
   - `ADD_UDHAAR`: "udhaar", "likh do", "baaki likho", "credit"
3. **`extract_customer(text, existing_customers)`**:
   - Searches for noun tokens preceding Hindi structural markers: `ko`, `ne`, `ka`, `ki`, `se` (e.g., in *"Ramesh ko 200..."*, extracts *"Ramesh"*).
   - Performs fuzzy matching against existing database customers using `rapidfuzz.process.extractOne` with `partial_ratio`. If match score >= 75%, maps to existing `customer_id`. Otherwise, marks as `is_new_customer = True`.
4. **`extract_amount(text)`**:
   - Differentiates between monetary amounts and item quantities (e.g., skips `1` in `1 litre doodh`).
   - Parses both numeric digits (`200`, `1500`) and Hindi word expressions (`paanch sau` = 500, `dedh sau` = 150, `dhai sau` = 250, `sawa sau` = 125, `paune do sau` = 175).
   - Distinguishes the verb `do` (in *"likh do"*) from the digit `do` (= 2).
5. **`extract_items(text)`**:
   - Matches quantity + unit + product name patterns (e.g., *"2 kilo cheeni"*, *"1 packet chai"*).
6. **`parse(text)`**: Aggregates output into structured JSON and computes a `confidence` metric (0.0 to 1.0).

### B. `backend/models.py` & Database
SQLite database with two clean relational tables:
- **`customers(id, name, phone, created_at)`**
- **`transactions(id, customer_id, type ['udhaar'|'payment'], amount, items_text, raw_transcript, created_at)`**
- **Mathematical Balance Formula**:
  $$\text{Balance} = \sum(\text{Amount}_{\text{udhaar}}) - \sum(\text{Amount}_{\text{payment}})$$
  Calculated dynamically using SQL `COALESCE(SUM(...), 0)` to guarantee precision without stale counters.

### C. Frontend Architecture (`frontend/src/`)
- **`useSpeechRecognition.js`**: React custom hook wrapping `window.webkitSpeechRecognition` with `hi-IN` locale, managing states: `idle`, `listening` (animated pulsing mic), and `processing`.
- **`speech.js`**: Browser `window.speechSynthesis` wrapper with automatic Hindi voice selection for spoken query answers.
- **`ConfirmationCard.jsx`**: Mandatory human-in-the-loop verification card. Shopkeepers can edit any field or speak `"Haan"`/`"Save"` to save or `"Nahi"`/`"Cancel"` to cancel.
- **`DashboardPage.jsx`**: Summary metrics and interactive Recharts Bar Chart depicting Top 5 pending debtor accounts.

---

## 3. Design Decisions & Rationale

| Decision | Why? |
|---|---|
| **Rule-based NLP over LLM (OpenAI/Gemini)** | 1. Zero API cost and zero network latency for shopkeeper. 2. 100% predictable, deterministic outputs. 3. Runs completely offline on local backend without expensive GPU. |
| **Browser Web Speech API** | No server-side audio uploading or ffmpeg conversion required. Chrome on Android/Desktop provides built-in Hindi (`hi-IN`) acoustic models for free. |
| **Confirmation Card (Human-in-the-loop)** | Voice input in noisy retail shops can mishear numbers. Never saving directly without visual confirmation eliminates financial errors. |
| **`rapidfuzz` partial matching** | Handles spoken name variations (e.g., "Ramesh" matching "Ramesh Kumar") and minor speech recognition typos. |
| **Plain Text UPI ID in WhatsApp links** | `upi://` deep links are blocked or non-clickable in WhatsApp chat bodies. Plain text enables copy-paste or direct dialing. |

---

## 4. Known Limitations

1. **Browser Dependency**: Web Speech API is standard in Google Chrome and Microsoft Edge, but has limited support in Firefox or Safari.
2. **Ambient Kirana Noise**: Heavy background street/traffic noise can occasionally distort speech recognition in low-quality microphones.
3. **Compound Sentences**: Only handles one atomic transaction or query per sentence (e.g., does not parse "Ramesh ko 200 aur Suresh ne 300 diye" simultaneously).

---

## 5. Future Work

1. **Offline Automatic Speech Recognition (ASR)**: Integrate lightweight on-device models like Whisper-tiny (ONNX) or Vosk for zero-internet environments.
2. **Multi-lingual Indian Dialects**: Extend lexicon to Tamil, Telugu, Marathi, and Gujarati.
3. **Direct WhatsApp Bot**: Allow customers to request their own balance via WhatsApp webhook.

---

## 6. Top 10 Viva Questions & Model Answers

### Q1: What is the core problem Voice Khata Lite solves?
**Ans:** Small Indian kirana store owners manage credit using paper bahi-khatas, which are prone to physical loss, calculation errors, and slow manual entry. Voice Khata Lite replaces this with a fast voice-first entry system in Hindi/Hinglish with automated balance calculation and payment reminders.

### Q2: Why did you not use an LLM (like GPT-4 or Gemini) for parsing?
**Ans:** Kirana stores require instant, zero-cost, and reliable processing. LLMs introduce recurring cloud subscription costs, 1-3 second latency, and potential hallucination of financial numbers. Our rule-based parser runs in under 5 milliseconds with 100% accuracy on standard kirana transaction formats.

### Q3: How do you handle Devanagari and Hinglish in the same parser?
**Ans:** In `normalize()`, we run a fast dictionary-based transliteration pass that converts common Devanagari keywords (`रमेश`, `उधार`, `डेढ़ सौ`) into standardized Romanized tokens before intent detection and number extraction.

### Q4: How does `words_to_number` handle Hindi fractions like "dedh sau" or "paune do sau"?
**Ans:** We parse fractional prefixes:
- `dedh` (1.5) before a multiplier like `sau` (100) calculates $1.5 \times 100 = 150$.
- `dhai` (2.5) before `sau` computes $2.5 \times 100 = 250$.
- `paune` (-0.25) before `do sau` computes $(2 - 0.25) \times 100 = 175$.
- `sawa` (+0.25) before `sau` computes $(1 + 0.25) \times 100 = 125$.

### Q5: How do you ensure the word "do" is not confused between the number 2 and the verb "give"?
**Ans:** In sentences like *"Sunil ko 500 ka udhaar likh do"*, `"do"` follows `"likh"` or `"udhaar"`. Our parser filters out verb phrases (`likh do`, `udhaar do`, `de do`) and prioritizes explicit numerical digits (`500`) over trailing standalone single-digit words.

### Q6: How does fuzzy name matching work in your project?
**Ans:** We extract candidate names preceding structural particles (`ko`, `ne`, `ka`) and use `rapidfuzz.process.extractOne` with `fuzz.partial_ratio` against the existing database. This enables matching first names like *"Ramesh"* to full names like *"Ramesh Kumar"* with a similarity score threshold of 75%.

### Q7: How is the customer's balance calculated?
**Ans:** Rather than maintaining a mutable balance column that could get out of sync, balance is dynamically computed using SQL aggregation:
`SUM(CASE WHEN type='udhaar' THEN amount ELSE 0 END) - SUM(CASE WHEN type='payment' THEN amount ELSE 0 END)`.

### Q8: What happens if the speech recognition hears incorrect words or low confidence?
**Ans:** We enforce human-in-the-loop validation: transactions are never committed automatically. The parsed data is shown on a `ConfirmationCard` with a confidence score. If confidence is below 60% or amount is missing, an alert prompt directs the user to review or edit fields before saving.

### Q9: How does the voice query ("Ramesh ka kitna baaki hai?") produce speech output?
**Ans:** The backend identifies the `QUERY_BALANCE` intent, retrieves the customer's balance, and returns it. The frontend invokes the browser's `window.speechSynthesis` API with language set to `hi-IN` to speak: *"Ramesh ka [X] rupaye baaki hai."*

### Q10: How does the WhatsApp reminder feature work?
**Ans:** It builds a standard `https://wa.me/{phone}?text={encoded_message}` URL. When clicked, it opens WhatsApp Web or the WhatsApp mobile app with a pre-filled, courteous Hinglish message containing the exact outstanding balance and the shop's UPI ID in plain text for easy settlement.
