from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .schemas import LoanSimulationInput, PredictionResponse
from .model_service import model_service

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

@app.post("/api/simulate", response_model=PredictionResponse)
def evaluate_loan_simulation(payload: LoanSimulationInput):
    """High-speed structural routing optimized natively for interactive client slider updates."""
    # For V1, the performance layout shares the predictive engine footprint seamlessly
    return model_service.predict_and_explain(payload)