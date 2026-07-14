import re
from typing import Optional
from app.schemas import DocumentExtractionResponse

class DocumentService:
    @staticmethod
    async def extract_fields_from_text(text: str) -> DocumentExtractionResponse:
        """
        Parses unstructured raw text blocks using standard regular expression bindings 
        to locate financial parameters and structural variables.
        """
        # 1. Initialize empty placeholders
        name: Optional[str] = None
        age: Optional[int] = None
        income: Optional[int] = None
        emp_exp: Optional[int] = None
        home_ownership: Optional[str] = None
        loan_amount: Optional[int] = None
        int_rate: Optional[float] = None
        intent: Optional[str] = None
        score: Optional[int] = None
        cred_hist: Optional[int] = None
        defaults: Optional[str] = None

        # 2. Compile pattern match grids (Case-Insensitive Flags)
        name_patterns = [
            r"(?:name|applicant|employee)\s*:\s*([A-Za-z\s\.\-\,]+)",
            r"borrower\s+([A-Za-z\s]+)"
        ]
        income_patterns = [
            r"(?:annual|gross|base|total)\s*(?:income|salary|earnings)\s*(?:\:\s*|\=\s*)?\$?\s*([0-9\.\,]+)",
            r"pay\s+amount\s*:\s*\$?\s*([0-9\.\,]+)"
        ]
        score_patterns = [
            r"(?:credit\s+score|fico|bureau\s+rating)\s*:\s*([0-9]{3})",
            r"score\s*:\s*([0-9]{3})"
        ]
        loan_patterns = [
            r"(?:loan\s+amount|requested|principal)\s*:\s*\$?\s*([0-9\.\,]+)",
            r"amount\s+requested\s*:\s*\$?\s*([0-9\.\,]+)"
        ]
        rate_patterns = [
            r"(?:interest\s+rate|apr|coupon)\s*:\s*([0-9\.]+)\s*\%?",
            r"rate\s*:\s*([0-9\.]+)\s*\%?"
        ]
        exp_patterns = [
            r"(?:employment|experience|job\s+length|tenure)\s*:\s*([0-9]+)\s*(?:years|yr)?",
        ]
        hist_patterns = [
            r"(?:history\s+length|credit\s+history|file\s+age)\s*:\s*([0-9]+)\s*(?:years|yr)?",
        ]
        age_patterns = [
            r"(?:age|date\s+of\s+birth\s+age)\s*:\s*([0-9]{2})",
        ]

        # 3. Clean helper to turn numeric strings like "120,500.00" into raw whole integers
        def clean_int(val: str) -> Optional[int]:
            try:
                cleaned = re.sub(r'[^\d]', '', val.split('.')[0])
                return int(cleaned) if cleaned else None
            except ValueError:
                return None

        # 4. Process line data
        lines = text.splitlines()
        for line in lines:
            line_str = line.strip()
            
            # Match Name
            if not name:
                for p in name_patterns:
                    m = re.search(p, line_str, re.IGNORECASE)
                    if m:
                        name = m.group(1).strip()
                        break

            # Match Income
            if not income:
                for p in income_patterns:
                    m = re.search(p, line_str, re.IGNORECASE)
                    if m:
                        income = clean_int(m.group(1))
                        break

            # Match Credit Score
            if not score:
                for p in score_patterns:
                    m = re.search(p, line_str, re.IGNORECASE)
                    if m:
                        score = clean_int(m.group(1))
                        break

            # Match Loan Amount
            if not loan_amount:
                for p in loan_patterns:
                    m = re.search(p, line_str, re.IGNORECASE)
                    if m:
                        loan_amount = clean_int(m.group(1))
                        break

            # Match Interest Rate
            if not int_rate:
                for p in rate_patterns:
                    m = re.search(p, line_str, re.IGNORECASE)
                    if m:
                        try:
                            int_rate = float(m.group(1))
                        except ValueError:
                            pass
                        break

            # Match Experience
            if not emp_exp:
                for p in exp_patterns:
                    m = re.search(p, line_str, re.IGNORECASE)
                    if m:
                        emp_exp = clean_int(m.group(1))
                        break

            # Match Credit History Length
            if not cred_hist:
                for p in hist_patterns:
                    m = re.search(p, line_str, re.IGNORECASE)
                    if m:
                        cred_hist = clean_int(m.group(1))
                        break

            # Match Age
            if not age:
                for p in age_patterns:
                    m = re.search(p, line_str, re.IGNORECASE)
                    if m:
                        age = clean_int(m.group(1))
                        break

            # Keyword Classification Mapping for Home Ownership (Enforces RENT/OWN/MORTGAGE options)
            if not home_ownership:
                if re.search(r'\brent\b', line_str, re.IGNORECASE):
                    home_ownership = "RENT"
                elif re.search(r'\bmortgage\b', line_str, re.IGNORECASE):
                    home_ownership = "MORTGAGE"
                elif re.search(r'\bown\b', line_str, re.IGNORECASE):
                    home_ownership = "OWN"

            # Keyword Classification Mapping for Loan Intent (Enforces core strings)
            if not intent:
                for purpose in ["personal", "education", "medical", "venture", "homeimprovement", "debtconsolidation"]:
                    if re.search(rf'\b{purpose}\b', line_str, re.IGNORECASE):
                        intent = purpose
                        break

            # Keyword Classification Mapping for Historical Default Defaults (Enforces Y/N options)
            if not defaults:
                if re.search(r'(?:prior|previous|historical)\s+default\s*:\s*(?:yes|y)', line_str, re.IGNORECASE):
                    defaults = "Y"
                elif re.search(r'(?:prior|previous|historical)\s+default\s*:\s*(?:no|n)', line_str, re.IGNORECASE):
                    defaults = "N"

        return DocumentExtractionResponse(
            applicant_name=name,
            person_age=age,
            person_income=income,
            person_emp_exp=emp_exp,
            person_home_ownership=home_ownership,
            loan_amnt=loan_amount,
            loan_int_rate=int_rate,
            loan_intent=intent,
            credit_score=score,
            cb_person_cred_hist_length=cred_hist,
            previous_loan_defaults_on_file=defaults
        )