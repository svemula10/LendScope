#main.py
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .schemas import LoanSimulationInput, PredictionResponse, DocumentExtractionResponse
from .model_service import model_service
from app.document_service import DocumentService
from .compliance_service import compliance_audit_service
from pydantic import BaseModel
from .chat_service import chat_orchestrator
import os
import uvicorn

app = FastAPI(title="LendScope Borrower Engine", version="1.0.0")

# Setup safe browser allowances to match Vite development servers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "https://lendscope.vercel.app/"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    mode: str  # "borrower" or "underwriter"
    message: str
    context_data: dict = {}
    history: list = []

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "LendScope Core API"}

@app.post("/api/predict", response_model=PredictionResponse)
def evaluate_loan_baseline(payload: LoanSimulationInput):
    """Full baseline evaluation profiling and predictive asset scoring."""
    results = model_service.predict_and_explain(payload)
    return results

#this hasn't been used yet, don't think it's needed, but leaving it here for now in case we want to use it later
@app.post("/api/simulate", response_model=PredictionResponse)
def evaluate_loan_simulation(payload: LoanSimulationInput):
    """High-speed structural routing optimized natively for interactive client slider updates."""
    # V1 shares the predictive engine layout footprint. 
    # Having this separate routing enables easy performance optimization hooks in V2.
    results = model_service.predict_and_explain(payload)
    return 


@app.post("/api/documents/upload", response_model=DocumentExtractionResponse)
async def upload_document(file: UploadFile = File(...)):
    # Restrict extensions to safe limits
    allowed_extensions = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".txt"}
    if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
        raise HTTPException(status_code=400, detail="Unsupported file format.")

    try:
        file_bytes = await file.read()
        # Parse extracted text using PyMuPDF / Tesseract Pipeline
        raw_text = DocumentService.extract_text_from_bytes(file_bytes, file.filename)
        
        # Analyze and match patterns
        extracted_fields = await DocumentService.extract_fields_from_text(raw_text)
        return extracted_fields
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal extraction error: {str(e)}")
    


@app.post("/api/predict/compliance")
async def evaluate_application_compliance(payload: dict):
    """
    Ingests active input values from the loan form alongside a mode parameter ('borrower' | 'underwriter'),
    running a persona-aware deterministic rule gate with localized vector text grounding citations.
    """
    # Isolate user view mode parameter, defaulting safely to underwriter
    user_mode = payload.get("mode", "underwriter").lower()
    
    audit_results = compliance_audit_service.execute_underwriting_audit(payload, mode=user_mode)
    return audit_results


@app.post("/api/chat")
async def chat_endpoint(payload: ChatRequest):
    """Handles real-time context-aware persona chat using Groq Llama 3.3 70B."""
    try:
        response = chat_orchestrator.generate_response(
            mode=payload.mode,
            message=payload.message,
            context_data=payload.context_data,
            history=payload.history
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


port = int(os.environ.get("PORT", 10000))
uvicorn.run("app.main:app", host="0.0.0.0", port=port)
    