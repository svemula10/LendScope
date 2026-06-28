from pydantic import BaseModel, Field

class LoanSimulationInput(BaseModel):
    person_age: int = Field(..., ge=18, le=100, description="Age of Applicant")
    person_gender: str = Field(..., description="Gender (e.g., 'male', 'female')")
    person_education: str = Field(..., description="Education level (e.g., 'Bachelor', 'High School')")
    person_income: float = Field(..., ge=0, description="Annual Income")
    person_emp_exp: int = Field(..., ge=0, le=60, description="Years of employment experience")
    person_home_ownership: str = Field(..., description="Home status (RENT, OWN, MORTGAGE)")
    loan_amnt: float = Field(..., ge=0, description="Requested loan amount")
    loan_intent: str = Field(..., description="Purpose of the loan")
    loan_int_rate: float = Field(..., ge=0, le=100, description="Interest rate percentage")
    loan_percent_income: float = Field(..., ge=0.0, le=1.0, description="Loan amount as % of income")
    cb_person_cred_hist_length: float = Field(..., ge=0, description="Credit history length in years")
    credit_score: int = Field(..., ge=300, le=850, description="Credit score value")
    previous_loan_defaults_on_file: str = Field(..., description="Previous defaults ('Y' or 'N')")


class PredictionResponse(BaseModel):
    approval_probability: float
    risk_tier: str
    shap_values: dict[str, float]
    