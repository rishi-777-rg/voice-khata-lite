# Voice Khata Lite 🎙️📓

> **A Voice-First Digital Credit Ledger (Khata) for Indian Kirana Stores**  
> *Major Project — B.Tech Computer Science & Engineering*

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0.3-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-66%20Passed%20(100%25)-success)](#testing--evaluation)
[![Accuracy](https://img.shields.io/badge/Parser_Accuracy-100%25-brightgreen)](#testing--evaluation)

---

## 📌 Problem Statement

Over 12 million small neighborhood grocery stores (*Kirana stores*) in India manage customer credit using traditional paper notebooks (*Bahi Khata*). This manual workflow suffers from:
1. **Slow entry during peak store rush**: Shopkeeper hands are often busy packaging groceries.
2. **Calculation errors**: Manual sum of previous balances frequently leads to disputes.
3. **Delayed collection**: Reminding customers politely via phone calls or messages is awkward and time-consuming.

**Voice Khata Lite** solves this with a zero-cost, voice-first digital ledger that allows shopkeepers to speak naturally in **Hinglish/Hindi** (*"Ramesh ko 200 ka udhaar, 2 kilo cheeni"*, *"Sunita ne 500 diye"*, *"Ramesh ka kitna baaki hai?"*). The system parses the speech in real-time, displays a confirmation card, updates the ledger, answers queries via speech output, and provides one-tap WhatsApp payment reminders.

---

## ✨ Features (The 6 Core Features)

1. **🎙️ Mic Button Entry & Live Transcript**:
   - Large touch-friendly mic button designed for mobile browsers.
   - 3 distinct states: `idle` (green), `listening` (animated pulsing red ring), `processing` (amber).
   - Real-time streaming interim transcript while speaking.
   - Typed input box fallback for silent environments.

2. **📋 Human-in-the-Loop Confirmation Card**:
   - After parsing, shows customer name, transaction type (*Udhaar / Payment*), amount (₹), and items.
   - In-place editable inputs.
   - Action buttons: **Save / Edit / Cancel**.
   - **Voice Confirmation**: Shopkeeper can say *"Haan"* or *"Save"* to confirm, or *"Nahi"* or *"Cancel"* to discard.

3. **👥 Customers Ledger Page**:
   - Complete list of customers color-coded by balance (Red = dues pending, Green = settled).
   - Tapping any customer opens their complete, chronological transaction history.

4. **🔊 Voice Query with Voice Answer**:
   - Voice query: *"Mohan ka kitna baaki hai?"*
   - App speaks back in Hindi: *"Mohan ka 1250 rupaye baaki hai."* using browser `SpeechSynthesis` (`hi-IN`) and renders an on-screen answer card.

5. **💬 One-Tap WhatsApp Reminder ("Yaad Dilao")**:
   - Prominent button for customers with outstanding dues.
   - Opens WhatsApp (`wa.me` link) with a pre-filled, polite Hinglish message containing the amount and the shop's UPI ID in plain text for easy copy-paste.

6. **📊 Mini Dashboard**:
   - Total Udhaar Outstanding (₹) across the entire store.
   - Today's Collection (₹) received today.
   - Interactive **Recharts** bar chart showing the Top 5 customers by pending amount.

---

## 🏗️ Architecture & Technology Stack

```
voice-khata-lite/
├── backend/
│   ├── app.py              # Flask REST API endpoints & CORS configuration
│   ├── models.py           # SQLite database connection, schema & balance queries
│   ├── parser.py           # Core rule-based Hinglish NLP parser & fuzzy matcher
│   ├── seed.py             # Database seeder (10 customers, 43 transactions)
│   ├── requirements.txt    # Python dependencies (Flask, rapidfuzz, pytest, etc.)
│   └── khata.db            # Local SQLite database file
├── frontend/
│   ├── src/
│   │   ├── components/     # Navbar, ConfirmationCard
│   │   ├── pages/          # HomePage, CustomersPage, CustomerDetailPage, DashboardPage
│   │   ├── hooks/          # useSpeechRecognition (Web Speech API STT)
│   │   ├── utils/          # api.js (Fetch client), speech.js (SpeechSynthesis TTS)
│   │   ├── App.jsx         # React Router navigation
│   │   └── main.jsx        # React root
│   ├── vite.config.js      # Vite + Tailwind v4 + Backend API proxy
│   └── package.json        # Node dependencies
├── tests/
│   ├── test_parser.py      # 66 comprehensive pytest unit tests
│   ├── commands.csv        # 50 varied Hinglish/Devanagari test commands
│   └── evaluate.py         # Automated parser accuracy benchmark script
├── .env.example            # Environment variables template
├── README.md               # Complete project documentation
└── VIVA_NOTES.md           # Architecture, design decisions & 10 Viva Q&As
```

### Tech Stack Details:
- **Frontend**: React 19, Vite 8, Tailwind CSS v4, Recharts, React Router v7.
- **Backend**: Python 3.11+, Flask 3.0, Flask-CORS, rapidfuzz.
- **Database**: SQLite3 (relational, zero-configuration, ACID compliant).
- **Speech-to-Text (STT)**: Browser `webkitSpeechRecognition` (`hi-IN`).
- **Text-to-Speech (TTS)**: Browser `SpeechSynthesis` (`hi-IN`).
- **Testing**: `pytest` for unit testing, `evaluate.py` for accuracy evaluation.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & npm
- **Google Chrome** (recommended for Web Speech API support)

---

### 1. Backend Setup

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create virtual environment
python -m venv venv

# 3. Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Windows (CMD):
.\venv\Scripts\activate.bat
# Linux / macOS:
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Populate demo seed data (10 customers, 43 transactions)
python seed.py

# 6. Start Flask server
python app.py
```
> Flask API will start running at **`http://localhost:5000`**.

---

### 2. Frontend Setup

Open a **new terminal**:

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start Vite development server
npm run dev
```
> Frontend will open at **`http://localhost:5173`**.

---

### 3. Environment Configuration

Copy `.env.example` to `.env` in the root directory:
```bash
SHOP_NAME=Sharma General Store
SHOP_UPI_ID=sharma@upi
FLASK_PORT=5000
FLASK_DEBUG=true
```

---

## 🧪 Testing & Evaluation

### Run Unit Tests (`pytest`)
To run all 66 parser unit tests:
```bash
cd backend
.\venv\Scripts\pytest ..\tests\test_parser.py -v
```
**Result**: `66 passed in 0.11s` (100% pass rate).

### Run Benchmark Accuracy Evaluation (`evaluate.py`)
To test the parser against 50 real-world Hinglish & Devanagari commands in `tests/commands.csv`:
```bash
python tests/evaluate.py
```

#### Evaluation Benchmark Results:
```
============================================================
  Test cases:         50
  Intent accuracy:    50/50 = 100.0%
  Amount accuracy:    50/50 = 100.0%
  Customer accuracy:  50/50 = 100.0%
  Overall accuracy:   50/50 = 100.0%
============================================================
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/parse` | Parse raw speech/typed text into structured intent |
| `GET` | `/api/customers` | List all customers with current balance |
| `POST` | `/api/customers` | Create a new customer |
| `GET` | `/api/customers/<id>/transactions` | Full transaction ledger for a customer |
| `GET` | `/api/customers/<id>/balance` | Current balance for a customer |
| `POST` | `/api/transactions` | Save a confirmed transaction |
| `GET` | `/api/dashboard` | Outstanding dues, today's collection, top 5 customers |
| `GET` | `/api/config` | Shop name and UPI ID |

---

## 📸 Screenshots & Workflow

1. **Voice Input Screen**: Shopkeeper presses the large mic button and speaks.
2. **Confirmation Card**: Visual card appears with parsed details. Saying *"Haan"* or clicking **Save** commits the transaction.
3. **Graahak List**: View all customers sorted by balance.
4. **WhatsApp Reminder**: Clicking **Yaad Dilao** launches WhatsApp with pre-filled message:
   ```text
   Namaste Ramesh Kumar ji! Aapka Sharma General Store par ₹1130 ka udhaar baaki hai. 
   Kripya jald se jald jama karein.

   Aap hamare UPI ID par payment kar sakte hain:
   UPI ID: sharma@upi

   Shukriya! 🙏
   ```
5. **Dashboard**: Live bar chart showing the highest pending debtor balances.

---

## 🎓 Viva Preparation

For a complete breakdown of how each module works, architecture rationale, and **10 likely viva questions with answers**, see [VIVA_NOTES.md](./VIVA_NOTES.md).
