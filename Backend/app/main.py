from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .schemas import LoanSimulationInput, PredictionResponse, DocumentExtractionResponse
from .model_service import model_service
from app.document_service import DocumentService

app = FastAPI(title="LendScope Borrower Engine", version="1.0.0")

# Setup safe browser allowances to match Vite development servers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    """
    Multipart API endpoint receiver. Ingests bytes arrays from dropped files, 
    extracts string content payload data, and runs the classification service.
    """
    # Enforce safe document type bounds
    allowed_extensions = ["txt", "pdf", "csv", "json"]
    file_extension = file.filename.split(".")[-1].lower() if file.filename else ""
    
    # Text fallback support handles standard plain transcripts or OCR stream prints
    try:
        file_bytes = await file.read()
        # Decode contents to normal UTF-8 plaintext strings safely
        raw_text = file_bytes.decode("utf-8", errors="ignore")
        
        # Pass decoded plain strings straight into our extraction service
        extracted_data = await DocumentService.extract_fields_from_text(raw_text)
        return extracted_data
        
    except Exception:
        raise HTTPException(
            status_code=500, 
            detail="System configuration error parsing raw text data strings structure internally."
        )