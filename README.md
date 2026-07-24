# LendScope - AI Loan Readiness and Underwriting Assistant


LendScope is a full-stack fintech platform designed to bridge the gap between everyday loan applicants and enterprise-grade mortgage underwriters. It replaces cold, binary "Approved/Denied" decisions with transparent, explainable AI, document-grounded verification, and policy-backed compliance audits.


## 🌟 A Two Sided Platform

Borrower Mode (B2C) — Financial Coach & What-If Strategist
- Helps everyday individuals understand their loan readiness scores in plain English
- Features a real-time What-If Simulator with interactive sliders (Income, Amount, Credit Score, Interest Rate, Job Experience) that update approval odds instantly via a 350ms debounced window loop
- Includes a styled Monthly Repayment Calculator to project interest drag and amortization schedules dynamically across multiple term lengths (12m–60m)

Underwriter Mode (B2B) — Risk Audit & Policy Compliance Copilot
- Streamlines institutional risk operations for loan officers.
- Evaluates applications using tabular machine learning models (XGBoost/LightGBM via Joblib) to predict approval probability, default risk percentage, and risk tiers.
- Features a dynamic Debt-to-Income (DTI) Guardrail Progress Bar that scales fluidly (Green < 35%, Yellow 35-45%, Red > 45%) to catch policy out-of-bound violations instantly.
- Generates downloadable, timestamped Audit Brief PDFs on the client side using jsPDF.

## 🛠️ Tech Stack
- Frontend: React, Vite, TypeScript, HTML5, Semantic CSS3, jsPDF
- Backend: FastAPI (Python), Pydantic (strict request/response data validation schemas), Uvicorn (ASGI server)
  - AI, ML & RAG Data Layer: * Tabular Inference Engines (XGBoost/RandomForest via Joblib)
  - ChromaDB (local vector database storing embedded Fannie Mae underwriting guide segments)
  - Sentence-Transformers (all-MiniLM-L6-v2) for local text embeddings
  - PyMuPDF & Tesseract OCR for multi-format document text extraction
  - Groq SDK powering Llama-3.3-70b-versatile for the real-time persona-driven chat assistant
 

## 📂 System Architecture & Directory Map
```text
LendScope/
├── frontend/                     # React + TypeScript + Vite UI
│   ├── src/
│   │   ├── App.tsx               # Central state orchestrator & view router
│   │   ├── App.css               # Global theme and fluid edge-to-edge layout styling
│   │   ├── index.css             # Fluid edge-to-edge layout styling
│   │   └── components/
│   │       ├── Sidebar.tsx       # Dual-mode workspace selector toggle
│   │       ├── LoanForm.tsx      # Comprehensive data entry & dropzone asset
│   │       ├── MetricGrid.tsx    # Dynamic top-deck analysis scorecards
│   │       ├── WhatIfSimulator.tsx   # Real-time slider engine & amortization math
│   │       ├── CompliancePanel.tsx   # RAG-grounded policy citation matrix
│   │       ├── LendScopeChat.tsx     # Persona-aware AI conversational drawer widget
│   │       ├── LendScopeChat.css     # Scoped stylesheet for chat drawer widgets
│   │       ├── BorrowerSnapshot.tsx  # Snapshot of submitted application
│   │       ├── MonthlyRepaymentCalulator.tsx  # Amortization and interest drag projector
│   │       ├── DocumentUpload.tsx    # drag-and-drop parser dropzone component
│   │       └── PolicyGuidelines.tsx  # Institutional compliance rules viewer panel
├── backend/                      # High-performance FastAPI server
│   ├── app/
│   │   ├── main.py               # REST API endpoints (/api/predict, /audit, /chat)
│   │   ├── schemas.py            # Pydantic data models & validation structures
│   │   ├── document_service.py   # PyMuPDF & Tesseract OCR text scraping fallback engine
│   │   ├── compliance_service.py # Deterministic rule engine + ChromaDB vector lookup
│   │   ├── chat_service.py       # Groq Llama 3.3 integration with mode state isolation
│   │   ├─  model_service.py      # Tabular ML inference wrapper and model loader
│   │   ├─  seed_policy.py        # Vector embedding generator for Fannie Mae handbook
│   │   └── policies/             # Local markdown/text manifests (Fannie Mae chapters)
│   └── requirements.txt          # Python package dependency manifest
└── README.md                     # GitHub repository documentation

```

## ⚙️ Key Technical Evolution (Versions 1 – 4)
Version 1 (Core ML & Simulator): Established the React-to-FastAPI predictive bridge, data validation boundaries, and edge-case form guards (preventing impossible entry ranges like credit histories exceeding total applicant age).

Version 2 (Intelligent Document Extraction): Upgraded the intake pipeline from manual typing to automated verification. Added a dropzone supporting PDF and image uploads, using PyMuPDF and Tesseract OCR to parse unstructured paystubs and credit reports to auto-fill financial schemas.

Version 3 (RAG Policy Compliance Assistant): Shifted capability from understanding the applicant to understanding the rules. Ingested structural chapters from the Fannie Mae Selling Guide into a local ChromaDB vector database. Implemented a metadata-driven retrieval pipeline that maps borrower metrics against hard regulatory ceilings (such as DTI and credit score minimums) without LLM hallucinations.

Version 4 (Persona-Driven AI Copilot Chat): Integrated a floating assistant widget powered by Llama-3.3-70b-versatile via Groq. Automatically injects live form context (income, credit score, debt) into the system prompt, providing plain-English financial coaching in Borrower Mode and strict regulatory auditing in Underwriter Mode.

## 🚀 Getting Started Locally

### 1: Download Prerequisites
- Node.js & npm: Required for running the React frontend.
- Python (3.9+): Required for running the FastAPI backend server.
- Tesseract OCR: A system-level binary required by the backend document parsing service to process scanned PDFs and images. (Note: Install this globally on your OS, not inside your Python virtual environment).
  - macOS (via Homebrew): brew install tesseract
  - Ubuntu / Debian Linux: sudo apt update && sudo apt install tesseract-ocr -y
  - Windows: Download the installer from https://github.com/UB-Mannheim/tesseract/wiki and add its installation directory to your system environment variables (PATH).
    - <img width="400" height="400" alt="image" src="https://github.com/user-attachments/assets/94299f12-31bc-4723-9527-801f4f695ec8" />

### 2: Clone the Repository (if you haven't downloaded from github)
Open your terminal and clone the repository to your local machine:
```text
git clone https://github.com/<your-username>/LendScope.git
cd lendscope
```

### 3: Run Frontend and Backend on Two Different Terminals
Open two separate terminal windows to run the services concurrently

Terminal 1: Python FastAPI Backend
```text
cd backend

# Create and activate your virtual environment
# Windows PowerShell: .venv\Scripts\Activate.ps1
# Mac/Linux: source .venv/bin/activate
python -m venv .venv

# Install Python package dependencies
pip install -r requirements.txt

# Create a local .env file and add your Groq API key (for chatbot)
# Create an API key on https://console.groq.com/home
GROQ_API_KEY="your-groq-api-key-here"

# Seed the local ChromaDB vector compliance database
python app/seed_policy.py

# Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```

Terminal 2: React Vite Frontend
```text
cd frontend

# Install Node modules
npm install

# Start the Vite development server
npm run dev
```
Open your browser and navigate to http://localhost:5173 to interact with LendScope
