from pydantic import BaseModel, Field, computed_field
from typing import Any, Literal, Optional

class LoanSimulationInput(BaseModel):
    # Demographics
    person_age: int = Field(..., ge=18, le=100)
    person_gender: Literal["Male", "Female"]
    person_education: Literal["High School", "Associate", "Bachelor", "Master", "Doctorate"]
    person_income: float = Field(..., gt=0)
    person_emp_exp: int = Field(..., ge=0, le=60)

    # Loan / credit details
    person_home_ownership: Literal["Mortgage", "Rent", "Own", "Other"]
    loan_amnt: float = Field(..., gt=0)
    loan_intent: Literal[
        "personal",
        "education",
        "medical",
        "venture",
        "homeimprovement",
        "debtconsolidation",
    ]
    loan_int_rate: float = Field(..., ge=0.0)
    cb_person_cred_hist_length: int = Field(..., ge=0, le=50)
    credit_score: int = Field(..., ge=300, le=850)
    previous_loan_defaults_on_file: Literal["Yes", "No"]

    @computed_field
    @property
    def loan_percent_income(self) -> float:
        return self.loan_amnt / self.person_income

    class Config:
        json_schema_extra = {
            "example": {
                "person_age": 30,
                "person_gender": "Male",
                "person_education": "Bachelor",
                "person_income": 58000,
                "person_emp_exp": 5,
                "person_home_ownership": "Rent",
                "loan_amnt": 12000,
                "loan_intent": "personal",
                "loan_int_rate": 11.8,
                "cb_person_cred_hist_length": 6,
                "credit_score": 665,
                "previous_loan_defaults_on_file": "No",
            }
        }




class PredictionResponse(BaseModel):
    raw_model_approval_probability: float
    raw_model_prediction: float
    approval_probability: float
    statistical_pd: float
    risk_tier: str
    policy_flags: list[str]
    policy_details: dict[str, Any] = {}
    shap_values: dict[str, float]


class DocumentExtractionResponse(BaseModel):
    applicant_name: Optional[str] = None
    person_age: Optional[int] = None
    person_income: Optional[int] = None
    person_emp_exp: Optional[int] = None
    person_education: Optional[str] = None  
    person_gender: Optional[str] = None
    person_home_ownership: Optional[str] = None
    loan_amnt: Optional[int] = None
    loan_int_rate: Optional[float] = None
    loan_intent: Optional[str] = None
    credit_score: Optional[int] = None
    cb_person_cred_hist_length: Optional[int] = None
    previous_loan_defaults_on_file: Optional[str] = None